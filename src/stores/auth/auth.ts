import { defineStore } from "pinia";
import { USER_ROLES, type LoginPayload, type UserRole } from "@interfaces/auth";
import {
  sessionAuthTransport,
  SessionAuthError,
  type SessionAuthUser,
  type SessionLoginResponse,
} from "@services/auth/sessionAuth";
import {
  broadcastAuthLogin,
  broadcastAuthLogout,
} from "@services/auth/sessionAuthCoordinator";

export type AuthStatus = "initializing" | "authenticated" | "anonymous" | "error";
export type AuthSessionMode = "renewable" | null;
export type AuthInitializationError =
  | "rate-limited"
  | "unavailable"
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

const USER_ROLE_SET: ReadonlySet<string> = new Set(USER_ROLES);

function isUserRole(role: string | null): role is UserRole {
  return role !== null && USER_ROLE_SET.has(role);
}

function clearPersistedCredentials() {
  ["token", "username", "userId", "image", "role", "roles"].forEach((key) =>
    localStorage.removeItem(key),
  );
}

function clearLocalAuthState(store: {
  token: string | null;
  username: string | null;
  userId: string | null;
  image: string | null;
  role: UserRole | null;
  dashboardButtonsEnabled: boolean;
  dashboardConfig: DashboardModuleConfig[] | null;
  mobileDashboardConfig: DashboardModuleConfig[] | null;
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
  store.dashboardButtonsEnabled = loadDashboardButtonsEnabled();
  store.dashboardConfig = loadDashboardConfig("dashboardConfig");
  store.mobileDashboardConfig = loadDashboardConfig("mobileDashboardConfig");
  store.authStatus = "anonymous";
  store.sessionMode = null;
  store.authInitializationError = null;
  clearPersistedCredentials();
}

function applyRenewableProfile(
  store: {
    token: string | null;
    username: string | null;
    userId: string | null;
    image: string | null;
    role: UserRole | null;
    dashboardButtonsEnabled: boolean;
    dashboardConfig: DashboardModuleConfig[] | null;
    mobileDashboardConfig: DashboardModuleConfig[] | null;
    sessionMode: AuthSessionMode;
    authStatus: AuthStatus;
    authInitializationError: AuthInitializationError;
  },
  user: SessionAuthUser,
  token: string,
) {
  store.token = token;
  store.username = user.username;
  store.userId = user.id;
  store.image = user.image ?? null;
  store.role = user.role;
  if (user.dashboardButtonsEnabled !== undefined) {
    store.dashboardButtonsEnabled = user.dashboardButtonsEnabled;
  }
  if (user.dashboardConfig !== undefined) store.dashboardConfig = user.dashboardConfig ?? null;
  if (user.mobileDashboardConfig !== undefined) {
    store.mobileDashboardConfig = user.mobileDashboardConfig ?? null;
  }
  store.authStatus = "authenticated";
  store.sessionMode = "renewable";
  store.authInitializationError = null;
}

function persistPreferences(store: {
  dashboardButtonsEnabled: boolean;
  dashboardConfig: DashboardModuleConfig[] | null;
  mobileDashboardConfig: DashboardModuleConfig[] | null;
}) {
  localStorage.setItem("dashboardButtonsEnabled", String(store.dashboardButtonsEnabled));
  localStorage.setItem("dashboardConfig", JSON.stringify(store.dashboardConfig));
  localStorage.setItem("mobileDashboardConfig", JSON.stringify(store.mobileDashboardConfig));
}

export interface DashboardModuleConfig {
  id: string;
  enabled: boolean;
}

function loadDashboardConfig(key: string): DashboardModuleConfig[] | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      Array.isArray(parsed) &&
      parsed.every((item): item is DashboardModuleConfig =>
        typeof item === "object" && item !== null &&
        typeof item.id === "string" && typeof item.enabled === "boolean"
      )
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function loadDashboardButtonsEnabled(): boolean {
  return localStorage.getItem("dashboardButtonsEnabled") === "true";
}

function loadSession() {
  clearPersistedCredentials();
  return {
    token: null,
    username: null,
    userId: null,
    image: null,
    role: null,
    dashboardButtonsEnabled: loadDashboardButtonsEnabled(),
    dashboardConfig: loadDashboardConfig("dashboardConfig"),
    mobileDashboardConfig: loadDashboardConfig("mobileDashboardConfig"),
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
          null,
        );
      }

      applyRenewableProfile(this, response, response.token);
      clearPersistedCredentials();
      persistPreferences(this);
      broadcastAuthLogin();
    },

    setImage(newImage: string) {
      this.image = newImage || null;
    },

    setDashboardButtonsEnabled(enabled: boolean) {
      this.dashboardButtonsEnabled = enabled;
      localStorage.setItem("dashboardButtonsEnabled", String(enabled));
    },

    setDashboardConfig(config: DashboardModuleConfig[]) {
      this.dashboardConfig = config;
      localStorage.setItem("dashboardConfig", JSON.stringify(config));
    },

    setMobileDashboardConfig(config: DashboardModuleConfig[]) {
      this.mobileDashboardConfig = config;
      localStorage.setItem("mobileDashboardConfig", JSON.stringify(config));
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
      this.clearSessionLocally();
      broadcastAuthLogout();

      if (!shouldRevoke) return { revocation: "already-absent" };
      try {
        await sessionAuthTransport.logout();
        return { revocation: "confirmed" };
      } catch (error: unknown) {
        if (error instanceof SessionAuthError && error.category === "unauthenticated") {
          return { revocation: "already-absent" };
        }
        const sessionError = error instanceof SessionAuthError
          ? error
          : new SessionAuthError("No se pudo confirmar la revocación de sesión.", "network-error", null);
        return { revocation: "unconfirmed", error: sessionError };
      }
    },

    async initializeAuth(): Promise<AuthStatus> {
      if (this.authStatus === "authenticated" || this.authStatus === "anonymous") {
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
        persistPreferences(this);
        return this.authStatus;
      } catch (error: unknown) {
        if (expectedGeneration !== this.authSessionGeneration) return this.authStatus;
        if (error instanceof SessionAuthError && error.category === "unauthenticated") {
          this.clearSessionLocally();
          broadcastAuthLogout();
          return this.authStatus;
        }

        this.authInitializationError = error instanceof SessionAuthError
          ? (error.category === "rate-limited" || error.category === "unavailable" ||
            error.category === "network-error" || error.category === "forbidden" ||
            error.category === "protocol-error" ? error.category : "http-error")
          : "network-error";
        this.authStatus = "error";
        return this.authStatus;
      }
    },

    async renewSession(expectedGeneration = this.authSessionGeneration): Promise<RenewSessionResult> {
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
        if (!session.token || !session.user?.id || !session.user.username || !isUserRole(session.user.role)) {
          throw new SessionAuthError(
            "La respuesta de Identity no coincide con el contrato de sesión.",
            "protocol-error",
            null,
          );
        }

        applyRenewableProfile(this, session.user, session.token);
        this.authInitializationError = null;
        clearPersistedCredentials();
        persistPreferences(this);
        return "renewed";
      } catch (error: unknown) {
        if (expectedGeneration !== this.authSessionGeneration) return "stale";
        if (error instanceof SessionAuthError && error.category === "unauthenticated") {
          this.clearSessionLocally();
          broadcastAuthLogout();
          return "unauthenticated";
        }

        this.authInitializationError = error instanceof SessionAuthError
          ? (error.category === "rate-limited" || error.category === "unavailable" ||
            error.category === "network-error" || error.category === "forbidden" ||
            error.category === "protocol-error" ? error.category : "http-error")
          : "network-error";
        throw error;
      }
    },
  },
  getters: {
    isAuthenticated: (state): boolean => state.authStatus === "authenticated" && !!state.token,
    loggedUser: (state) => ({ id: state.userId, username: state.username }),
    hasRole: (state) => (role: string): boolean => state.role === role,
    avatarUrl: (state) => state.image,
  },
});
