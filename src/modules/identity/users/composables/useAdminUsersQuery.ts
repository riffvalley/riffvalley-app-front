import { computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { getUsers } from "@/modules/identity/users/api/users";
import { useAuthStore } from "@/modules/identity/auth";

export const adminUsersQueryKey = ["identity", "users", "admin-list"] as const;

export function adminUsersQueryKeyForSession(userId: string | null, generation: number) {
  return [...adminUsersQueryKey, userId, generation] as const;
}

export function useAdminUsersQuery() {
  const authStore = useAuthStore();

  const canManageUsers = (userId: string | null, generation: number): boolean =>
    authStore.authStatus === "authenticated" &&
    authStore.isAuthenticated &&
    authStore.hasRole("superadmin") &&
    authStore.userId === userId &&
    authStore.authSessionGeneration === generation;

  return useQuery({
    queryKey: computed(() =>
      adminUsersQueryKeyForSession(authStore.userId, authStore.authSessionGeneration)
    ),
    enabled: computed(
      () =>
        authStore.authStatus === "authenticated" &&
        authStore.isAuthenticated &&
        authStore.hasRole("superadmin")
    ),
    queryFn: async ({ signal }) => {
      const requestedUserId = authStore.userId;
      const requestedGeneration = authStore.authSessionGeneration;
      if (!requestedUserId || !canManageUsers(requestedUserId, requestedGeneration)) {
        throw new Error("La sesión administrativa ya no está disponible.");
      }

      const users = await getUsers(signal);
      if (signal.aborted || !canManageUsers(requestedUserId, requestedGeneration)) {
        throw new Error("La sesión o los permisos cambiaron antes de completar la consulta.");
      }

      return users;
    },
  });
}
