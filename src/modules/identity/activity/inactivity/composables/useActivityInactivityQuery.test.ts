// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, h, shallowRef } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";

const getActivityInactivity = vi.hoisted(() => vi.fn());
vi.mock("@/modules/identity/activity/api/activity", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/identity/activity/api/activity")>();
  return { ...actual, getActivityInactivity };
});

import { observePrivateQueryCache } from "@/app/privateQueryCache";
import { useAuthStore } from "@/modules/identity/auth/stores/auth";
import type { ActivityInactivityResponse } from "@/modules/identity/activity/inactivity/types/activityInactivity";
import {
  activityInactivityQueryKeyForSession,
  isActivityInactivityResponse,
  normalizeActivityInactivityParams,
  useActivityInactivityQuery,
} from "./useActivityInactivityQuery";

const response: ActivityInactivityResponse = {
  asOf: "2026-10-24",
  timezone: "Europe/Madrid",
  totalUsers: 0,
  groups: {
    "0_2_days": 0,
    "3_6_days": 0,
    "7_13_days": 0,
    "14_29_days": 0,
    "30_59_days": 0,
    "60_plus_days": 0,
    never_voted: 0,
    insufficient_history: 0,
  },
  coverage: { status: "unavailable", captureStartedAt: null, captureDataSince: null, interpretation: "Sin captura." },
  limit: 20,
  offset: 0,
  sortBy: "daysSinceLastVote",
  sortOrder: "desc",
  data: [],
};

