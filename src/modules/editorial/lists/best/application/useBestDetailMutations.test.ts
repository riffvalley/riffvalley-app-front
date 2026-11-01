// @vitest-environment happy-dom
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  postAsignationService,
  updateAsignationService,
  deleteAsignationService,
  updateDisc,
  updateList,
  generateBestDiscsWpPost,
} = vi.hoisted(() => ({
  postAsignationService: vi.fn(),
  updateAsignationService: vi.fn(),
  deleteAsignationService: vi.fn(),
  updateDisc: vi.fn(),
  updateList: vi.fn(),
  generateBestDiscsWpPost: vi.fn(),
}));

vi.mock("@services/asignation/asignation", () => ({
  postAsignationService,
  updateAsignationService,
  deleteAsignationService,
}));
vi.mock("@services/discs/discs", () => ({ updateDisc }));
vi.mock("@services/list/list", () => ({ updateList, generateBestDiscsWpPost }));

import { useAuthStore } from "@/modules/identity/auth";
import { bestDetailQueryKeys } from "./bestDetailQueries";
import { useBestDetailMutations } from "./useBestDetailMutations";

describe("Best detail mutations", () => {
  let pinia: ReturnType<typeof createPinia>;
  let queryClient: QueryClient;
  let wrapper: ReturnType<typeof mount> | undefined;
  beforeEach(() => {
    vi.resetAllMocks();
    pinia = createPinia();
    setActivePinia(pinia);
    useAuthStore().$patch({
      authStatus: "authenticated",
      isAuthenticated: true,
      userId: "editor-a",
      token: "token",
      role: "riffvalley",
      authSessionGeneration: 2,
    });
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    postAsignationService.mockResolvedValue({ id: "assignment-1" });
    updateAsignationService.mockResolvedValue({ id: "assignment-1" });
    deleteAsignationService.mockResolvedValue(undefined);
    updateDisc.mockResolvedValue(undefined);
    updateList.mockResolvedValue({ id: "best-1" });
    generateBestDiscsWpPost.mockResolvedValue({
      wpPostId: 4,
      link: "https://wp.test/post",
      title: "Draft",
    });
  });
  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    queryClient.clear();
  });

  function mountMutations() {
    let mutations!: ReturnType<typeof useBestDetailMutations>;
    wrapper = mount(
      defineComponent({
        setup() {
          mutations = useBestDetailMutations("best-1");
          return () => null;
        },
      }),
      {
        global: { plugins: [pinia, [VueQueryPlugin, { queryClient }]] },
      }
    );
    return mutations;
  }

  function seedAndCheck(key: readonly unknown[]) {
    queryClient.setQueryData(key, []);
    expect(queryClient.getQueryState(key)?.isInvalidated).toBe(false);
  }

  it("invalidates assignments, catalog and calendar after assignment create/update/delete", async () => {
    const session = { userId: "editor-a", generation: 2 };
    const assignments = bestDetailQueryKeys.assignments(session, "best-1");
    const catalog = bestDetailQueryKeys.catalog(session, "best-1", "2026-10-01");
    const calendar = ["editorial", "content-calendar", "deferred", "editor-a", 2];
    seedAndCheck(assignments);
    seedAndCheck([...bestDetailQueryKeys.root, "catalog", "best-1", "2026-10-01", "editor-a", 2]);
    seedAndCheck(calendar);
    const mutations = mountMutations();
    await mutations.assign({ userId: "user-1", discId: "disc-1", listId: "best-1" });
    await mutations.updateAssignment({ id: "assignment-1", payload: { done: true } });
    await mutations.removeAssignment("assignment-1");
    expect(postAsignationService).toHaveBeenCalledOnce();
    expect(updateAsignationService).toHaveBeenCalledWith("assignment-1", { done: true });
    expect(deleteAsignationService).toHaveBeenCalledWith("assignment-1");
    expect(queryClient.getQueryState(assignments)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(catalog)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(calendar)?.isInvalidated).toBe(true);
    await flushPromises();
  });

  it("invalidates catalog after global featured changes and detail/calendar after list and WordPress writes", async () => {
    const session = { userId: "editor-a", generation: 2 };
    const list = bestDetailQueryKeys.list(session, "best-1");
    const calendar = ["editorial", "content-calendar", "deferred", "editor-a", 2];
    const catalog = [...bestDetailQueryKeys.root, "catalog", "best-1", "2026-10-01", "editor-a", 2];
    seedAndCheck(list);
    seedAndCheck(calendar);
    seedAndCheck(catalog);
    const mutations = mountMutations();
    await mutations.toggleFeatured({ discId: "disc-1", pinned: true });
    expect(updateDisc).toHaveBeenCalledWith("disc-1", { pinned: true });
    expect(queryClient.getQueryState(catalog)?.isInvalidated).toBe(true);
    await mutations.updateList({ status: "assigned" });
    expect(updateList).toHaveBeenCalledWith("best-1", { status: "assigned" });
    expect(queryClient.getQueryState(list)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(calendar)?.isInvalidated).toBe(true);
    await mutations.publishToWordPress();
    expect(generateBestDiscsWpPost).toHaveBeenCalledWith("best-1");
    expect(queryClient.getQueryState(list)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(calendar)?.isInvalidated).toBe(true);
  });
});
