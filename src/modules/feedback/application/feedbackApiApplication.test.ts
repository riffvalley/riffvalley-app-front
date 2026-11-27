// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, h } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import type { FeedbackListResponse } from "../types/feedback";

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), remove: vi.fn() }));
vi.mock("@services/api/api", () => ({
  default: { get: http.get, post: http.post, patch: http.patch, delete: http.remove },
}));
vi.mock("@/app/sidebarSummary", () => ({ invalidateSidebarSummary: vi.fn() }));
vi.mock("@services/versions/currentVersionItems", () => ({ getCurrentVersionItems: vi.fn() }));

import { useAuthStore } from "@/modules/identity/auth";
import { useAdminFeedbackQuery } from "./useFeedback";

// Fixture mirrors SuggestionsService.findAll's `{ data, counts }` response.
// The HTTP client is mocked: this is a frontend API/application boundary test,
// not an integration test against a running backend.
const backendResponse: FeedbackListResponse = {
  data: [
    {
      id: "bug-1",
      title: "Crash on save",
      description: "Details",
      type: "bug",
      status: "in_progress",
      priority: "high",
      rejectionReason: null,
      userId: "user-1",
      user: { id: "user-1", username: "Member", image: "https://example.test/member.png" },
      versionItemId: null,
      versionItem: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "suggestion-1",
      title: "Keyboard shortcuts",
      description: "Details",
      type: "suggestion",
      status: "done",
      priority: "medium",
      rejectionReason: null,
      userId: null,
      user: null,
      versionItemId: "version-item-1",
      versionItem: {
        id: "version-item-1",
        type: "feat",
        description: "Add keyboard shortcuts",
        state: "done",
      },
      createdAt: "2026-01-02T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    },
  ],
  counts: { in_progress: 4, done: 2, rejected: 1 },
};

describe("Feedback API/application response contract", () => {
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
    http.get.mockResolvedValue({ data: backendResponse });
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    queryClient.clear();
  });

  it("passes the backend response envelope through the real API adapter and admin query", async () => {
    let query: ReturnType<typeof useAdminFeedbackQuery> | undefined;
    wrapper = mount(
      defineComponent({
        setup() {
          query = useAdminFeedbackQuery("all", "all");
          return () => h("div");
        },
      }),
      { global: { plugins: [pinia, [VueQueryPlugin, { queryClient }]] } }
    );

    await vi.waitFor(() => expect(query?.data.value).toEqual(backendResponse));
    expect(http.get).toHaveBeenCalledWith("/suggestions", {
      params: {},
      signal: expect.any(AbortSignal),
    });
    expect(query?.data.value?.data).toHaveLength(2);
    expect(query?.data.value?.counts).toEqual({ in_progress: 4, done: 2, rejected: 1 });
    await flushPromises();
  });
});
