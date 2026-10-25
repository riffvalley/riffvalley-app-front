// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, ref } from "vue";
import { mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";

const { getGlobalActivity } = vi.hoisted(() => ({ getGlobalActivity: vi.fn() }));

vi.mock("@/modules/identity/api/users", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/identity/api/users")>();
  return { ...actual, getGlobalActivity };
});

import { observePrivateQueryCache } from "@/app/privateQueryCache";
import { useAuthStore } from "@/modules/identity/stores/auth";
import type { GlobalActivityResponse } from "@/modules/identity/types/users";
import { globalActivityQueryKeyForSession, useAdminActivityQueries } from "./useAdminActivityQueries";

const globalActivity: GlobalActivityResponse = {
  totalItems: 1,
  totalPages: 2,
  currentPage: 1,
  limit: 20,
  data: [{
    id: "vote-1",
    rate: 5,
    cover: null,
    createdAt: "2025-03-04T12:30:00.000Z",
    editedAt: null,
    user: { id: "target-1", username: "Member A", image: "" },
    disc: { id: "disc-1", name: "Release" },
  }],
};

describe("useAdminActivityQueries global feed", () => {
  let queryClient: QueryClient;
  let wrapper: ReturnType<typeof mount> | undefined;
  let stopPrivateCacheObserver: (() => void) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 60_000, gcTime: Infinity } } });
    const authStore = useAuthStore();
    authStore.$patch({
      authStatus: "authenticated",
      token: "access-token-in-memory",
      userId: "admin-a",
      username: "admin-a",
      role: "superadmin",
      authSessionGeneration: 3,
    });
    stopPrivateCacheObserver = observePrivateQueryCache(authStore, queryClient);
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    stopPrivateCacheObserver?.();
    stopPrivateCacheObserver = undefined;
    queryClient.clear();
  });

  function mountQuery(enabled: () => boolean = () => true) {
    const page = ref(1);
    wrapper = mount(defineComponent({
      setup() {
        const queries = useAdminActivityQueries({
          limit: 20,
          offset: () => (page.value - 1) * 20,
          enabled,
        });
        return () => queries.globalQuery.data.value?.totalItems ?? null;
      },
    }), { global: { plugins: [[VueQueryPlugin, { queryClient }]] } });
    return { page };
  }

  it("loads the unchanged /auth/activity feed with pagination and session in its key", async () => {
    getGlobalActivity.mockResolvedValue(globalActivity);
    mountQuery();

    const key = globalActivityQueryKeyForSession(20, 0, "admin-a", 3);
    await vi.waitFor(() => expect(queryClient.getQueryData(key)).toEqual(globalActivity));
    expect(getGlobalActivity).toHaveBeenCalledWith(20, 0, expect.any(AbortSignal));
  });

  it("pauses global paging during a user detail and resumes the cached feed when cleared", async () => {
    const selectedUserId = ref("");
    getGlobalActivity.mockResolvedValue(globalActivity);
    mountQuery(() => !selectedUserId.value);
    await vi.waitFor(() => expect(getGlobalActivity).toHaveBeenCalledOnce());

    selectedUserId.value = "target-1";
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(getGlobalActivity).toHaveBeenCalledOnce();

    selectedUserId.value = "";
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(getGlobalActivity).toHaveBeenCalledOnce();
    expect(queryClient.getQueryData(globalActivityQueryKeyForSession(20, 0, "admin-a", 3)))
      .toEqual(globalActivity);
  });

  it("does not query the global feed without a superadmin session", async () => {
    useAuthStore().$patch({ role: "user" });
    mountQuery();

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(getGlobalActivity).not.toHaveBeenCalled();
  });
});
