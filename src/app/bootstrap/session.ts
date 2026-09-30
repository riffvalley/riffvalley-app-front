import type { Pinia } from "pinia";
import type { Router } from "vue-router";
import { useAuthStore } from "../dependencies/identity";
import { useWorkspaceStore } from "../dependencies/workspace";
import { configureHttpSession } from "../../shared/infrastructure/http/client";

export function composeSession(pinia: Pinia, router: Pick<Router, "push">) {
  const auth = useAuthStore(pinia);
  // Create workspace while the same Pinia is active for login/logout composition.
  useWorkspaceStore(pinia);
  configureHttpSession({
    getToken: () => auth.token,
    getSessionVersion: () => auth.sessionVersion,
    onUnauthorized: () => {
      console.warn("Sesión expirada o no autorizada, redirigiendo al login...");
      auth.logout();
      return router.push({ name: "Login" });
    },
  });
}
