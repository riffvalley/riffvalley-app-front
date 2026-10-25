import { computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { getUsers } from "@/modules/identity/api/users";
import { useAuthStore } from "@/modules/identity/stores/auth";

export const adminUsersQueryKey = ["identity", "users", "admin-list"] as const;

export function adminUsersQueryKeyForSession(userId: string | null, generation: number) {
  return [...adminUsersQueryKey, userId, generation] as const;
}

export function useAdminUsersQuery() {
  const authStore = useAuthStore();

  return useQuery({
    queryKey: computed(() => adminUsersQueryKeyForSession(authStore.userId, authStore.authSessionGeneration)),
    enabled: computed(() =>
      authStore.authStatus === "authenticated" &&
      authStore.isAuthenticated &&
      authStore.hasRole("superadmin"),
    ),
    queryFn: async ({ signal }) => {
      const requestedUserId = authStore.userId;
      const requestedGeneration = authStore.authSessionGeneration;
      if (!requestedUserId) throw new Error("La sesión administrativa ya no está disponible.");

      const users = await getUsers(signal);
      if (
        signal.aborted ||
        authStore.authStatus !== "authenticated" ||
        authStore.userId !== requestedUserId ||
        authStore.authSessionGeneration !== requestedGeneration
      ) {
        throw new Error("La sesión cambió antes de completar la consulta.");
      }

      return users;
    },
  });
}
