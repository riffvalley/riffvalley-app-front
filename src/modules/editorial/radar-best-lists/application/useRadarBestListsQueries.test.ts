// @vitest-environment happy-dom
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { computed, defineComponent, ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentMonthlyLists, getCurrentWeeklyLists, getPastMonthlyLists, getPastWeeklyLists } =
  vi.hoisted(() => ({
    getCurrentMonthlyLists: vi.fn(),
    getCurrentWeeklyLists: vi.fn(),
    getPastMonthlyLists: vi.fn(),
    getPastWeeklyLists: vi.fn(),
  }));
vi.mock("@services/list/list", () => ({
  getCurrentMonthlyLists,
  getCurrentWeeklyLists,
  getPastMonthlyLists,
  getPastWeeklyLists,
}));

import { useAuthStore } from "@/modules/identity/auth";
import {
  bestCurrentListsQueryKey,
  bestListsQueryKeyForSession,
  bestPastListsQueryKeyForSession,
  isValidListMonth,
  isValidListYear,
  radarCurrentListsQueryKey,
  radarListsQueryKeyForSession,
  radarBestListsQueryKey,
  radarPastListsQueryKeyForSession,
  useBestPastListsQuery,
  useRadarCurrentListsQuery,
  useRadarPastListsQuery,
} from "./useRadarBestListsQueries";

describe("Radar and Best Lists queries", () => {
  let queryClient: QueryClient;
  let wrapper: ReturnType<typeof mount> | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    useAuthStore().$patch({
      authStatus: "authenticated",
      token: "token",
      userId: "user-a",
      role: "riffvalley",
      authSessionGeneration: 4,
    });
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    getCurrentMonthlyLists.mockResolvedValue([]);
    getCurrentWeeklyLists.mockResolvedValue([]);
    getPastMonthlyLists.mockResolvedValue([]);
    getPastWeeklyLists.mockResolvedValue([]);
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    queryClient.clear();
  });

  function mountComposable<T>(create: () => T): T {
    let result!: T;
    wrapper = mount(
      defineComponent({
        setup() {
          result = create();
          return () => null;
        },
      }),
      {
        global: { plugins: [[VueQueryPlugin, { queryClient }]] },
      }
    );
    return result;
  }

  it("includes list type, current/past scope, requested period and session in independent keys", () => {
    const radarCurrent = radarListsQueryKeyForSession("user-a", 4);
    const radarPast = radarPastListsQueryKeyForSession(2026, 11, "user-a", 4);
    const bestCurrent = bestListsQueryKeyForSession("user-a", 4);
    const bestPast = bestPastListsQueryKeyForSession(2026, "user-a", 4);

    expect(radarCurrent.slice(0, radarCurrentListsQueryKey.length)).toEqual(
      radarCurrentListsQueryKey
    );
    expect(bestCurrent.slice(0, bestCurrentListsQueryKey.length)).toEqual(bestCurrentListsQueryKey);
    expect(radarPast).not.toEqual(radarPastListsQueryKeyForSession(2026, 10, "user-a", 4));
    expect(radarPast).not.toEqual(radarPastListsQueryKeyForSession(2026, 11, "user-b", 4));
    expect(radarPast).not.toEqual(radarPastListsQueryKeyForSession(2026, 11, "user-a", 5));
    expect(bestPast).not.toEqual(bestPastListsQueryKeyForSession(2025, "user-a", 4));
    expect(radarCurrent).not.toEqual(bestCurrent);
  });

  it("validates years and months against the existing HTTP contracts", () => {
    expect(isValidListYear(2026)).toBe(true);
    expect(isValidListYear(99)).toBe(false);
    expect(isValidListYear(275760)).toBe(false);
    expect(isValidListYear(2026.5)).toBe(false);
    expect(isValidListMonth(1)).toBe(true);
    expect(isValidListMonth(12)).toBe(true);
    expect(isValidListMonth(0)).toBe(false);
    expect(isValidListMonth(13)).toBe(false);
    expect(isValidListMonth(2.5)).toBe(false);
  });

  it("does not request an invalid period and fetches once its filters become valid", async () => {
    const year = ref(99);
    const month = ref(0);
    mountComposable(() => useRadarPastListsQuery(year, month));
    await flushPromises();
    expect(getPastWeeklyLists).not.toHaveBeenCalled();

    year.value = 2026;
    month.value = 11;
    await vi.waitFor(() => expect(getPastWeeklyLists).toHaveBeenCalledOnce());
    expect(getPastWeeklyLists).toHaveBeenCalledWith(2026, 11, expect.any(AbortSignal));
  });

  it("keeps the monthly historical query annual and blocks invalid years", async () => {
    const year = ref(2026);
    mountComposable(() => useBestPastListsQuery(year));
    await vi.waitFor(() => expect(getPastMonthlyLists).toHaveBeenCalledOnce());
    expect(getPastMonthlyLists).toHaveBeenCalledWith(2026, expect.any(AbortSignal));
    year.value = 2025;
    await vi.waitFor(() => expect(getPastMonthlyLists).toHaveBeenCalledTimes(2));
    year.value = 99;
    await flushPromises();
    expect(getPastMonthlyLists).toHaveBeenCalledTimes(2);
  });

  it("does not duplicate an annual request for simultaneous observers", async () => {
    mountComposable(() => {
      const first = useBestPastListsQuery(computed(() => 2026));
      const second = useBestPastListsQuery(computed(() => 2026));
      return { first, second };
    });
    await flushPromises();
    expect(getPastMonthlyLists).toHaveBeenCalledOnce();
  });

  it("refetches the current list after invalidation from an editorial operation", async () => {
    const query = mountComposable(() => useRadarCurrentListsQuery());
    await vi.waitFor(() => expect(query.data.value).toEqual([]));
    await queryClient.invalidateQueries({ queryKey: radarBestListsQueryKey });
    await vi.waitFor(() => expect(getCurrentWeeklyLists).toHaveBeenCalledTimes(2));
  });

  it("revalidates cached current lists when returning to a mounted view", async () => {
    const firstQuery = mountComposable(() => useRadarCurrentListsQuery());
    await vi.waitFor(() => expect(firstQuery.data.value).toEqual([]));
    wrapper?.unmount();
    wrapper = undefined;

    const returnedQuery = mountComposable(() => useRadarCurrentListsQuery());
    await vi.waitFor(() => expect(getCurrentWeeklyLists).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(returnedQuery.data.value).toEqual([]));
  });

  it("separates session cache entries and refuses a response from the prior session", async () => {
    let resolveFirst!: (value: never[]) => void;
    getCurrentWeeklyLists
      .mockReturnValueOnce(
        new Promise((done) => {
          resolveFirst = done;
        })
      )
      .mockResolvedValueOnce([]);
    const auth = useAuthStore();
    let query!: ReturnType<typeof useRadarCurrentListsQuery>;
    wrapper = mount(
      defineComponent({
        setup() {
          query = useRadarCurrentListsQuery();
          return () => null;
        },
      }),
      { global: { plugins: [[VueQueryPlugin, { queryClient }]] } }
    );
    await flushPromises();
    auth.$patch({ userId: "user-b", authSessionGeneration: 5 });
    await flushPromises();
    resolveFirst([]);
    await flushPromises();
    expect(
      queryClient.getQueryCache().findAll({ queryKey: radarCurrentListsQueryKey })
    ).toHaveLength(2);
    expect(getCurrentWeeklyLists).toHaveBeenCalledTimes(2);
    expect(query.data.value).toEqual([]);
  });
});
