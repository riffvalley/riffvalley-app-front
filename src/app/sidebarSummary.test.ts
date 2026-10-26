// @vitest-environment happy-dom
import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@services/api/api", () => ({ default: { get } }));

import { useAuthStore } from "@/modules/identity/auth";
import {
  getSidebarSummary,
  invalidateSidebarSummary,
  mutateAndInvalidateSidebarSummary,
  sidebarSummaryQueryKeyForSession,
  useSidebarSummaryQuery,
} from "./sidebarSummary";

describe("Sidebar summary query", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    get.mockReset();
  });

  it("uses the shared endpoint and forwards the cancellation signal", async () => {
    const summary = { version: { latest: "1.8.4" } };
    get.mockResolvedValue({ data: summary });
    const controller = new AbortController();

    await expect(getSidebarSummary(controller.signal)).resolves.toEqual(summary);

    expect(get).toHaveBeenCalledWith("/app/sidebar-summary", { signal: controller.signal });
  });

  it("keys cached summaries by identity, role, and existing session generation", () => {
    expect(sidebarSummaryQueryKeyForSession("user-a", "riffvalley", 3)).toEqual([
      "app", "sidebar-summary", "user-a", "riffvalley", 3,
    ]);
    expect(sidebarSummaryQueryKeyForSession("user-a", "riffvalley", 3)).not.toEqual(
      sidebarSummaryQueryKeyForSession("user-b", "riffvalley", 3),
    );
    expect(sidebarSummaryQueryKeyForSession("user-a", "riffvalley", 3)).not.toEqual(
      sidebarSummaryQueryKeyForSession("user-a", "collaborator", 3),
    );
  });

  it("does not run anonymously and preserves query errors instead of converting them to zeros", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = mount(defineComponent({
      setup() {
        useSidebarSummaryQuery();
        return {};
      },
      template: "<div />",
    }), { global: { plugins: [pinia, [VueQueryPlugin, { queryClient: client }]] } });

    await Promise.resolve();
    expect(get).not.toHaveBeenCalled();

    const authStore = useAuthStore();
    authStore.$patch({
      token: "token",
      authStatus: "authenticated",
      userId: "user-a",
      role: "riffvalley",
    });
    const failure = new Error("summary unavailable");
    get.mockRejectedValue(failure);
    await vi.waitFor(() => expect(get).toHaveBeenCalledOnce());
    const queryKey = sidebarSummaryQueryKeyForSession("user-a", "riffvalley", authStore.authSessionGeneration);
    await vi.waitFor(() => expect(client.getQueryState(queryKey)?.status).toBe("error"));

    expect(client.getQueryData(queryKey)).toBeUndefined();
    wrapper.unmount();
    client.clear();
  });

  it("invalidates only sidebar summary queries", async () => {
    const client = new QueryClient();
    const summaryKey = sidebarSummaryQueryKeyForSession("user-a", "user", 1);
    client.setQueryData(summaryKey, { version: { latest: "1.8.4" } });
    client.setQueryData(["requests", "all"], []);

    await invalidateSidebarSummary(client);

    expect(client.getQueryState(summaryKey)?.isInvalidated).toBe(true);
    expect(client.getQueryState(["requests", "all"])?.isInvalidated).toBe(false);
    client.clear();
  });

  it("invalidates after a successful relevant mutation and leaves failed mutations untouched", async () => {
    const client = new QueryClient();
    const key = sidebarSummaryQueryKeyForSession("user-a", "riffvalley", 1);
    client.setQueryData(key, { version: { latest: "1.8.4" }, petitions: { pending: 2 } });
    const mutation = vi.fn().mockResolvedValue("updated");

    await expect(mutateAndInvalidateSidebarSummary(client, mutation)).resolves.toBe("updated");
    expect(mutation).toHaveBeenCalledOnce();
    expect(client.getQueryState(key)?.isInvalidated).toBe(true);

    await client.resetQueries({ queryKey: key });
    const failedKey = sidebarSummaryQueryKeyForSession("user-a", "riffvalley", 2);
    client.setQueryData(failedKey, { version: { latest: "1.8.4" }, petitions: { pending: 2 } });
    const failure = new Error("mutation failed");
    await expect(mutateAndInvalidateSidebarSummary(client, () => Promise.reject(failure))).rejects.toBe(failure);
    expect(client.getQueryState(failedKey)?.isInvalidated).toBe(false);
    client.clear();
  });
});
