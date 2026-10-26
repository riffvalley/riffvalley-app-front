import { defineStore } from "pinia";

export interface DashboardModuleConfig {
  id: string;
  enabled: boolean;
}

function readPreference(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    // Local persistence is optional; the Pinia state remains the session source.
    return null;
  }
}

function writePreference(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // A restricted storage must not interrupt in-memory preference updates.
  }
}

function removePreference(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Removing a persisted copy is best-effort, like writing one.
  }
}

function loadDashboardConfig(key: string): DashboardModuleConfig[] | null {
  const raw = readPreference(key);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) &&
      parsed.every(
        (item): item is DashboardModuleConfig =>
          typeof item === "object" &&
          item !== null &&
          typeof item.id === "string" &&
          typeof item.enabled === "boolean"
      )
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function loadDashboardButtonsEnabled(): boolean {
  return readPreference("dashboardButtonsEnabled") === "true";
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
      writePreference("dashboardButtonsEnabled", String(enabled));
    },

    setDashboardConfig(config: DashboardModuleConfig[] | null) {
      this.dashboardConfig = config;
      if (config === null) removePreference("dashboardConfig");
      else writePreference("dashboardConfig", JSON.stringify(config));
    },

    setMobileDashboardConfig(config: DashboardModuleConfig[] | null) {
      this.mobileDashboardConfig = config;
      if (config === null) removePreference("mobileDashboardConfig");
      else writePreference("mobileDashboardConfig", JSON.stringify(config));
    },

    persist() {
      writePreference("dashboardButtonsEnabled", String(this.dashboardButtonsEnabled));
      writePreference("dashboardConfig", JSON.stringify(this.dashboardConfig));
      writePreference("mobileDashboardConfig", JSON.stringify(this.mobileDashboardConfig));
    },
  },
});
