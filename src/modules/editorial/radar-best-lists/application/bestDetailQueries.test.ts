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
  getRatesByUser,
} = vi.hoisted(() => ({
  getListDetails: vi.fn(),
  getAsignationsByListService: vi.fn(),
  getDiscsDated: vi.fn(),
  getRvUsers: vi.fn(),
  getAllGenres: vi.fn(),
  getRatesByUser: vi.fn(),
}));
vi.mock("@services/list/list", () => ({ getListDetails }));
vi.mock("@services/asignation/asignation", () => ({ getAsignationsByListService }));
vi.mock("@services/discs/discs", () => ({ getDiscsDated }));
vi.mock("@/modules/identity/users", () => ({ getRvUsers }));
vi.mock("@services/genres/genres", () => ({ getAllGenres }));
vi.mock("@services/rates/rates", () => ({ getRatesByUser }));

import { useAuthStore } from "@/modules/identity/auth";
import {
  BEST_CATALOG_PAGE_SIZE,
  bestDetailQueryKeys,
  flattenBestCatalogPages,
  getBestMonthRange,
  useBestAssignmentsQuery,
  useBestDetailQuery,
  useBestDiscCatalogQuery,
  useBestGenresQuery,
  useBestAssignableUsersQuery,
  useBestVotesQuery,
} from "./bestDetailQueries";

