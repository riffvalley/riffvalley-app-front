// @vitest-environment happy-dom
import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@services/api/api", () => ({ default: { get } }));

import { observePrivateQueryCache } from "@/app/privateQueryCache";
import { useAuthStore } from "@/modules/identity/auth";
import {
  dashboardSummaryQueryKeyForSession,
  formatDashboardSummaryValue,
  getDashboardSummary,
  mutateAndInvalidateDashboardSummary,
  useDashboardSummaryQuery,
  type DashboardSummary,
} from "./dashboardSummary";

const completeSummary = {
  personal: {
    totalRatedDiscs: 12,
    totalExploredGenres: 8,
    totalActiveDays: 24,
    currentStreak: 4,
    year: { ratedDiscs: 3, exploredGenres: 2, activeDays: 11 },
    month: { ratedDiscs: 1, exploredGenres: 1, activeDays: 5 },
  },
  catalog: { totalDiscs: 120, discsThisYear: 14, discsThisMonth: 3 },
} satisfies DashboardSummary;

function createQueryHarness() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: 60_000 } },
  });
  const authStore = useAuthStore();
  observePrivateQueryCache(authStore, client);
  const component = defineComponent({
    setup() {
      useDashboardSummaryQuery();
      return {};
    },
    template: "<div />",
  });
  const mountQuery = () =>
    mount(component, {
      global: { plugins: [pinia, [VueQueryPlugin, { queryClient: client }]] },
    });
  return { authStore, client, mountQuery };
}

function authenticate(authStore: ReturnType<typeof useAuthStore>, userId = "user-a") {
  authStore.$patch({
    token: "memory-only-token",
    authStatus: "authenticated",
    userId,
    role: "user",
  });
}

