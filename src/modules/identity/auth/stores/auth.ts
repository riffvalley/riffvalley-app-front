import { defineStore } from "pinia";
import { USER_ROLES, type UserRole } from "@/modules/identity/shared";
import type { LoginPayload } from "../types/login";
import { sessionAuthTransport, SessionAuthError } from "@/modules/identity/auth/api/sessionAuth";
import type { SessionAuthUser, SessionLoginResponse } from "@/modules/identity/auth/types/session";
import {
  broadcastAuthLogin,
  broadcastAuthLogout,
} from "@/modules/identity/auth/api/sessionAuthCoordinator";
import { notifyAppDailyActivity } from "@/modules/identity/activity";
import { useDashboardPreferences } from "@/modules/identity/account";

export type AuthStatus = "initializing" | "authenticated" | "anonymous" | "error";
export type AuthSessionMode = "renewable" | null;
export type AuthInitializationError =
  | "rate-limited"
  | "unavailable"
  | "coordination-unavailable"
  | "network-error"
  | "forbidden"
  | "protocol-error"
  | "http-error"
  | null;
export type RenewSessionResult = "renewed" | "unauthenticated" | "stale";
export type LogoutOutcome =
  | { revocation: "confirmed" | "already-absent" }
  | { revocation: "unconfirmed"; error: SessionAuthError };

const initializationPromises = new WeakMap<object, Promise<AuthStatus>>();
const renewalPromises = new WeakMap<
  object,
  { generation: number; promise: Promise<RenewSessionResult> }
>();

const USER_ROLE_SET: ReadonlySet<string> = new Set(USER_ROLES);

function isUserRole(role: string | null): role is UserRole {
  return role !== null && USER_ROLE_SET.has(role);
}

function clearPersistedCredentials() {
  ["token", "username", "userId", "image", "role", "roles"].forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Legacy credential cleanup is best-effort when browser storage is restricted.
    }
  });
}

function clearLocalAuthState(store: {
  token: string | null;
  username: string | null;
  userId: string | null;
  image: string | null;
  role: UserRole | null;
  authStatus: AuthStatus;
  sessionMode: AuthSessionMode;
  authInitializationError: AuthInitializationError;
  authSessionGeneration: number;
}) {
  store.authSessionGeneration += 1;
  store.token = null;
  store.username = null;
  store.userId = null;
  store.image = null;
  store.role = null;
  store.authStatus = "anonymous";
  store.sessionMode = null;
  store.authInitializationError = null;
  clearPersistedCredentials();
}

function clearAndBroadcastAuthLogout(store: Parameters<typeof clearLocalAuthState>[0]) {
  clearLocalAuthState(store);
  broadcastAuthLogout();
}

function applyRenewableProfile(
  store: {
    token: string | null;
    username: string | null;
    userId: string | null;
    image: string | null;
    role: UserRole | null;
    sessionMode: AuthSessionMode;
    authStatus: AuthStatus;
    authInitializationError: AuthInitializationError;
  },
  user: SessionAuthUser,
  token: string
) {
  store.token = token;
  store.username = user.username;
  store.userId = user.id;
  store.image = user.image ?? null;
  store.role = user.role;
  useDashboardPreferences().applySessionPreferences(user);
  store.authStatus = "authenticated";
  store.sessionMode = "renewable";
  store.authInitializationError = null;
}

function loadSession() {
  clearPersistedCredentials();
  return {
    token: null,
    username: null,
    userId: null,
    image: null,
    role: null,
    authStatus: "initializing" as AuthStatus,
    sessionMode: null as AuthSessionMode,
    authInitializationError: null as AuthInitializationError,
    authSessionGeneration: 0,
  };
}

