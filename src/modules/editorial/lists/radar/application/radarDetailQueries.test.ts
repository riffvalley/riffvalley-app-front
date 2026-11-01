// @vitest-environment happy-dom
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  getListDetails,
  getAsignationsByListService,
  getDiscsDated,
  getRvUsers,
  getAllGenres,
  postAsignationService,
  updateAsignationService,
  deleteAsignationService,
  updateDisc,
} = vi.hoisted(() => ({
  getListDetails: vi.fn(),
  getAsignationsByListService: vi.fn(),
  getDiscsDated: vi.fn(),
  getRvUsers: vi.fn(),
  getAllGenres: vi.fn(),
  postAsignationService: vi.fn(),
  updateAsignationService: vi.fn(),
  deleteAsignationService: vi.fn(),
  updateDisc: vi.fn(),
}));

vi.mock("@services/list/list", () => ({ getListDetails }));
vi.mock("@services/asignation/asignation", () => ({
  getAsignationsByListService,
  postAsignationService,
  updateAsignationService,
  deleteAsignationService,
}));
vi.mock("@services/discs/discs", () => ({ getDiscsDated, updateDisc }));
vi.mock("@/modules/identity/users", () => ({ getRvUsers }));
vi.mock("@services/genres/genres", () => ({ getAllGenres }));

import { useAuthStore } from "@/modules/identity/auth";
import {
  RADAR_CATALOG_PAGE_SIZE,
  radarDetailQueryKeys,
  useRadarAssignableUsersQuery,
  useRadarAssignmentsQuery,
  useRadarDetailQuery,
  useRadarDiscCatalogQuery,
  useRadarGenresQuery,
} from "./radarDetailQueries";
import { useRadarDetailMutations } from "./useRadarDetailMutations";

