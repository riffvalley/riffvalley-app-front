import { defineStore } from "pinia";
import { emptyDashboardPreferences } from "../application/dashboardPreferences";
import type { DashboardModuleConfig, DashboardPersistence, DashboardPreferences } from "../application/dashboardPreferences";

export function createDashboardStore(persistence: DashboardPersistence) {
  return defineStore("workspace-dashboard", {
    state: () => persistence.read(),
    actions: {
      initialize(preferences: DashboardPreferences) {
        this.$patch(preferences);
        persistence.writeButtons(preferences.dashboardButtonsEnabled);
        persistence.writeConfig("dashboardConfig", preferences.dashboardConfig);
        persistence.writeConfig("mobileDashboardConfig", preferences.mobileDashboardConfig);
      },
      setDashboardButtonsEnabled(enabled: boolean) {
        this.dashboardButtonsEnabled = enabled;
        persistence.writeButtons(enabled);
      },
      setDashboardConfig(config: DashboardModuleConfig[]) {
        this.dashboardConfig = config;
        persistence.writeConfig("dashboardConfig", config);
      },
      setMobileDashboardConfig(config: DashboardModuleConfig[]) {
        this.mobileDashboardConfig = config;
        persistence.writeConfig("mobileDashboardConfig", config);
      },
      clear() {
        this.$patch(emptyDashboardPreferences());
        persistence.clear();
      },
    },
  });
}
