import { defineStore } from "pinia";

export interface DashboardModuleConfig {
  id: string;
  enabled: boolean;
}

function loadDashboardConfig(key: string): DashboardModuleConfig[] | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((item): item is DashboardModuleConfig =>
      typeof item === "object" && item !== null &&
      typeof item.id === "string" && typeof item.enabled === "boolean"
    ) ? parsed : null;
  } catch {
    return null;
  }
}

function loadDashboardButtonsEnabled(): boolean {
  return localStorage.getItem("dashboardButtonsEnabled") === "true";
}

export const useDashboardPreferencesStore = defineStore("dashboardPreferences", {
  state: () => ({
    dashboardButtonsEnabled: loadDashboardButtonsEnabled(),
    dashboardConfig: loadDashboardConfig("dashboardConfig"),
    mobileDashboardConfig: loadDashboardConfig("mobileDashboardConfig"),
  }),
  actions: {
    applySessionPreferences(preferences: {
      dashboardButtonsEnabled?: boolean;
      dashboardConfig?: DashboardModuleConfig[] | null;
      mobileDashboardConfig?: DashboardModuleConfig[] | null;
    }) {
      if (preferences.dashboardButtonsEnabled !== undefined) {
        this.dashboardButtonsEnabled = preferences.dashboardButtonsEnabled;
      }
      if (preferences.dashboardConfig !== undefined) {
        this.dashboardConfig = preferences.dashboardConfig;
      }
      if (preferences.mobileDashboardConfig !== undefined) {
        this.mobileDashboardConfig = preferences.mobileDashboardConfig;
      }
      this.persist();
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

    persist() {
      localStorage.setItem("dashboardButtonsEnabled", String(this.dashboardButtonsEnabled));
      localStorage.setItem("dashboardConfig", JSON.stringify(this.dashboardConfig));
      localStorage.setItem("mobileDashboardConfig", JSON.stringify(this.mobileDashboardConfig));
    },
  },
});
