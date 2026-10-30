import { computed, watch } from "vue";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { useAuthStore } from "@/modules/identity/auth";
import { getStatisticsRatedDiscs, getStatisticsSummary } from "../api/statisticsApi";
import { useStatisticsFilters } from "./statisticsFilters";
import type { StatisticsQueryParams } from "../types/statistics";

export const statisticsQueryKey = ["statistics"] as const;
export const statisticsSummaryQueryKey = [...statisticsQueryKey, "summary"] as const;
export const statisticsGalaxyQueryKey = [...statisticsQueryKey, "galaxy"] as const;

export function statisticsSummaryQueryKeyForSession(
  params: StatisticsQueryParams,
  userId: string | null,
  generation: number,
) {
  return [...statisticsSummaryQueryKey, params.year, params.timeZone, userId, generation] as const;
}

export function statisticsGalaxyQueryKeyForSession(
  params: StatisticsQueryParams,
  userId: string | null,
  generation: number,
) {
  return [...statisticsGalaxyQueryKey, params.year, params.timeZone, userId, generation] as const;
}

function isCurrentSession(
  auth: ReturnType<typeof useAuthStore>,
  userId: string | null,
  generation: number,
): boolean {
  return auth.authStatus === "authenticated"
    && auth.isAuthenticated
    && !!userId
    && auth.userId === userId
    && auth.authSessionGeneration === generation;
}

function assertCurrentSession(
  auth: ReturnType<typeof useAuthStore>,
  userId: string | null,
  generation: number,
  signal: AbortSignal,
): asserts userId is string {
  if (signal.aborted || !isCurrentSession(auth, userId, generation)) {
    throw new Error("The statistics request belongs to an expired session.");
  }
}

export function useStatisticsSummaryQuery() {
  const auth = useAuthStore();
  const filters = useStatisticsFilters();
  const params = computed(() => ({ year: filters.year.value, timeZone: filters.timeZone.value }));
  const validParams = computed(() => filters.isYearValid() && !!filters.timeZone.value);
  const queryKey = computed(() => statisticsSummaryQueryKeyForSession(
    params.value,
    auth.userId,
    auth.authSessionGeneration,
  ));

  const query = useQuery({
    queryKey,
    enabled: computed(() => auth.authStatus === "authenticated" && auth.isAuthenticated && validParams.value),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    queryFn: async ({ queryKey: requestedKey, signal }) => {
      const [, , year, timeZone, userId, generation] = requestedKey;
      assertCurrentSession(auth, userId, generation, signal);
      const data = await getStatisticsSummary({ year, timeZone }, signal);
      assertCurrentSession(auth, userId, generation, signal);
      if (data.year !== year || data.timeZone !== timeZone) {
        throw new Error("The statistics response does not match the requested year and time zone.");
      }
      return data;
    },
  });

  return {
    ...query,
    isInitialLoading: computed(() => query.isPending.value && !query.data.value),
    isEmpty: computed(() => !query.isPending.value && !query.isError.value && query.data.value?.activityCount === 0),
    isEnabled: computed(() => validParams.value && auth.isAuthenticated),
  };
}

export function useStatisticsGalaxyQuery(enabled: () => boolean = () => false) {
  const auth = useAuthStore();
  const queryClient = useQueryClient();
  const filters = useStatisticsFilters();
  const params = computed(() => ({ year: filters.year.value, timeZone: filters.timeZone.value }));
  const validParams = computed(() => filters.isYearValid() && !!filters.timeZone.value);
  const queryKey = computed(() => statisticsGalaxyQueryKeyForSession(
    params.value,
    auth.userId,
    auth.authSessionGeneration,
  ));
  const isEnabled = computed(() =>
    enabled()
      && validParams.value
      && auth.authStatus === "authenticated"
      && auth.isAuthenticated
      && !!auth.userId,
  );

  watch(isEnabled, (active, wasActive) => {
    if (wasActive && !active) {
      void queryClient.cancelQueries({ queryKey: queryKey.value, exact: true });
    }
  }, { flush: "sync" });

  const query = useQuery({
    queryKey,
    enabled: isEnabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    queryFn: async ({ queryKey: requestedKey, signal }) => {
      const [, , year, timeZone, userId, generation] = requestedKey;
      assertCurrentSession(auth, userId, generation, signal);
      const discs = await getStatisticsRatedDiscs({ year, timeZone }, signal);
      assertCurrentSession(auth, userId, generation, signal);
      return discs;
    },
  });

  return {
    ...query,
    isEnabled,
    isInitialLoading: computed(() => isEnabled.value && query.isPending.value && !query.data.value),
    isEmpty: computed(() => !query.isPending.value && !query.isError.value && query.data.value?.length === 0),
  };
}