describe("Radar detail queries", () => {
  let queryClient: QueryClient;
  let pinia: ReturnType<typeof createPinia>;
  let wrapper: ReturnType<typeof mount> | undefined;

  beforeEach(() => {
    vi.resetAllMocks();
    pinia = createPinia();
    setActivePinia(pinia);
    useAuthStore().$patch({
      authStatus: "authenticated",
      token: "test-token",
      userId: "editor-a",
      role: "riffvalley",
      authSessionGeneration: 3,
    });
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    getListDetails.mockResolvedValue({
      id: "radar-a",
      name: "Radar",
      type: "week",
      releaseDate: "2026-10-09",
      listDate: "2026-10-12",
      asignations: [],
    });
    getAsignationsByListService.mockResolvedValue([]);
    getDiscsDated.mockResolvedValue({
      totalItems: 0,
      totalPages: 0,
      currentPage: 1,
      limit: RADAR_CATALOG_PAGE_SIZE,
      data: [],
    });
    getRvUsers.mockResolvedValue([]);
    getAllGenres.mockResolvedValue([]);
    postAsignationService.mockResolvedValue({ id: "assignment-new" });
    updateAsignationService.mockResolvedValue({ id: "assignment-1" });
    deleteAsignationService.mockResolvedValue(undefined);
    updateDisc.mockResolvedValue({ id: "disc-1", pinned: true });
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    queryClient.clear();
  });

  function mountQueries<T>(create: () => T): T {
    let result!: T;
    wrapper = mount(
      defineComponent({
        setup() {
          result = create();
          return () => null;
        },
      }),
      {
        global: { plugins: [pinia, [VueQueryPlugin, { queryClient }]] },
      }
    );
    return result;
  }

  it("uses distinct session-scoped keys for detail, assignments, catalog and auxiliary data", () => {
    const session = { userId: "editor-a", generation: 3 };
    expect(radarDetailQueryKeys.list(session, "radar-a")).not.toEqual(
      radarDetailQueryKeys.list({ userId: "editor-b", generation: 4 }, "radar-a")
    );
    expect(radarDetailQueryKeys.assignments(session, "radar-a")).not.toEqual(
      radarDetailQueryKeys.assignments(session, "radar-b")
    );
    expect(radarDetailQueryKeys.catalog(session, "radar-a", "2026-10-12", "", "")).not.toEqual(
      radarDetailQueryKeys.catalog(session, "radar-a", "2026-10-12", "search", "")
    );
    expect(radarDetailQueryKeys.users(session)).not.toEqual(
      radarDetailQueryKeys.users({ ...session, generation: 4 })
    );
  });

  it("loads the selected Radar and its assignment collection through their existing services", async () => {
    const queries = mountQueries(() => ({
      detail: useRadarDetailQuery(ref("radar-a")),
      assignments: useRadarAssignmentsQuery(ref("radar-a")),
    }));
    await vi.waitFor(() => expect(queries.assignments.data.value).toEqual([]));
    expect(queries.detail.data.value?.id).toBe("radar-a");
    expect(getListDetails).toHaveBeenCalledWith("radar-a", expect.any(AbortSignal));
    expect(getAsignationsByListService).toHaveBeenCalledWith("radar-a", expect.any(AbortSignal));
  });

  it("keeps detail errors as query errors instead of returning an empty Radar", async () => {
    getListDetails.mockRejectedValue(new Error("offline"));
    const query = mountQueries(() => useRadarDetailQuery(ref("radar-a")));
    await vi.waitFor(() => expect(query.isError.value).toBe(true), { timeout: 3_000 });
    expect(query.data.value).toBeUndefined();
  });

  it("separates cached detail responses by user and session generation", async () => {
    let resolveOld!: (value: { id: string; name: string; type: "week"; asignations: [] }) => void;
    getListDetails
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveOld = resolve;
        })
      )
      .mockResolvedValueOnce({ id: "radar-a", name: "New session", type: "week", asignations: [] });
    const query = mountQueries(() => useRadarDetailQuery(ref("radar-a")));
    await vi.waitFor(() => expect(getListDetails).toHaveBeenCalledOnce());
    useAuthStore().$patch({ userId: "editor-b", authSessionGeneration: 4 });
    await vi.waitFor(() => expect(query.data.value?.name).toBe("New session"));
    resolveOld({ id: "radar-a", name: "Old session", type: "week", asignations: [] });
    await flushPromises();
    expect(getListDetails).toHaveBeenCalledTimes(2);
    expect(query.data.value?.name).toBe("New session");
    expect(
      queryClient.getQueryCache().findAll({ queryKey: radarDetailQueryKeys.root })
    ).toHaveLength(2);
  });

  it("loads the weekly catalog incrementally with the civil Monday-to-Sunday date range", async () => {
    getDiscsDated.mockResolvedValueOnce({
      totalItems: 1,
      totalPages: 1,
      currentPage: 1,
      limit: RADAR_CATALOG_PAGE_SIZE,
      data: [{ releaseDate: "2026-10-09", discs: [] }],
    });
    const query = mountQueries(() =>
      useRadarDiscCatalogQuery(ref("radar-a"), ref("2026-10-12"), ref(""), ref(""))
    );
    await vi.waitFor(() => expect(query.data.value?.pages).toHaveLength(1));
    expect(getDiscsDated).toHaveBeenCalledWith(
      RADAR_CATALOG_PAGE_SIZE,
      0,
      ["2026-10-12T00:00:00.000Z", "2026-10-18T23:59:59.999Z"],
      undefined,
      expect.any(AbortSignal)
    );
    expect(query.hasNextPage.value).toBe(true);
    await query.fetchNextPage();
    expect(getDiscsDated).toHaveBeenNthCalledWith(
      2,
      RADAR_CATALOG_PAGE_SIZE,
      RADAR_CATALOG_PAGE_SIZE,
      expect.any(Array),
      undefined,
      expect.any(AbortSignal)
    );
  });

  it("loads assignable users and genres as query data", async () => {
    getRvUsers.mockResolvedValue([{ id: "editor-a", username: "Editor" }]);
    getAllGenres.mockResolvedValue([{ id: "rock", name: "Rock", color: "#123456" }]);
    const queries = mountQueries(() => ({
      users: useRadarAssignableUsersQuery(),
      genres: useRadarGenresQuery(),
    }));
    await vi.waitFor(() =>
      expect(queries.genres.data.value).toEqual([{ id: "rock", name: "Rock", color: "#123456" }])
    );
    expect(queries.users.data.value?.[0].id).toBe("editor-a");
    expect(getRvUsers).toHaveBeenCalledWith(expect.any(AbortSignal));
    expect(getAllGenres).toHaveBeenCalledWith(expect.any(AbortSignal));
  });

  it("centralizes assignment, move, removal and featured mutations and invalidates dependent queries after success", async () => {
    const session = { userId: "editor-a", generation: 3 };
    const assignmentsKey = radarDetailQueryKeys.assignments(session, "radar-a");
    const catalogKey = radarDetailQueryKeys.catalog(session, "radar-a", "2026-10-12", "", "");
    const calendarDetailsKey = [
      "editorial",
      "content-calendar",
      "deferred",
      "editor-a",
      3,
      "riffvalley",
      "list",
      "radar-a",
    ] as const;
    queryClient.setQueryData(assignmentsKey, []);
    queryClient.setQueryData(catalogKey, { pages: [], pageParams: [] });
    queryClient.setQueryData(calendarDetailsKey, { id: "radar-a" });
    const mutations = mountQueries(() => useRadarDetailMutations(ref("radar-a")));

    await mutations.assign({
      userId: "editor-a",
      discId: "disc-1",
      listId: "radar-a",
      genre: "Rock",
    });
    await mutations.updateAssignment({ id: "assignment-1", payload: { position: 3 } });
    await mutations.removeAssignment("assignment-1");
    await mutations.toggleFeatured({ discId: "disc-1", pinned: true });
    await mutations.toggleFeatured({ discId: "disc-1", pinned: false });

    expect(postAsignationService).toHaveBeenCalledWith({
      userId: "editor-a",
      discId: "disc-1",
      listId: "radar-a",
      genre: "Rock",
    });
    expect(updateAsignationService).toHaveBeenCalledWith("assignment-1", { position: 3 });
    expect(deleteAsignationService).toHaveBeenCalledWith("assignment-1");
    expect(updateDisc).toHaveBeenNthCalledWith(1, "disc-1", { pinned: true });
    expect(updateDisc).toHaveBeenNthCalledWith(2, "disc-1", { pinned: false });
    expect(queryClient.getQueryState(assignmentsKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(catalogKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(calendarDetailsKey)?.isInvalidated).toBe(true);
  });

  it("does not invalidate assignments when the assignment request fails", async () => {
    const assignmentsKey = radarDetailQueryKeys.assignments(
      { userId: "editor-a", generation: 3 },
      "radar-a"
    );
    queryClient.setQueryData(assignmentsKey, []);
    postAsignationService.mockRejectedValueOnce(new Error("conflict"));
    const mutations = mountQueries(() => useRadarDetailMutations(ref("radar-a")));

    await expect(
      mutations.assign({ userId: "editor-a", discId: "disc-1", listId: "radar-a" })
    ).rejects.toThrow("conflict");
    expect(queryClient.getQueryState(assignmentsKey)?.isInvalidated).toBe(false);
  });
});
