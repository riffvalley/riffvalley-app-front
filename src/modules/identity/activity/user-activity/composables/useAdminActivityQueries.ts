import { computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { getGlobalActivity } from "@/modules/identity/users/api/users";
import { useAuthStore } from "@/modules/identity/auth/stores/auth";

export const adminGlobalActivityQueryKey = ["identity", "activity", "global"] as const;
export function globalActivityQueryKeyForSession(
  limit: number,
  offset: number,
  sessionUserId: string | null,
  generation: number,
) {
  return [...adminGlobalActivityQueryKey, { limit, offset }, sessionUserId, generation] as const;
}

export function useAdminActivityQueries(options: {
  limit: number;
  offset: () => number;
  enabled?: () => boolean;
}) {
  const authStore = useAuthStore();
  const isAdminSession = computed(() =>
    authStore.authStatus === "authenticated" &&
    authStore.isAuthenticated &&
    authStore.hasRole("superadmin") &&
    !!authStore.userId,
  );

  const globalQuery = useQuery({
    queryKey: computed(() => globalActivityQueryKeyForSession(
      options.limit,
      options.offset(),
      authStore.userId,
      authStore.authSessionGeneration,
    )),
    enabled: computed(() => isAdminSession.value && (options.enabled?.() ?? true)),
    queryFn: async ({ queryKey, signal }) => {
      const [, , , pagination, requestedUserId, requestedGeneration] = queryKey;
      if (!requestedUserId) throw new Error("La sesión administrativa ya no está disponible.");

      const result = await getGlobalActivity(pagination.limit, pagination.offset, signal);
      if (
        signal.aborted ||
        !isAdminSession.value ||
        authStore.userId !== requestedUserId ||
        authStore.authSessionGeneration !== requestedGeneration
      ) {
        throw new Error("La sesión cambió antes de completar la consulta.");
      }

      return result;
    },
  });

  return { globalQuery };
}