describe("useActivityInactivityQuery", () => {
  let queryClient: QueryClient;
  let pinia: ReturnType<typeof createPinia>;
  let stopPrivateCacheObserver: (() => void) | undefined;
  let wrappers: ReturnType<typeof mount>[];

  beforeEach(() => {
    vi.clearAllMocks();
    wrappers = [];
    pinia = createPinia();
    setActivePinia(pinia);
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    const authStore = useAuthStore();
    authStore.$patch({
      authStatus: "authenticated",
      token: "memory-token",
      userId: "admin-a",
      username: "admin-a",
      role: "superadmin",
      authSessionGeneration: 4,
    });
    stopPrivateCacheObserver = observePrivateQueryCache(authStore, queryClient);
  });

  afterEach(() => {
    wrappers.forEach((wrapper) => wrapper.unmount());
    stopPrivateCacheObserver?.();
    queryClient.clear();
  });

  function mountQuery(params = { asOf: "2026-10-24", limit: 20, offset: 0 }) {
    const parameters = shallowRef(params);
    const Harness = defineComponent({
      setup() {
        const query = useActivityInactivityQuery(() => parameters.value);
        return () => h("output", query.data.value?.asOf ?? String(query.error.value ?? "loading"));
      },
    });
    const wrapper = mount(Harness, { global: { plugins: [pinia, [VueQueryPlugin, { queryClient }]] } });
    wrappers.push(wrapper);
    return { wrapper, parameters };
  }

  it("normalizes parameters and isolates cache keys by filters, identity, and session generation", () => {
    expect(normalizeActivityInactivityParams({ role: undefined, limit: 20, offset: 0 })).toEqual({ limit: 20, offset: 0 });
    const params = { asOf: "2026-10-24", role: "user" as const, isActive: "true" as const, limit: 20, offset: 0 };
    expect(activityInactivityQueryKeyForSession(params, "admin-a", 4)).not.toEqual(
      activityInactivityQueryKeyForSession(params, "admin-b", 4),
    );
    expect(activityInactivityQueryKeyForSession(params, "admin-a", 4)).not.toEqual(
      activityInactivityQueryKeyForSession(params, "admin-a", 5),
    );
    expect(activityInactivityQueryKeyForSession(params, "admin-a", 4)).not.toEqual(
      activityInactivityQueryKeyForSession({ ...params, offset: 20 }, "admin-a", 4),
    );
  });

  it("keeps contract nulls and rejects missing groups or invalid classifications", () => {
    const valid: unknown = {
      ...response,
      totalUsers: 1,
      groups: { ...response.groups, insufficient_history: 1 },
      data: [{
        userId: "u-1", username: "Listener", role: "user", isActive: true,
        lastVoteAt: null, daysSinceLastVote: null, inactivityGroup: "insufficient_history",
        lastPresenceAt: null, lastRatingModifiedAt: null, currentRatings: 0,
      }],
    };
    expect(isActivityInactivityResponse(valid)).toBe(true);
    expect(isActivityInactivityResponse({ ...response, groups: { "0_2_days": 0 } })).toBe(false);
    expect(isActivityInactivityResponse({ ...response, data: [{ ...response.data[0], inactivityGroup: "unknown" }] })).toBe(false);
  });

  it("does not request private inactivity data without superadmin access", async () => {
    useAuthStore().role = "user";
    mountQuery();
    await flushPromises();

    expect(getActivityInactivity).not.toHaveBeenCalled();
  });

  it("discards a late inactivity response on downgrade and refetches after restoration", async () => {
    let resolveLate!: (value: ActivityInactivityResponse) => void;
    getActivityInactivity
      .mockImplementationOnce(() => new Promise((resolve) => { resolveLate = resolve; }))
      .mockResolvedValueOnce({ ...response, asOf: "2026-10-25" });
    const authStore = useAuthStore();
    const { wrapper } = mountQuery();
    await vi.waitFor(() => expect(getActivityInactivity).toHaveBeenCalledOnce());
    const signal = getActivityInactivity.mock.calls[0]?.[1] as AbortSignal;

    authStore.$patch({ role: "user" });
    expect(signal.aborted).toBe(true);
    resolveLate(response);
    await flushPromises();
    expect(wrapper.text()).not.toContain("2026-10-24");
    expect(queryClient.getQueryCache().getAll().every((query) => query.state.data === undefined)).toBe(true);

    authStore.$patch({ role: "superadmin" });
    const key = activityInactivityQueryKeyForSession(
      { asOf: "2026-10-24", limit: 20, offset: 0 }, "admin-a", 4,
    );
    await vi.waitFor(() => expect(queryClient.getQueryData(key)).toEqual({ ...response, asOf: "2026-10-25" }));
    expect(getActivityInactivity).toHaveBeenCalledTimes(2);
  });

  it("cancels the previous request when reactive filters change", async () => {
    let resolvePrevious: ((value: ActivityInactivityResponse) => void) | undefined;
    getActivityInactivity
      .mockImplementationOnce(() => new Promise((resolve) => { resolvePrevious = resolve; }))
      .mockResolvedValueOnce({ ...response, asOf: "2026-10-25" });
    const { wrapper, parameters } = mountQuery();

    await vi.waitFor(() => expect(getActivityInactivity).toHaveBeenCalledTimes(1));
    const previousSignal = getActivityInactivity.mock.calls[0]?.[1] as AbortSignal;
    parameters.value = { asOf: "2026-10-25", role: "collaborator", limit: 20, offset: 0 };
    await vi.waitFor(() => expect(getActivityInactivity).toHaveBeenCalledTimes(2));
    expect(previousSignal.aborted).toBe(true);
    resolvePrevious?.(response);
    await vi.waitFor(() => expect(wrapper.text()).toBe("2026-10-25"));
  });

  it("passes AbortSignal and prevents an older session response from populating the new session cache", async () => {
    let resolveOld: ((value: ActivityInactivityResponse) => void) | undefined;
    getActivityInactivity
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }))
      .mockResolvedValueOnce({ ...response, asOf: "2026-10-25" });
    const { wrapper } = mountQuery();

    await vi.waitFor(() => expect(getActivityInactivity).toHaveBeenCalledTimes(1));
    expect(getActivityInactivity.mock.calls[0]?.[1]).toBeInstanceOf(AbortSignal);
    const oldSignal = getActivityInactivity.mock.calls[0]?.[1] as AbortSignal;

    useAuthStore().$patch({ userId: "admin-b", authSessionGeneration: 5 });
    await vi.waitFor(() => expect(getActivityInactivity).toHaveBeenCalledTimes(2));
    expect(oldSignal.aborted).toBe(true);
    resolveOld?.(response);
    await flushPromises();

    expect(wrapper.text()).toBe("2026-10-25");
    expect(queryClient.getQueryData(activityInactivityQueryKeyForSession(
      { asOf: "2026-10-24", limit: 20, offset: 0 },
      "admin-a",
      4,
    ))).toBeUndefined();
  });
});
