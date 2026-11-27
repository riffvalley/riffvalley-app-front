// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, h } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import type { FeedbackListResponse } from "../types/feedback";

const api = vi.hoisted(() => ({
  createFeedback: vi.fn(),
  getFeedback: vi.fn(),
  getMyFeedback: vi.fn(),
  updateFeedback: vi.fn(),
  reopenFeedback: vi.fn(),
  rejectFeedback: vi.fn(),
  completeFeedback: vi.fn(),
  deleteFeedback: vi.fn(),
  getCurrentVersionItems: vi.fn(),
  invalidateSidebarSummary: vi.fn(),
}));
vi.mock("../api/feedback", () => api);
vi.mock("@services/versions/currentVersionItems", () => ({
  getCurrentVersionItems: api.getCurrentVersionItems,
}));
vi.mock("@/app/sidebarSummary", () => ({ invalidateSidebarSummary: api.invalidateSidebarSummary }));

import { useAuthStore } from "@/modules/identity/auth";
import {
  adminFeedbackQueryKeyForSession,
  feedbackQueryKeyForSession,
  useAdminFeedbackQuery,
  useCurrentFeedbackVersionItemsQuery,
  useFeedbackMutations,
  useMyFeedbackQuery,
} from "./useFeedback";

describe("Feedback application queries and mutations", () => {
  let pinia: ReturnType<typeof createPinia>;
  let queryClient: QueryClient;
  let wrapper: ReturnType<typeof mount> | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    pinia = createPinia();
    setActivePinia(pinia);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    useAuthStore().$patch({
      authStatus: "authenticated",
      token: "token",
      userId: "admin-1",
      role: "superadmin",
      authSessionGeneration: 4,
    });
    api.getMyFeedback.mockResolvedValue({
      data: [],
      counts: { in_progress: 0, done: 0, rejected: 0 },
    });
    api.getFeedback.mockResolvedValue({
      data: [],
      counts: { in_progress: 0, done: 0, rejected: 0 },
    });
    api.getCurrentVersionItems.mockResolvedValue([]);
    api.createFeedback.mockResolvedValue({ id: "new-entry" });
    api.updateFeedback.mockResolvedValue({ id: "entry-1" });
    api.reopenFeedback.mockResolvedValue({ id: "entry-1" });
    api.rejectFeedback.mockResolvedValue({ id: "entry-1" });
    api.completeFeedback.mockResolvedValue({ id: "entry-1" });
    api.deleteFeedback.mockResolvedValue(undefined);
    api.invalidateSidebarSummary.mockResolvedValue(undefined);
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    queryClient.clear();
  });

  function mountHarness(setup: () => unknown) {
    wrapper = mount(defineComponent({ setup, render: () => h("div") }), {
      global: { plugins: [pinia, [VueQueryPlugin, { queryClient }]] },
    });
  }

  it("isolates own/admin/filter query identities by user and session generation", () => {
    expect(feedbackQueryKeyForSession("mine", "a", 1)).not.toEqual(
      feedbackQueryKeyForSession("mine", "b", 1)
    );
    expect(feedbackQueryKeyForSession("mine", "a", 1)).not.toEqual(
      feedbackQueryKeyForSession("mine", "a", 2)
    );
    expect(feedbackQueryKeyForSession("mine", "a", 1)).not.toEqual(
      feedbackQueryKeyForSession("admin", "a", 1)
    );
    expect(adminFeedbackQueryKeyForSession({ type: "bug" }, "a", 1)).not.toEqual(
      adminFeedbackQueryKeyForSession({ type: "suggestion" }, "a", 1)
    );
    expect(adminFeedbackQueryKeyForSession({ category: "other" }, "a", 1)).not.toEqual(
      adminFeedbackQueryKeyForSession({ category: "uncategorized" }, "a", 1)
    );
    expect(adminFeedbackQueryKeyForSession({ category: "other" }, "a", 1)).not.toEqual(
      adminFeedbackQueryKeyForSession({}, "a", 1)
    );
    expect(feedbackQueryKeyForSession("mine", "a", 1, { category: "other" })).not.toEqual(
      feedbackQueryKeyForSession("mine", "a", 1, { category: "uncategorized" })
    );
  });

  it("loads own and admin lists with Query cancellation signals and typed filters", async () => {
    mountHarness(() => {
      useMyFeedbackQuery("suggestion", "done", "other");
      useAdminFeedbackQuery("bug", "rejected", "uncategorized");
      useCurrentFeedbackVersionItemsQuery(true);
      return {};
    });
    await flushPromises();
    expect(api.getMyFeedback).toHaveBeenCalledWith(
      { type: "suggestion", status: "done", category: "other" },
      expect.any(AbortSignal)
    );
    expect(api.getFeedback).toHaveBeenCalledWith(
      { type: "bug", status: "rejected", category: "uncategorized" },
      expect.any(AbortSignal)
    );
    expect(api.getCurrentVersionItems).toHaveBeenCalledWith(expect.any(AbortSignal));
  });

  it("disables the administrative query for a user role but keeps the own list", async () => {
    useAuthStore().role = "user";
    mountHarness(() => {
      useMyFeedbackQuery();
      useAdminFeedbackQuery("all", "all");
      return {};
    });
    await flushPromises();
    expect(api.getMyFeedback).toHaveBeenCalledOnce();
    expect(api.getFeedback).not.toHaveBeenCalled();
  });

  it("retains a real query error instead of returning an empty list", async () => {
    const failure = new Error("offline");
    api.getMyFeedback.mockRejectedValueOnce(failure);
    let query: ReturnType<typeof useMyFeedbackQuery> | undefined;
    mountHarness(() => {
      query = useMyFeedbackQuery();
      return {};
    });
    await vi.waitFor(() => expect(query?.isError.value).toBe(true));
    expect(query?.error.value).toBe(failure);
    expect(query?.data.value).toBeUndefined();
  });

  it("invalidates Feedback after mutations and Sidebar summary only for membership changes", async () => {
    let mutations: ReturnType<typeof useFeedbackMutations> | undefined;
    mountHarness(() => {
      mutations = useFeedbackMutations();
      return {};
    });
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await mutations?.create.mutateAsync({ title: "t", description: "d", type: "bug" });
    await mutations?.update.mutateAsync({ id: "entry-1", dto: { priority: "high" } });
    await mutations?.update.mutateAsync({ id: "entry-1", dto: { category: "rankings" } });
    await mutations?.reopen.mutateAsync("entry-1");
    await mutations?.reject.mutateAsync({ id: "entry-1", rejectionReason: "Duplicate" });
    await mutations?.complete.mutateAsync({ id: "entry-1", versionItemId: "version-item-1" });
    await mutations?.remove.mutateAsync("entry-1");
    await flushPromises();

    expect(api.invalidateSidebarSummary).toHaveBeenCalledTimes(5);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["feedback"] });
    expect(api.rejectFeedback).toHaveBeenCalledWith("entry-1", { rejectionReason: "Duplicate" });
    expect(api.completeFeedback).toHaveBeenCalledWith("entry-1", {
      versionItemId: "version-item-1",
    });
    expect(api.updateFeedback).toHaveBeenCalledWith("entry-1", { category: "rankings" });
  });

  it("refreshes server status counts after a membership-changing mutation", async () => {
    const initial: FeedbackListResponse = {
      data: [],
      counts: { in_progress: 2, done: 1, rejected: 0 },
    };
    const afterCreation: FeedbackListResponse = {
      data: [],
      counts: { in_progress: 3, done: 1, rejected: 0 },
    };
    api.getFeedback.mockResolvedValueOnce(initial).mockResolvedValueOnce(afterCreation);

    let query: ReturnType<typeof useAdminFeedbackQuery> | undefined;
    let mutations: ReturnType<typeof useFeedbackMutations> | undefined;
    mountHarness(() => {
      query = useAdminFeedbackQuery("all", "all");
      mutations = useFeedbackMutations();
      return {};
    });
    await vi.waitFor(() => expect(query?.data.value).toEqual(initial));

    await mutations?.create.mutateAsync({
      title: "Idea",
      description: "Details",
      type: "suggestion",
    });

    await vi.waitFor(() => expect(query?.data.value).toEqual(afterCreation));
    expect(api.invalidateSidebarSummary).toHaveBeenCalledOnce();
  });

  it("refreshes both personal and administrative caches after correcting a category", async () => {
    const historical: FeedbackListResponse = {
      data: [],
      counts: { in_progress: 1, done: 0, rejected: 0 },
    };
    const categorized: FeedbackListResponse = {
      data: [],
      counts: { in_progress: 0, done: 1, rejected: 0 },
    };
    api.getFeedback.mockResolvedValueOnce(historical).mockResolvedValueOnce(categorized);
    api.getMyFeedback.mockResolvedValueOnce(historical).mockResolvedValueOnce(categorized);

    let adminQuery: ReturnType<typeof useAdminFeedbackQuery> | undefined;
    let myQuery: ReturnType<typeof useMyFeedbackQuery> | undefined;
    let mutations: ReturnType<typeof useFeedbackMutations> | undefined;
    mountHarness(() => {
      adminQuery = useAdminFeedbackQuery("all", "all");
      myQuery = useMyFeedbackQuery();
      mutations = useFeedbackMutations();
      return {};
    });
    await vi.waitFor(() => {
      expect(adminQuery?.data.value).toEqual(historical);
      expect(myQuery?.data.value).toEqual(historical);
    });

    await mutations?.update.mutateAsync({ id: "entry-1", dto: { category: "albums" } });

    await vi.waitFor(() => {
      expect(adminQuery?.data.value).toEqual(categorized);
      expect(myQuery?.data.value).toEqual(categorized);
    });
    expect(api.getFeedback).toHaveBeenCalledTimes(2);
    expect(api.getMyFeedback).toHaveBeenCalledTimes(2);
  });
});
