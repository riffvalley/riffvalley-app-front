// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, ref } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";

const { getStatisticsSummary, getStatisticsRatedDiscs } = vi.hoisted(() => ({
  getStatisticsSummary: vi.fn(),
  getStatisticsRatedDiscs: vi.fn(),
}));
vi.mock("../api/statisticsApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/statisticsApi")>()),
  getStatisticsSummary,
  getStatisticsRatedDiscs,
}));

import { useAuthStore } from "@/modules/identity/auth";
import {
  statisticsGalaxyQueryKeyForSession,
  statisticsSummaryQueryKeyForSession,
  useStatisticsGalaxyQuery,
  useStatisticsSummaryQuery,
} from "./useStatisticsQueries";
import { useStatisticsFilters } from "./statisticsFilters";

describe("Statistics TanStack Query", () => {
  let queryClient: QueryClient;
  let wrapper: ReturnType<typeof mount> | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    useAuthStore().$patch({
      authStatus: "authenticated", token: "token", userId: "user-a", username: "user-a",
      role: "riffvalley", authSessionGeneration: 4,
    });
    const filters = useStatisticsFilters();
    filters.timeZone.value = "UTC";
    filters.setYear(filters.currentYear.value);
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    queryClient.clear();
    vi.useRealTimers();
  });

  function mountComposable<T>(create: () => T): T {
    let result!: T;
    wrapper = mount(defineComponent({ setup() { result = create(); return () => null; } }), {
      global: { plugins: [[VueQueryPlugin, { queryClient }]] },
    });
    return result;
  }

  it("isolates keys by year, timezone, user and session generation", () => {
    const base = { year: 2026, timeZone: "UTC" };
    const key = statisticsSummaryQueryKeyForSession(base, "user-a", 4);
    expect(key).not.toEqual(statisticsSummaryQueryKeyForSession({ ...base, year: 2025 }, "user-a", 4));
    expect(key).not.toEqual(statisticsSummaryQueryKeyForSession({ ...base, timeZone: "Europe/Madrid" }, "user-a", 4));
    expect(key).not.toEqual(statisticsSummaryQueryKeyForSession(base, "user-b", 4));
    expect(key).not.toEqual(statisticsSummaryQueryKeyForSession(base, "user-a", 5));
    expect(statisticsGalaxyQueryKeyForSession(base, "user-a", 4)).toContain("galaxy");
  });

  it("loads the summary and keeps nullable backend values without legacy fields", async () => {
    const filters = useStatisticsFilters();
    const summary = {
      year: filters.year.value, timeZone: filters.timeZone.value, activityBasis: "rate_created_at_estimate", activityCoverage: "unknown",
      activityCount: 0, scoredDiscs: 0, mean: null, median: null, standardDeviation: null, activityByGenre: [], activityByMonth: [],
      scoreDistribution: [], topDiscOverall: null, mostControversial: [], activityByDay: [], activityWithoutGenre: 0,
    } as const;
    getStatisticsSummary.mockResolvedValue(summary);
    const query = mountComposable(() => useStatisticsSummaryQuery());
    await vi.waitFor(() => expect(query.data.value).toEqual(summary));
    expect(query.isEmpty.value).toBe(true);
    expect(query.data.value?.mean).toBeNull();
    for (const legacyField of ["yearOverYear", "rank", "totalUsers", "weeks"]) {
      expect(legacyField in (query.data.value ?? {})).toBe(false);
    }
    expect(getStatisticsSummary).toHaveBeenCalledWith(
      { year: filters.year.value, timeZone: filters.timeZone.value },
      expect.any(AbortSignal),
    );
  });

  it.each(["year", "time zone"] as const)("treats a summary for a different %s as a contract error, not an empty response", async (mismatch) => {
    const filters = useStatisticsFilters();
    filters.setYear(filters.currentYear.value);
    const requestedYear = filters.year.value;
    const requestedTimeZone = filters.timeZone.value;
    const responseYear = mismatch === "year" ? requestedYear - 1 : requestedYear;
    const alternateTimeZone = requestedTimeZone === "UTC" ? "Europe/Madrid" : "UTC";
    const responseTimeZone = mismatch === "time zone" ? alternateTimeZone : requestedTimeZone;
    getStatisticsSummary.mockResolvedValue({
      year: responseYear,
      timeZone: responseTimeZone,
      activityBasis: "rate_created_at_estimate",
      activityCoverage: "unknown",
      activityCount: 0,
      scoredDiscs: 0,
      mean: null,
      median: null,
      standardDeviation: null,
      activityByGenre: [],
      activityByMonth: [],
      scoreDistribution: [],
      topDiscOverall: null,
      mostControversial: [],
      activityByDay: [],
      activityWithoutGenre: 0,
    });

    const query = mountComposable(() => useStatisticsSummaryQuery());
    await vi.waitFor(() => expect(getStatisticsSummary).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(query.isError.value).toBe(true), { timeout: 3000 });

    expect(query.isEmpty.value).toBe(false);
    expect(query.error.value).toMatchObject({ message: expect.stringContaining("does not match") });
  });

  it("refetches the shared summary selection under a new year key", async () => {
    getStatisticsSummary.mockImplementation(async ({ year, timeZone }) => ({
      year, timeZone, activityBasis: "rate_created_at_estimate", activityCoverage: "unknown",
      activityCount: 1, scoredDiscs: 1, mean: 7, median: 7, standardDeviation: 0, activityByGenre: [], activityByMonth: [],
      scoreDistribution: [], topDiscOverall: null, mostControversial: [], activityByDay: [], activityWithoutGenre: 0,
    }));
    const filters = useStatisticsFilters();
    filters.setYear(filters.currentYear.value);
    const query = mountComposable(() => useStatisticsSummaryQuery());
    await vi.waitFor(() => expect(getStatisticsSummary).toHaveBeenCalledOnce());

    filters.setYear(2025);
    await vi.waitFor(() => expect(getStatisticsSummary).toHaveBeenCalledTimes(2));
    expect(query.data.value?.year).toBe(2025);
    expect(getStatisticsSummary).toHaveBeenLastCalledWith(
      { year: 2025, timeZone: filters.timeZone.value },
      expect.any(AbortSignal),
    );
  });

  it("keeps the galaxy disabled until activated, then loads an empty response independently", async () => {
    getStatisticsRatedDiscs.mockResolvedValue([]);
    const open = ref(false);
    const query = mountComposable(() => useStatisticsGalaxyQuery(() => open.value));
    await flushPromises();
    expect(query.isEnabled.value).toBe(false);
    expect(getStatisticsRatedDiscs).not.toHaveBeenCalled();

    open.value = true;
    await vi.waitFor(() => expect(getStatisticsRatedDiscs).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(query.isEmpty.value).toBe(true));
    expect(query.data.value).toEqual([]);
  });

  it("reports a galaxy failure separately and preserves the error", async () => {
    const error = new Error("galaxy unavailable");
    getStatisticsRatedDiscs.mockRejectedValue(error);
    const query = mountComposable(() => useStatisticsGalaxyQuery(() => true));
    await vi.waitFor(() => expect(query.isError.value).toBe(true), { timeout: 3000 });
    expect(query.error.value).toBe(error);
    expect(getStatisticsSummary).not.toHaveBeenCalled();
  });

  it("cancels an in-flight galaxy request when its visualization closes", async () => {
    let requestSignal: AbortSignal | undefined;
    getStatisticsRatedDiscs.mockImplementation((_params, signal: AbortSignal) => {
      requestSignal = signal;
      return new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
      });
    });
    const open = ref(true);
    mountComposable(() => useStatisticsGalaxyQuery(() => open.value));
    await vi.waitFor(() => expect(getStatisticsRatedDiscs).toHaveBeenCalledOnce());
    expect(requestSignal?.aborted).toBe(false);

    open.value = false;
    await vi.waitFor(() => expect(requestSignal?.aborted).toBe(true));
  });

  it("switches the active galaxy query to the selected year without exposing prior-year data", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-29T12:00:00Z"));
    const filters = useStatisticsFilters();
    const currentYear = 2026;
    const previousYear = currentYear - 1;
    filters.setYear(currentYear);
    let resolvePreviousYear!: (discs: { id: string; name: string; rate: number; artist: null; genre: null }[]) => void;
    getStatisticsRatedDiscs.mockImplementation(({ year }) => {
      if (year === previousYear) return new Promise((resolve) => { resolvePreviousYear = resolve; });
      return Promise.resolve([{ id: `disc-${currentYear}`, name: String(currentYear), rate: 8, artist: null, genre: null }]);
    });
    const open = ref(true);
    const query = mountComposable(() => useStatisticsGalaxyQuery(() => open.value));
    await vi.waitFor(() => expect(query.data.value?.[0]?.id).toBe(`disc-${currentYear}`));

    filters.setYear(previousYear);
    expect(filters.year.value).toBe(previousYear);
    await vi.waitFor(() => expect(getStatisticsRatedDiscs).toHaveBeenCalledTimes(2));
    expect(query.data.value).toBeUndefined();
    expect(getStatisticsRatedDiscs.mock.calls[1]?.[0]).toEqual({ year: previousYear, timeZone: filters.timeZone.value });

    resolvePreviousYear([{ id: `disc-${previousYear}`, name: String(previousYear), rate: 7, artist: null, genre: null }]);
    await vi.waitFor(() => expect(query.data.value?.[0]?.id).toBe(`disc-${previousYear}`));
  });
});
