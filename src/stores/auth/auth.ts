import { defineStore } from "pinia";
import { login, type LoginPayload } from "../../services/auth/auth";
import api from "../../services/api/api";
import { USER_ROLES, type UserRole } from "@interfaces/auth";

const USER_ROLE_SET: ReadonlySet<string> = new Set(USER_ROLES);

function isUserRole(role: string | null): role is UserRole {
  return role !== null && USER_ROLE_SET.has(role);
}

const SESSION_KEYS = [
  "token",
  "username",
  "userId",
  "image",
  "role",
  "roles",
  "dashboardButtonsEnabled",
  "dashboardConfig",
  "mobileDashboardConfig",
] as const;

function clearPersistedSession() {
  SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
  delete api.defaults.headers.common["Authorization"];
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
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const hasLegacyRoles = localStorage.getItem("roles") !== null;

  if (!token || !isUserRole(role) || hasLegacyRoles) {
    clearPersistedSession();
    return {
      token: null,
      username: null,
      userId: null,
      image: null,
      role: null,
      dashboardButtonsEnabled: false,
      dashboardConfig: null,
      mobileDashboardConfig: null,
    };
  }

  return {
    token,
    username: localStorage.getItem("username"),
    userId: localStorage.getItem("userId"),
    image: localStorage.getItem("image"),
    role,
    dashboardButtonsEnabled: loadDashboardButtonsEnabled(),
    dashboardConfig: loadDashboardConfig("dashboardConfig"),
    mobileDashboardConfig: loadDashboardConfig("mobileDashboardConfig"),
  };
}

export const useAuthStore = defineStore("auth", {
  state: () => loadSession(),
  actions: {
    async login(payload: LoginPayload) {
      try {
        const response = await login(payload);
        if (!response.token || !isUserRole(response.role)) {
          this.logout();
          throw new Error("Invalid authentication response");
        }

        this.token = response.token;
        this.username = response.username;
        this.userId = response.id;
        this.image = response.image || null;
        this.role = response.role;
        this.dashboardButtonsEnabled = response.dashboardButtonsEnabled === true;
        this.dashboardConfig = response.dashboardConfig ?? null;
        this.mobileDashboardConfig = response.mobileDashboardConfig ?? null;

        localStorage.setItem("token", response.token);
        localStorage.setItem("username", response.username);
        localStorage.setItem("userId", response.id);
        localStorage.setItem("image", this.image || "");
        localStorage.setItem("role", response.role);
        localStorage.removeItem("roles");
        localStorage.setItem("dashboardButtonsEnabled", String(this.dashboardButtonsEnabled));
        localStorage.setItem("dashboardConfig", JSON.stringify(this.dashboardConfig));
        localStorage.setItem("mobileDashboardConfig", JSON.stringify(this.mobileDashboardConfig));

        api.defaults.headers.common["Authorization"] = `Bearer ${response.token}`;
      } catch (error) {
        console.error("Login failed:", error);
        throw new Error("Invalid credentials");
      }
    },

    setImage(newImage: string) {
      this.image = newImage || null;
      localStorage.setItem("image", this.image || "");
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

    logout() {
      this.token = null;
      this.username = null;
      this.userId = null;
      this.image = null;
      this.role = null;
      this.dashboardButtonsEnabled = false;
      this.dashboardConfig = null;
      this.mobileDashboardConfig = null;

      clearPersistedSession();
    },

    initializeAuth() {
      if (this.token && this.role && isUserRole(this.role)) {
        api.defaults.headers.common["Authorization"] = `Bearer ${this.token}`;
      } else {
        this.logout();
      }
    },
  },
  getters: {
    isAuthenticated: (state): boolean => !!state.token,
    loggedUser: (state) => ({ id: state.userId, username: state.username }),
    hasRole: (state) => (role: string): boolean => state.role === role,
    avatarUrl: (state) => state.image,
  },
});
