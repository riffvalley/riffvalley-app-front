import { reactive } from 'vue';
export interface DashboardModuleConfig {
  id: string;
  enabled: boolean;
}

export interface DashboardPreferences {
  dashboardConfig: DashboardModuleConfig[] | null;
  mobileDashboardConfig: DashboardModuleConfig[] | null;
}

const read = (key: keyof DashboardPreferences): DashboardModuleConfig[] | null => {
  try {
    const value = localStorage.getItem(key);
    if (!value) return null;
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as DashboardModuleConfig[] : null;
  } catch { return null; }
};

export const dashboardPreferences = reactive<DashboardPreferences>({
  dashboardConfig: read('dashboardConfig'),
  mobileDashboardConfig: read('mobileDashboardConfig'),
});

export function setDashboardPreferences(preferences: DashboardPreferences): void {
  dashboardPreferences.dashboardConfig = preferences.dashboardConfig;
  dashboardPreferences.mobileDashboardConfig = preferences.mobileDashboardConfig;
  for (const key of ['dashboardConfig', 'mobileDashboardConfig'] as const) {
    if (preferences[key] === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(preferences[key]));
  }
}

export function setDashboardPreference(key: keyof DashboardPreferences, value: DashboardModuleConfig[]): void {
  dashboardPreferences[key] = value;
  localStorage.setItem(key, JSON.stringify(value));
}

export function clearDashboardPreferences(): void {
  dashboardPreferences.dashboardConfig = null;
  dashboardPreferences.mobileDashboardConfig = null;
  localStorage.removeItem('dashboardConfig');
  localStorage.removeItem('mobileDashboardConfig');
}