export const useAuthStore = defineStore("auth", {
  state: () => loadSession(),
  actions: {
    async login(payload: LoginPayload) {
      const expectedGeneration = ++this.authSessionGeneration;
      const response: SessionLoginResponse = await sessionAuthTransport.login(payload);
      if (expectedGeneration !== this.authSessionGeneration) return;

      if (!response.token || !isUserRole(response.role)) {
        throw new SessionAuthError(
          "La respuesta de Identity no coincide con el contrato de sesión.",
          "protocol-error",
          null
        );
      }

      applyRenewableProfile(this, response, response.token);
      clearPersistedCredentials();
      broadcastAuthLogin();
      notifyAppDailyActivity();
    },

    setImage(newImage: string) {
      this.image = newImage || null;
    },

    clearSessionLocally() {
      clearLocalAuthState(this);
    },

    async restoreAfterRemoteLogin(): Promise<AuthStatus> {
      this.clearSessionLocally();
      this.authStatus = "initializing";
      initializationPromises.delete(this);
      return this.initializeAuth();
    },

    async logout(): Promise<LogoutOutcome> {
      const shouldRevoke = this.sessionMode === "renewable";
      clearAndBroadcastAuthLogout(this);

      if (!shouldRevoke) return { revocation: "already-absent" };
      try {
        await sessionAuthTransport.logout();
        return { revocation: "confirmed" };
      } catch (error: unknown) {
        if (error instanceof SessionAuthError && error.category === "unauthenticated") {
          return { revocation: "already-absent" };
        }
        const sessionError =
          error instanceof SessionAuthError
            ? error
            : new SessionAuthError(
                "No se pudo confirmar la revocación de sesión.",
                "network-error",
                null
              );
        return { revocation: "unconfirmed", error: sessionError };
      }
    },

    async initializeAuth(): Promise<AuthStatus> {
      if (this.authStatus === "authenticated" || this.authStatus === "anonymous") {
        return this.authStatus;
      }
      if (
        this.authStatus === "error" &&
        this.authInitializationError === "coordination-unavailable"
      ) {
        return this.authStatus;
      }

      const existing = initializationPromises.get(this);
      if (existing) return existing;

      const initialization = this.restoreRenewableSession();
      initializationPromises.set(this, initialization);
      try {
        return await initialization;
      } finally {
        if (initializationPromises.get(this) === initialization) {
          initializationPromises.delete(this);
        }
      }
    },

    async restoreRenewableSession(): Promise<AuthStatus> {
      const expectedGeneration = this.authSessionGeneration;
      this.authStatus = "initializing";
      this.authInitializationError = null;
      try {
        const session = await sessionAuthTransport.refresh();
        const user = session.user;
        if (expectedGeneration !== this.authSessionGeneration) return this.authStatus;
        if (!session.token || !user?.id || !user.username || !isUserRole(user.role)) {
          this.authStatus = "error";
          this.authInitializationError = "protocol-error";
          return this.authStatus;
        }

        applyRenewableProfile(this, user, session.token);
        this.authSessionGeneration += 1;
        clearPersistedCredentials();
        notifyAppDailyActivity();
        return this.authStatus;
      } catch (error: unknown) {
        if (expectedGeneration !== this.authSessionGeneration) return this.authStatus;
        if (error instanceof SessionAuthError && error.category === "unauthenticated") {
          clearAndBroadcastAuthLogout(this);
          return this.authStatus;
        }

        this.authInitializationError =
          error instanceof SessionAuthError
            ? error.category === "rate-limited" ||
              error.category === "unavailable" ||
              error.category === "network-error" ||
              error.category === "forbidden" ||
              error.category === "protocol-error" ||
              error.category === "coordination-unavailable"
              ? error.category
              : "http-error"
            : "network-error";
        this.authStatus = "error";
        return this.authStatus;
      }
    },

    renewSession(expectedGeneration = this.authSessionGeneration): Promise<RenewSessionResult> {
      const existingRenewal = renewalPromises.get(this);
      if (existingRenewal?.generation === expectedGeneration) return existingRenewal.promise;

      const renewal = (async (): Promise<RenewSessionResult> => {
        if (
          expectedGeneration !== this.authSessionGeneration ||
          this.authStatus !== "authenticated" ||
          this.sessionMode !== "renewable"
        ) {
          return "stale";
        }

        try {
          const session = await sessionAuthTransport.refresh();
          if (
            expectedGeneration !== this.authSessionGeneration ||
            this.authStatus !== "authenticated" ||
            this.sessionMode !== "renewable"
          ) {
            return "stale";
          }
          if (
            !session.token ||
            !session.user?.id ||
            !session.user.username ||
            !isUserRole(session.user.role)
          ) {
            throw new SessionAuthError(
              "La respuesta de Identity no coincide con el contrato de sesión.",
              "protocol-error",
              null
            );
          }

          applyRenewableProfile(this, session.user, session.token);
          this.authInitializationError = null;
          clearPersistedCredentials();
          return "renewed";
        } catch (error: unknown) {
          if (expectedGeneration !== this.authSessionGeneration) return "stale";
          if (error instanceof SessionAuthError && error.category === "coordination-unavailable") {
            // The access token was rejected, and this tab cannot safely renew the shared cookie.
            // Clear only local state; do not broadcast a logout or revoke the backend session.
            clearLocalAuthState(this);
            return "unauthenticated";
          }
          if (error instanceof SessionAuthError && error.category === "unauthenticated") {
            clearAndBroadcastAuthLogout(this);
            return "unauthenticated";
          }

          this.authInitializationError =
            error instanceof SessionAuthError
              ? error.category === "rate-limited" ||
                error.category === "unavailable" ||
                error.category === "network-error" ||
                error.category === "forbidden" ||
                error.category === "protocol-error" ||
                error.category === "coordination-unavailable"
                ? error.category
                : "http-error"
              : "network-error";
          throw error;
        }
      })();
      renewalPromises.set(this, { generation: expectedGeneration, promise: renewal });
      const clearRenewal = () => {
        if (renewalPromises.get(this)?.promise === renewal) renewalPromises.delete(this);
      };
      void renewal.then(clearRenewal, clearRenewal);
      return renewal;
    },
  },
  getters: {
    isAuthenticated: (state): boolean => state.authStatus === "authenticated" && !!state.token,
    loggedUser: (state) => ({ id: state.userId, username: state.username }),
    hasRole:
      (state) =>
      (role: string): boolean =>
        state.role === role,
    avatarUrl: (state) => state.image,
  },
});
