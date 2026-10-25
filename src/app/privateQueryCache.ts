import { watch, type WatchStopHandle } from "vue";
import type { QueryClient } from "@tanstack/vue-query";
import type { UserRole } from "@/modules/identity/shared/types/auth";
import { broadcastAuthPermissionsChanged } from "@/modules/identity/auth/api/sessionAuthCoordinator";
import type { useAuthStore } from "@/modules/identity/auth/stores/auth";
import { clearPrivateQueryCache, queryClient } from "./queryClient";

type AuthSessionState = Pick<ReturnType<typeof useAuthStore>, "authStatus" | "userId" | "role">;

// Current administrative queries and views require superadmin. Keeping the
// effective capability here means role changes with equivalent access do not
// clear the shared cache.
function canAccessAdminData(role: UserRole | null): boolean {
  return role === "superadmin";
}

/** Coordinates private server-data cleanup on identity, session, or permission transitions. */
export function observePrivateQueryCache(
  authStore: AuthSessionState,
  client: QueryClient = queryClient,
): WatchStopHandle {
  return watch(
    () => [authStore.authStatus, authStore.userId, canAccessAdminData(authStore.role)] as const,
    ([status, userId, hasAdminAccess], [previousStatus, previousUserId, hadAdminAccess]) => {
      const identityChanged = userId !== previousUserId;
      const sessionEnded = previousStatus === "authenticated" && status !== "authenticated";
      const permissionsChanged = !identityChanged && previousStatus === "authenticated" && status === "authenticated" &&
        hasAdminAccess !== hadAdminAccess;

      if (identityChanged || sessionEnded || permissionsChanged) {
        clearPrivateQueryCache(client);
      }
      if (permissionsChanged) broadcastAuthPermissionsChanged();
    },
    { flush: "sync" },
  );
}
