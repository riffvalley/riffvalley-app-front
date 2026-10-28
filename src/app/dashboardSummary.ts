import { computed } from "vue";
import { useQuery, type QueryClient } from "@tanstack/vue-query";
import api from "@services/api/api";
import { useAuthStore } from "@/modules/identity/auth";
import type { UserRole } from "@/modules/identity/shared";

export interface DashboardSummary {
  personal: {
    totalRatedDiscs: number;
    totalExploredGenres: number;
    totalActiveDays: number;
    currentStreak: number | null;
    year: {
      ratedDiscs: number | null;
      exploredGenres: number | null;
      activeDays: number;
    };
    month: {
      ratedDiscs: number | null;
      exploredGenres: number | null;
      activeDays: number | null;
    };
  };
  catalog: {
    totalDiscs: number;
    discsThisYear: number;
    discsThisMonth: number;
  };
}

export const dashboardSummaryQueryKey = ["app", "dashboard-summary"] as const;

export function dashboardSummaryQueryKeyForSession(
  userId: string,
  role: UserRole,
  generation: number
) {
  return [...dashboardSummaryQueryKey, userId, role, generation] as const;
}

export async function getDashboardSummary(signal?: AbortSignal): Promise<DashboardSummary> {
  const response = await api.get<DashboardSummary>("/app/dashboard-summary", { signal });
  return response.data;
}

export function useDashboardSummaryQuery() {
  const authStore = useAuthStore();
  const enabled = computed(
    () => authStore.isAuthenticated && !!authStore.userId && !!authStore.role
  );
  const queryKey = computed(() =>
    dashboardSummaryQueryKeyForSession(
      authStore.userId ?? "",
      authStore.role ?? "user",
      authStore.authSessionGeneration
    )
  );

  return useQuery({
    queryKey,
    queryFn: ({ signal }) => getDashboardSummary(signal),
    enabled,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchInterval: false,
  });
}

export function invalidateDashboardSummary(client: QueryClient): Promise<void> {
  return client.invalidateQueries({ queryKey: dashboardSummaryQueryKey });
}

export async function mutateAndInvalidateDashboardSummary<T>(
  client: QueryClient,
  mutation: () => Promise<T>,
  shouldInvalidate = true
): Promise<T> {
  const result = await mutation();
  if (shouldInvalidate) await invalidateDashboardSummary(client);
  return result;
}

/** Neutral presentation for unknown coverage; zero remains a measured value. */
export function formatDashboardSummaryValue(value: number | null): string {
  return value === null ? "Sin datos históricos" : String(value);
}
