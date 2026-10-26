import { computed } from "vue";
import { useQuery, type QueryClient } from "@tanstack/vue-query";
import api from "@services/api/api";
import { useAuthStore } from "@/modules/identity/auth";
import type { UserRole } from "@/modules/identity/shared";

export interface SidebarSummary {
  version: { latest: string | null };
  petitions?: { pending: number };
  suggestions?: { inProgressIds: string[] };
}

export const sidebarSummaryQueryKey = ["app", "sidebar-summary"] as const;

export function sidebarSummaryQueryKeyForSession(
  userId: string,
  role: UserRole,
  generation: number,
) {
  return [...sidebarSummaryQueryKey, userId, role, generation] as const;
}

export async function getSidebarSummary(signal?: AbortSignal): Promise<SidebarSummary> {
  const response = await api.get<SidebarSummary>("/app/sidebar-summary", { signal });
  return response.data;
}

export function useSidebarSummaryQuery() {
  const authStore = useAuthStore();
  const enabled = computed(() =>
    authStore.isAuthenticated && !!authStore.userId && !!authStore.role,
  );
  const queryKey = computed(() => sidebarSummaryQueryKeyForSession(
    authStore.userId ?? "",
    authStore.role ?? "user",
    authStore.authSessionGeneration,
  ));

  return useQuery({
    queryKey,
    queryFn: ({ signal }) => getSidebarSummary(signal),
    enabled,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchInterval: false,
  });
}

export function invalidateSidebarSummary(client: QueryClient): Promise<void> {
  return client.invalidateQueries({ queryKey: sidebarSummaryQueryKey });
}

export async function mutateAndInvalidateSidebarSummary<T>(
  client: QueryClient,
  mutation: () => Promise<T>,
): Promise<T> {
  const result = await mutation();
  await invalidateSidebarSummary(client);
  return result;
}
