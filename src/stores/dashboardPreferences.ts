import { reactive } from 'vue';
import {
  getDashboardPreferences,
  patchDashboardPreferences,
  type DashboardModuleConfig,
  type DashboardPreferences,
} from '@/services/dashboard/preferences';

export type { DashboardModuleConfig, DashboardPreferences } from '@/services/dashboard/preferences';

interface DashboardPreferencesState {
  dashboardConfig: DashboardModuleConfig[] | null;
  mobileDashboardConfig: DashboardModuleConfig[] | null;
}

export const dashboardPreferences = reactive<DashboardPreferencesState>({
  dashboardConfig: null,
  mobileDashboardConfig: null,
});

export function setDashboardPreferences(preferences: DashboardPreferences): void {
  dashboardPreferences.dashboardConfig = preferences.dashboardConfig;
  dashboardPreferences.mobileDashboardConfig = preferences.mobileDashboardConfig;
}

let loadPromise: Promise<DashboardPreferences> | null = null;
let generation = 0;

export function loadDashboardPreferences(): Promise<DashboardPreferences> {
  if (dashboardPreferences.dashboardConfig && dashboardPreferences.mobileDashboardConfig) {
    return Promise.resolve({
      dashboardConfig: dashboardPreferences.dashboardConfig,
      mobileDashboardConfig: dashboardPreferences.mobileDashboardConfig,
    });
  }
  if (!loadPromise) {
    const requestedGeneration = generation;
    loadPromise = getDashboardPreferences()
      .then((preferences) => {
        if (generation !== requestedGeneration) {
          throw new Error('Dashboard preferences load invalidated');
        }
        setDashboardPreferences(preferences);
        return preferences;
      })
      .finally(() => { loadPromise = null; });
  }
  return loadPromise;
}

export async function saveDashboardPreference(
  key: keyof DashboardPreferences,
  value: DashboardModuleConfig[],
): Promise<DashboardPreferences> {
  await loadDashboardPreferences();
  const preferences: DashboardPreferences = {
    dashboardConfig: key === 'dashboardConfig'
      ? value
      : dashboardPreferences.dashboardConfig ?? [],
    mobileDashboardConfig: key === 'mobileDashboardConfig'
      ? value
      : dashboardPreferences.mobileDashboardConfig ?? [],
  };
  setDashboardPreferences(preferences);
  await patchDashboardPreferences(preferences);
  return preferences;
}

export function clearDashboardPreferences(): void {
  generation += 1;
  dashboardPreferences.dashboardConfig = null;
  dashboardPreferences.mobileDashboardConfig = null;
  localStorage.removeItem('dashboardConfig');
  localStorage.removeItem('mobileDashboardConfig');
}
