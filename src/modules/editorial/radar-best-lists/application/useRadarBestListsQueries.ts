import { computed, type MaybeRefOrGetter, toValue } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { useAuthStore } from "@/modules/identity/auth";
import {
  getCurrentMonthlyLists,
  getCurrentWeeklyLists,
  getPastMonthlyLists,
  getPastWeeklyLists,
} from "@services/list/list";

export const radarBestListsQueryKey = ["editorial", "radar-best-lists"] as const;
export const radarCurrentListsQueryKey = [...radarBestListsQueryKey, "radar", "current"] as const;
export const radarPastListsQueryKey = [...radarBestListsQueryKey, "radar", "past"] as const;
export const bestCurrentListsQueryKey = [...radarBestListsQueryKey, "best", "current"] as const;
export const bestPastListsQueryKey = [...radarBestListsQueryKey, "best", "past"] as const;

export function radarListsQueryKeyForSession(userId: string | null, generation: number) {
  return [...radarCurrentListsQueryKey, userId, generation] as const;
}

export function radarPastListsQueryKeyForSession(
  year: number,
  month: number,
  userId: string | null,
  generation: number
) {
  return [...radarPastListsQueryKey, year, month, userId, generation] as const;
}

export function bestListsQueryKeyForSession(userId: string | null, generation: number) {
  return [...bestCurrentListsQueryKey, userId, generation] as const;
}

export function bestPastListsQueryKeyForSession(
  year: number,
  userId: string | null,
  generation: number
) {
  return [...bestPastListsQueryKey, year, userId, generation] as const;
}

export function isValidListYear(year: number): boolean {
  return Number.isInteger(year) && year >= 100 && year <= 275759;
}

export function isValidListMonth(month: number): boolean {
  return Number.isInteger(month) && month >= 1 && month <= 12;
}

function isAuthenticated(auth: ReturnType<typeof useAuthStore>): boolean {
  return auth.authStatus === "authenticated" && auth.isAuthenticated && Boolean(auth.userId);
}

function assertSession(
  auth: ReturnType<typeof useAuthStore>,
  userId: string | null,
  generation: number,
  signal: AbortSignal
): asserts userId is string {
  if (
    signal.aborted ||
    !userId ||
    !isAuthenticated(auth) ||
    auth.userId !== userId ||
    auth.authSessionGeneration !== generation
  ) {
    throw new Error("La sesión cambió antes de completar la consulta de Lists.");
  }
}

function useListsQuery<T>(
  queryKey: MaybeRefOrGetter<readonly unknown[]>,
  enabled: MaybeRefOrGetter<boolean>,
  load: (key: readonly unknown[], signal: AbortSignal) => Promise<T>
) {
  const auth = useAuthStore();
  return useQuery({
    queryKey: computed(() => toValue(queryKey)),
    enabled: computed(() => toValue(enabled) && isAuthenticated(auth)),
    staleTime: 0,
    retry: 1,
    queryFn: async ({ queryKey: requestedKey, signal }) => {
      const userId = requestedKey[requestedKey.length - 2] as string | null;
      const generation = requestedKey[requestedKey.length - 1] as number;
      assertSession(auth, userId, generation, signal);
      const lists = await load(requestedKey, signal);
      assertSession(auth, userId, generation, signal);
      return lists;
    },
  });
}

export function useRadarCurrentListsQuery() {
  const auth = useAuthStore();
  return useListsQuery(
    computed(() => radarListsQueryKeyForSession(auth.userId, auth.authSessionGeneration)),
    true,
    (_key, signal) => getCurrentWeeklyLists(signal)
  );
}

export function useRadarPastListsQuery(
  year: MaybeRefOrGetter<number>,
  month: MaybeRefOrGetter<number>
) {
  const auth = useAuthStore();
  const period = computed(() => ({ year: toValue(year), month: toValue(month) }));
  const isValid = computed(
    () => isValidListYear(period.value.year) && isValidListMonth(period.value.month)
  );
  const queryKey = computed(() =>
    radarPastListsQueryKeyForSession(
      period.value.year,
      period.value.month,
      auth.userId,
      auth.authSessionGeneration
    )
  );
  return useListsQuery(queryKey, isValid, (key, signal) =>
    getPastWeeklyLists(key[4] as number, key[5] as number, signal)
  );
}

export function useBestCurrentListsQuery() {
  const auth = useAuthStore();
  return useListsQuery(
    computed(() => bestListsQueryKeyForSession(auth.userId, auth.authSessionGeneration)),
    true,
    (_key, signal) => getCurrentMonthlyLists(signal)
  );
}

export function useBestPastListsQuery(year: MaybeRefOrGetter<number>) {
  const auth = useAuthStore();
  const selectedYear = computed(() => toValue(year));
  const isValid = computed(() => isValidListYear(selectedYear.value));
  const queryKey = computed(() =>
    bestPastListsQueryKeyForSession(selectedYear.value, auth.userId, auth.authSessionGeneration)
  );
  return useListsQuery(queryKey, isValid, (key, signal) =>
    getPastMonthlyLists(key[4] as number, signal)
  );
}
