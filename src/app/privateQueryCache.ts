import { watch, type WatchStopHandle } from "vue";
import type { QueryClient } from "@tanstack/vue-query";
import type { useAuthStore } from "@/modules/identity/stores/auth";
import { clearPrivateQueryCache, queryClient } from "./queryClient";

type AuthSessionState = Pick<ReturnType<typeof useAuthStore>, "authStatus" | "userId">;

/** Clears server data synchronously when the session ends or its identity changes. */
export function observePrivateQueryCache(
  authStore: AuthSessionState,
  client: QueryClient = queryClient,
): WatchStopHandle {
  return watch(
    () => [authStore.authStatus, authStore.userId] as const,
    ([status, userId], [previousStatus, previousUserId]) => {
      const identityChanged = userId !== previousUserId;
      const sessionEnded = previousStatus === "authenticated" && status !== "authenticated";

      if (identityChanged || sessionEnded) clearPrivateQueryCache(client);
    },
    { flush: "sync" },
  );
}
