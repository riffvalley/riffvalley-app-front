// @stores/auth/auth.ts
import { defineStore } from "pinia";
import { login, type LoginPayload } from "../../services/auth/auth";
import api from "../../services/api/api";

function loadRoles(): string[] {
  const raw = localStorage.getItem("roles");
  if (!raw) return [];
  try {
    // Caso correcto: guardado como JSON
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Fallback por si quedó un string antiguo tipo "user,admin"
    if (raw.includes("[") || raw.includes("{")) return [];
    return raw.split(",").map(r => r.trim()).filter(Boolean);
  }
}

export interface DashboardModuleConfig {
  id: string;
  enabled: boolean;
}

function loadDashboardConfig(key: string): DashboardModuleConfig[] | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: localStorage.getItem("token") as string | null,
    username: localStorage.getItem("username") as string | null,
    userId: localStorage.getItem("userId") as string | null,
    image: localStorage.getItem("image") as string | null,
    roles: loadRoles(), // 👈 ahora siempre es string[]
    dashboardConfig: loadDashboardConfig("dashboardConfig") as DashboardModuleConfig[] | null,
    mobileDashboardConfig: loadDashboardConfig("mobileDashboardConfig") as DashboardModuleConfig[] | null,
  }),
  actions: {
    async login(payload: LoginPayload) {
      try {
        const response = await login(payload);

        this.token = response.token;
        this.username = response.username;
        this.userId = response.id;
        this.image = response.image || null;
        this.roles = response.roles || []; // array desde backend
        this.dashboardConfig = response.dashboardConfig ?? null;
        this.mobileDashboardConfig = response.mobileDashboardConfig ?? null;

        localStorage.setItem("token", response.token);
        localStorage.setItem("username", response.username);
        localStorage.setItem("userId", response.id);
        localStorage.setItem("image", this.image || "");
        localStorage.setItem("roles", JSON.stringify(this.roles)); // ✅ serializado
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
      this.roles = [];
      this.dashboardConfig = null;
      this.mobileDashboardConfig = null;

      localStorage.removeItem("token");
      localStorage.removeItem("username");
      localStorage.removeItem("userId");
      localStorage.removeItem("image");
      localStorage.removeItem("roles");
      localStorage.removeItem("dashboardConfig");
      localStorage.removeItem("mobileDashboardConfig");

      delete api.defaults.headers.common["Authorization"];
    },

    initializeAuth() {
      if (this.token) {
        api.defaults.headers.common["Authorization"] = `Bearer ${this.token}`;
      }
    },
  },
  getters: {
    isAuthenticated: (state): boolean => !!state.token,
    loggedUser: (state) => ({ id: state.userId, username: state.username }),
    userRoles: (state) => state.roles,
    hasRole: (state) => (role: string): boolean =>
      Array.isArray(state.roles) && state.roles.includes(role),
    avatarUrl: (state) => state.image,
  },
});
