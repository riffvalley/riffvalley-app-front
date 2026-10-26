import { watch, type WatchStopHandle } from "vue";
import type { QueryClient } from "@tanstack/vue-query";
import { hasMinimumRole, type UserRole } from "@/modules/identity/shared";
import { broadcastAuthPermissionsChanged } from "@/modules/identity/auth";
import type { AuthStore } from "@/modules/identity/auth";
import { clearPrivateQueryCache, queryClient } from "./queryClient";

type AuthSessionState = Pick<AuthStore, "authStatus" | "userId" | "role">;

function privateDataCapabilities(role: UserRole | null) {
  return [hasMinimumRole(role, "riffvalley"), role === "superadmin"] as const;
}

/** Coordinates private server-data cleanup on identity, session, or permission transitions. */
export function observePrivateQueryCache(
  authStore: AuthSessionState,
  client: QueryClient = queryClient,
): WatchStopHandle {
  return watch(
    () => [authStore.authStatus, authStore.userId, ...privateDataCapabilities(authStore.role)] as const,
    ([status, userId, hasPetitionsAccess, hasSuggestionsAccess], [previousStatus, previousUserId, hadPetitionsAccess, hadSuggestionsAccess]) => {
      const identityChanged = userId !== previousUserId;
      const sessionEnded = previousStatus === "authenticated" && status !== "authenticated";
      const permissionsChanged = !identityChanged && previousStatus === "authenticated" && status === "authenticated" &&
        (hasPetitionsAccess !== hadPetitionsAccess || hasSuggestionsAccess !== hadSuggestionsAccess);

      if (identityChanged || sessionEnded || permissionsChanged) {
        clearPrivateQueryCache(client);
      }
      if (permissionsChanged) broadcastAuthPermissionsChanged();
    },
    { flush: "sync" },
  );
}
