import api from '@/services/api/api';

export interface DashboardModuleConfig {
  id: string;
  enabled: boolean;
}

export interface DashboardPreferences {
  dashboardConfig: DashboardModuleConfig[];
  mobileDashboardConfig: DashboardModuleConfig[];
}

export async function getDashboardPreferences(): Promise<DashboardPreferences> {
  const response = await api.get<DashboardPreferences>('/dashboard/preferences');
  return response.data;
}

export async function patchDashboardPreferences(
  preferences: DashboardPreferences,
): Promise<void> {
  await api.patch('/dashboard/preferences', preferences);
}
