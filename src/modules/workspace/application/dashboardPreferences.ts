export interface DashboardModuleConfig { id: string; enabled: boolean }
export interface DashboardPreferences {
  dashboardButtonsEnabled: boolean;
  dashboardConfig: DashboardModuleConfig[] | null;
  mobileDashboardConfig: DashboardModuleConfig[] | null;
}
export interface DashboardPersistence {
  read(): DashboardPreferences;
  writeButtons(enabled: boolean): void;
  writeConfig(target: "dashboardConfig" | "mobileDashboardConfig", config: DashboardModuleConfig[] | null): void;
  clear(): void;
}
export const emptyDashboardPreferences = (): DashboardPreferences => ({
  dashboardButtonsEnabled: false, dashboardConfig: null, mobileDashboardConfig: null,
});
