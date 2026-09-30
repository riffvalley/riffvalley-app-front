import { defineStore } from "pinia";
import { emptySession } from "../application/session";
import type { IdentityDependencies, LoginPayload } from "../application/session";

export function createAuthStore(dependencies: IdentityDependencies) {
  return defineStore("auth", {
    state: () => ({ ...dependencies.persistence.read(), sessionVersion: 0 }),
    actions: {
      async login(payload: LoginPayload) {
        try {
          const session = await dependencies.login(payload);
          this.$patch(session);
          this.sessionVersion++;
          dependencies.persistence.write(session);
        } catch (error) {
          console.error("Login failed:", error);
          throw new Error("Invalid credentials");
        }
      },
      setImage(image: string) {
        this.image = image || null;
        dependencies.persistence.writeImage(this.image);
      },
      logout() {
        this.$patch(emptySession());
        this.sessionVersion++;
        dependencies.persistence.clear();
        dependencies.onLogout();
      },
      // Legacy callers may still invoke this. Tokens are read for every request.
      initializeAuth() {},
    },
    getters: {
      isAuthenticated: (state): boolean => !!state.token,
      loggedUser: (state) => ({ id: state.userId, username: state.username }),
      userRoles: (state) => state.roles,
      hasRole: (state) => (role: string): boolean => state.roles.includes(role),
      avatarUrl: (state) => state.image,
    },
  });
}