describe("DashboardSummary", () => {
  beforeEach(() => {
    get.mockReset();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("reads the exact numeric backend contract without transforming values", async () => {
    get.mockResolvedValue({ data: completeSummary });

    await expect(getDashboardSummary()).resolves.toEqual(completeSummary);
    expect(get).toHaveBeenCalledWith("/app/dashboard-summary", { signal: undefined });
  });

  it("preserves every nullable backend field as null", async () => {
    const summary: DashboardSummary = {
      personal: {
        totalRatedDiscs: 0,
        totalExploredGenres: 0,
        totalActiveDays: 0,
        currentStreak: null,
        year: { ratedDiscs: null, exploredGenres: null, activeDays: 0 },
        month: { ratedDiscs: null, exploredGenres: null, activeDays: null },
      },
      catalog: { totalDiscs: 0, discsThisYear: 0, discsThisMonth: 0 },
    };
    get.mockResolvedValue({ data: summary });

    await expect(getDashboardSummary()).resolves.toEqual(summary);
    expect(formatDashboardSummaryValue(null)).toBe("Sin datos históricos");
  });

  it("preserves the distinction between zero, positive values, and unknown values", async () => {
    const summary: DashboardSummary = {
      personal: {
        totalRatedDiscs: 0,
        totalExploredGenres: 0,
        totalActiveDays: 0,
        currentStreak: 0,
        year: { ratedDiscs: 0, exploredGenres: null, activeDays: 0 },
        month: { ratedDiscs: 2, exploredGenres: 0, activeDays: null },
      },
      catalog: { totalDiscs: 18, discsThisYear: 7, discsThisMonth: 2 },
    };
    get.mockResolvedValue({ data: summary });

    await expect(getDashboardSummary()).resolves.toEqual(summary);
    expect(formatDashboardSummaryValue(0)).toBe("0");
    expect(formatDashboardSummaryValue(2)).toBe("2");
  });

  it("forwards AbortSignal and propagates HTTP errors unchanged", async () => {
    const controller = new AbortController();
    const failure = new Error("HTTP request failed");
    get.mockRejectedValue(failure);

    await expect(getDashboardSummary(controller.signal)).rejects.toBe(failure);
    expect(get).toHaveBeenCalledWith("/app/dashboard-summary", { signal: controller.signal });
  });

  it("keys data by user, role, and session generation", () => {
    const key = dashboardSummaryQueryKeyForSession("user-a", "user", 3);
    expect(key).toEqual(["app", "dashboard-summary", "user-a", "user", 3]);
    expect(key).not.toEqual(dashboardSummaryQueryKeyForSession("user-b", "user", 3));
    expect(key).not.toEqual(dashboardSummaryQueryKeyForSession("user-a", "collaborator", 3));
    expect(key).not.toEqual(dashboardSummaryQueryKeyForSession("user-a", "user", 4));
  });

  it("stays disabled without a valid session and loads once two observers share a key", async () => {
    const { authStore, client, mountQuery } = createQueryHarness();
    get.mockResolvedValue({ data: completeSummary });
    const first = mountQuery();
    const second = mountQuery();
    await Promise.resolve();
    expect(get).not.toHaveBeenCalled();

    authenticate(authStore);
    await vi.waitFor(() => expect(get).toHaveBeenCalledOnce());
    expect(client.getQueryData(dashboardSummaryQueryKeyForSession("user-a", "user", 0))).toEqual(
      completeSummary
    );
    first.unmount();
    second.unmount();
    client.clear();
  });

  it("clears the prior user's data before loading the replacement identity", async () => {
    const { authStore, client, mountQuery } = createQueryHarness();
    get.mockResolvedValue({ data: completeSummary });
    authenticate(authStore);
    const wrapper = mountQuery();
    await vi.waitFor(() => expect(get).toHaveBeenCalledOnce());
    const previousKey = dashboardSummaryQueryKeyForSession("user-a", "user", 0);

    authStore.$patch({ userId: "user-b" });

    expect(client.getQueryCache().getAll()).toHaveLength(0);
    expect(client.getQueryData(previousKey)).toBeUndefined();
    await vi.waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(client.getQueryData(dashboardSummaryQueryKeyForSession("user-b", "user", 0))).toEqual(
      completeSummary
    );
    wrapper.unmount();
    client.clear();
  });

  it("cancels a pending private request on logout and ignores its late response", async () => {
    const { authStore, client, mountQuery } = createQueryHarness();
    authenticate(authStore);
    let requestSignal: AbortSignal | undefined;
    let resolveRequest!: (response: { data: DashboardSummary }) => void;
    get.mockImplementation((_path: string, config: { signal: AbortSignal }) => {
      requestSignal = config.signal;
      return new Promise((resolve) => {
        resolveRequest = resolve;
      });
    });
    const wrapper = mountQuery();
    await vi.waitFor(() => expect(get).toHaveBeenCalledOnce());
    const oldKey = dashboardSummaryQueryKeyForSession("user-a", "user", 0);

    authStore.clearSessionLocally();
    resolveRequest({ data: completeSummary });
    await Promise.resolve();

    expect(requestSignal?.aborted).toBe(true);
    expect(client.getQueryData(oldKey)).toBeUndefined();
    wrapper.unmount();
    client.clear();
  });

  it("does not reuse a prior session snapshot after logout and a new login", async () => {
    const { authStore, client, mountQuery } = createQueryHarness();
    get.mockResolvedValue({ data: completeSummary });
    authenticate(authStore);
    const wrapper = mountQuery();
    await vi.waitFor(() => expect(get).toHaveBeenCalledOnce());

    const previousKey = dashboardSummaryQueryKeyForSession("user-a", "user", 0);
    authStore.clearSessionLocally();
    authStore.authSessionGeneration += 1;
    authenticate(authStore);

    const currentKey = dashboardSummaryQueryKeyForSession("user-a", "user", 2);
    expect(currentKey).not.toEqual(previousKey);
    expect(client.getQueryData(previousKey)).toBeUndefined();
    await vi.waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(client.getQueryData(currentKey)).toEqual(completeSummary);

    wrapper.unmount();
    client.clear();
  });

  it("keeps query errors as errors instead of exposing an empty summary", async () => {
    const { authStore, client, mountQuery } = createQueryHarness();
    const failure = new Error("HTTP request failed");
    get.mockRejectedValue(failure);
    authenticate(authStore);
    const wrapper = mountQuery();
    const queryKey = dashboardSummaryQueryKeyForSession("user-a", "user", 0);

    await vi.waitFor(() => expect(client.getQueryState(queryKey)?.status).toBe("error"));
    expect(client.getQueryData(queryKey)).toBeUndefined();
    expect(client.getQueryState(queryKey)?.error).toBe(failure);

    wrapper.unmount();
    client.clear();
  });

  it("invalidates after a successful relevant mutation but not after a failure", async () => {
    const client = new QueryClient();
    const key = dashboardSummaryQueryKeyForSession("user-a", "user", 1);
    client.setQueryData(key, completeSummary);
    const mutation = vi.fn().mockResolvedValue("saved");

    await expect(mutateAndInvalidateDashboardSummary(client, mutation)).resolves.toBe("saved");
    expect(client.getQueryState(key)?.isInvalidated).toBe(true);

    await client.resetQueries({ queryKey: key });
    await mutateAndInvalidateDashboardSummary(client, () => Promise.resolve("cover saved"), false);
    expect(client.getQueryState(key)?.isInvalidated).toBe(false);

    const failure = new Error("mutation failed");
    await expect(
      mutateAndInvalidateDashboardSummary(client, () => Promise.reject(failure))
    ).rejects.toBe(failure);
    expect(client.getQueryState(key)?.isInvalidated).toBe(false);
    client.clear();
  });
});
