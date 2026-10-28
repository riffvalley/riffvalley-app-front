import { computed, type Ref } from "vue";
import { useQuery, type QueryClient } from "@tanstack/vue-query";
import type { QueryFunctionContext } from "@tanstack/query-core";
import {
  getCommunityDashboardStats,
  type CommunityDashboardStatsResponse,
} from "@services/community/dashboard";
import type { UserRole } from "@/modules/identity/shared";
import { useAuthStore } from "@/modules/identity/auth";

export const communityDashboardStatsQueryKey = ["community", "dashboard-stats"] as const;
export const communityDashboardStatsStaleTime = 60_000;
export const communityDashboardStatsGcTime = 5 * 60_000;

export function communityDashboardStatsQueryKeyForSession(
  year: number,
  userId: string,
  role: UserRole,
  generation: number,
) {
  return [...communityDashboardStatsQueryKey, year, userId, role, generation] as const;
}

type CommunityDashboardStatsQueryKey = ReturnType<typeof communityDashboardStatsQueryKeyForSession>;

async function fetchCommunityDashboardStats({
  queryKey,
  signal,
}: QueryFunctionContext<CommunityDashboardStatsQueryKey>): Promise<CommunityDashboardStatsResponse> {
  const year = queryKey[2];
  const result = await getCommunityDashboardStats(year, signal);
  if (result.year !== year) {
    throw new Error("El año de las estadísticas no coincide con el solicitado.");
  }
  return result;
}

export function useCommunityDashboardStatsQuery(year: Ref<number>, enabled: Ref<boolean>) {
  const authStore = useAuthStore();
  const hasSession = computed(
    () => authStore.authStatus === "authenticated" && !!authStore.userId && !!authStore.role,
  );
  const queryKey = computed(() => communityDashboardStatsQueryKeyForSession(
    year.value,
    authStore.userId ?? "",
    authStore.role ?? "user",
    authStore.authSessionGeneration,
  ));

  return useQuery({
    queryKey,
    queryFn: fetchCommunityDashboardStats,
    enabled: computed(() => enabled.value && hasSession.value),
    staleTime: communityDashboardStatsStaleTime,
    gcTime: communityDashboardStatsGcTime,
    refetchInterval: false,
  });
}

export async function prefetchCommunityDashboardStats(
  client: QueryClient,
  year: number,
  session: { userId: string; role: UserRole; generation: number },
): Promise<void> {
  const queryKey = communityDashboardStatsQueryKeyForSession(
    year,
    session.userId,
    session.role,
    session.generation,
  );
  const state = client.getQueryState(queryKey);
  if (
    state?.data !== undefined &&
    !state.isInvalidated &&
    Date.now() - state.dataUpdatedAt < communityDashboardStatsStaleTime
  ) {
    return;
  }

  await client.prefetchQuery({
    queryKey,
    queryFn: fetchCommunityDashboardStats,
    staleTime: communityDashboardStatsStaleTime,
    gcTime: communityDashboardStatsGcTime,
  });
}