describe("Best detail queries", () => {
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
      token: "token",
      userId: "editor-a",
      role: "riffvalley",
      authSessionGeneration: 4,
    });
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    getListDetails.mockResolvedValue({
      id: "best-a",
      name: "Best",
      type: "month",
      asignations: [],
    });
    getAsignationsByListService.mockResolvedValue([]);
    getRvUsers.mockResolvedValue([]);
    getAllGenres.mockResolvedValue([]);
    getRatesByUser.mockResolvedValue({ data: [] });
    getDiscsDated.mockResolvedValue({
      data: [],
      totalItems: 0,
      totalPages: 0,
      currentPage: 1,
      limit: BEST_CATALOG_PAGE_SIZE,
    });
  });
  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    queryClient.clear();
  });
  function mountQuery<T>(setup: () => T): T {
    let result!: T;
    wrapper = mount(
      defineComponent({
        setup() {
          result = setup();
          return () => null;
        },
      }),
      { global: { plugins: [pinia, [VueQueryPlugin, { queryClient }]] } }
    );
    return result;
  }

  it("scopes query keys by type, list, period, user and session generation", () => {
    const session = { userId: "editor-a", generation: 4 };
    expect(bestDetailQueryKeys.list(session, "best-a")).not.toEqual(
      bestDetailQueryKeys.list({ userId: "editor-b", generation: 5 }, "best-a")
    );
    expect(bestDetailQueryKeys.assignments(session, "best-a")).not.toEqual(
      bestDetailQueryKeys.assignments(session, "best-b")
    );
    expect(bestDetailQueryKeys.catalog(session, "best-a", "2026-10-01")).not.toEqual(
      bestDetailQueryKeys.catalog(session, "best-a", "2026-11-01")
    );
    expect(bestDetailQueryKeys.votes(session, "2026-10-01")).not.toEqual(
      bestDetailQueryKeys.votes(session, "2026-11-01")
    );
    expect(bestDetailQueryKeys.users(session)).not.toEqual(
      bestDetailQueryKeys.users({ ...session, generation: 5 })
    );
  });

  it("uses complete UTC month boundaries including leap-year dates", () => {
    const range = getBestMonthRange("2024-02-21T14:00:00.000Z");
    expect(range?.start.toISOString()).toBe("2024-02-01T00:00:00.000Z");
    expect(range?.end.toISOString()).toBe("2024-02-29T23:59:59.999Z");
    expect(getBestMonthRange("invalid")).toBeNull();
  });

  it("loads detail, assignments, users, genres and the monthly votes through Query", async () => {
    const result = mountQuery(() => ({
      detail: useBestDetailQuery("best-a"),
      assignments: useBestAssignmentsQuery("best-a"),
      users: useBestAssignableUsersQuery(),
      genres: useBestGenresQuery(),
      votes: useBestVotesQuery("2026-10-01"),
    }));
    await flushPromises();
    expect(result.detail.data.value?.id).toBe("best-a");
    expect(result.assignments.data.value).toEqual([]);
    expect(getListDetails).toHaveBeenCalledWith("best-a", expect.any(AbortSignal));
    expect(getAsignationsByListService).toHaveBeenCalledWith("best-a", expect.any(AbortSignal));
    expect(getRvUsers).toHaveBeenCalledWith(expect.any(AbortSignal));
    expect(getAllGenres).toHaveBeenCalledWith(expect.any(AbortSignal));
    expect(getRatesByUser).toHaveBeenCalledWith(
      500,
      0,
      undefined,
      ["2026-10-01T00:00:00.000Z", "2026-10-31T23:59:59.999Z"],
      undefined,
      undefined,
      "rate",
      "rate.rate:DESC,artist.name:ASC",
      expect.any(AbortSignal)
    );
    wrapper?.unmount();
    wrapper = undefined;
  });

  it("uses backend page metadata for offsets and deduplicates groups/discs", async () => {
    const firstDisc = { id: "d-1", name: "First" } as never;
    const duplicateDisc = { id: "d-1", name: "First duplicate" } as never;
    const secondDisc = { id: "d-2", name: "Second" } as never;
    getDiscsDated
      .mockResolvedValueOnce({
        data: [{ releaseDate: "2026-10-03T00:00:00.000Z", discs: [firstDisc] }],
        totalItems: 2,
        totalPages: 3,
        currentPage: 1,
        limit: BEST_CATALOG_PAGE_SIZE,
      })
      .mockResolvedValueOnce({
        data: [{ releaseDate: "2026-10-03T00:00:00.000Z", discs: [duplicateDisc, secondDisc] }],
        totalItems: 2,
        totalPages: 3,
        currentPage: 2,
        limit: BEST_CATALOG_PAGE_SIZE,
      })
      .mockResolvedValueOnce({
        data: [],
        totalItems: 2,
        totalPages: 3,
        currentPage: 3,
        limit: BEST_CATALOG_PAGE_SIZE,
      });
    const query = mountQuery(() => useBestDiscCatalogQuery("best-a", "2026-10-01"));
    await flushPromises();
    expect(getDiscsDated).toHaveBeenNthCalledWith(
      1,
      BEST_CATALOG_PAGE_SIZE,
      0,
      ["2026-10-01T00:00:00.000Z", "2026-10-31T23:59:59.999Z"],
      undefined,
      expect.any(AbortSignal)
    );
    expect(query.hasNextPage.value).toBe(true);
    await query.fetchNextPage();
    await flushPromises();
    expect(getDiscsDated).toHaveBeenNthCalledWith(
      2,
      BEST_CATALOG_PAGE_SIZE,
      BEST_CATALOG_PAGE_SIZE,
      ["2026-10-01T00:00:00.000Z", "2026-10-31T23:59:59.999Z"],
      undefined,
      expect.any(AbortSignal)
    );
    const groups = flattenBestCatalogPages(query.data.value?.pages);
    expect(groups).toHaveLength(1);
    expect(groups[0].discs.map((disc) => disc.id)).toEqual(["d-1", "d-2"]);
    expect(query.hasNextPage.value).toBe(true);
    await query.fetchNextPage();
    await flushPromises();
    expect(getDiscsDated).toHaveBeenNthCalledWith(
      3,
      BEST_CATALOG_PAGE_SIZE,
      BEST_CATALOG_PAGE_SIZE * 2,
      ["2026-10-01T00:00:00.000Z", "2026-10-31T23:59:59.999Z"],
      undefined,
      expect.any(AbortSignal)
    );
    expect(query.hasNextPage.value).toBe(false);
  });

  it("waits to load votes and the catalog until their tab becomes active", async () => {
    const votesActive = ref(false);
    const catalogActive = ref(false);
    const queries = mountQuery(() => ({
      votes: useBestVotesQuery("2026-10-01", votesActive),
      catalog: useBestDiscCatalogQuery("best-a", "2026-10-01", catalogActive),
    }));
    await flushPromises();
    expect(getRatesByUser).not.toHaveBeenCalled();
    expect(getDiscsDated).not.toHaveBeenCalled();

    votesActive.value = true;
    await flushPromises();
    expect(getRatesByUser).toHaveBeenCalledTimes(1);
    expect(getDiscsDated).not.toHaveBeenCalled();

    catalogActive.value = true;
    await flushPromises();
    expect(getDiscsDated).toHaveBeenCalledTimes(1);
    wrapper?.unmount();
    wrapper = undefined;
    expect(queries.votes.data.value).toEqual([]);
  });

  it("stops catalog pagination when the backend repeats a page without new discs", async () => {
    const repeatedDisc = { id: "same-disc", name: "Repeated" } as never;
    getDiscsDated.mockResolvedValue({
      data: [{ releaseDate: "2026-10-03T00:00:00.000Z", discs: [repeatedDisc] }],
      totalItems: 150,
      totalPages: 3,
      currentPage: 1,
      limit: BEST_CATALOG_PAGE_SIZE,
    });
    const query = mountQuery(() => useBestDiscCatalogQuery("best-a", "2026-10-01"));
    await flushPromises();
    expect(query.hasNextPage.value).toBe(true);

    await query.fetchNextPage();
    await flushPromises();
    expect(query.hasNextPage.value).toBe(false);
  });

  it("keeps local filter state out of the server catalog identity", async () => {
    const catalogQuery = mountQuery(() => useBestDiscCatalogQuery("best-a", "2026-10-01"));
    await flushPromises();
    expect(getDiscsDated).toHaveBeenCalledTimes(1);
    expect(catalogQuery.queryKey.value).toEqual(
      bestDetailQueryKeys.catalog({ userId: "editor-a", generation: 4 }, "best-a", "2026-10-01")
    );
  });
});
