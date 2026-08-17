import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearDashboardPreferences,
  dashboardPreferences,
  loadDashboardPreferences,
  saveDashboardPreference,
  setDashboardPreferences,
} from './dashboardPreferences';
import { getDashboardPreferences, patchDashboardPreferences } from '@/services/dashboard/preferences';

vi.mock('@/services/dashboard/preferences', () => ({
  getDashboardPreferences: vi.fn(),
  patchDashboardPreferences: vi.fn(),
}));

describe('dashboard preferences', () => {
  beforeEach(() => {
    localStorage.clear();
    clearDashboardPreferences();
  });

  it('loads both configurations once for concurrent consumers', async () => {
    const preferences = {
      dashboardConfig: [{ id: 'desktop', enabled: true }],
      mobileDashboardConfig: [{ id: 'mobile', enabled: false }],
    };
    vi.mocked(getDashboardPreferences).mockResolvedValue(preferences);
    await Promise.all([loadDashboardPreferences(), loadDashboardPreferences()]);
    expect(getDashboardPreferences).toHaveBeenCalledTimes(1);
    expect(dashboardPreferences).toEqual(preferences);
  });

  it('patches both complete arrays when one target changes', async () => {
    const initial = {
      dashboardConfig: [{ id: 'desktop', enabled: true }],
      mobileDashboardConfig: [{ id: 'mobile', enabled: false }],
    };
    const updated = {
      ...initial,
      dashboardConfig: [{ id: 'desktop', enabled: false }],
    };
    vi.mocked(getDashboardPreferences).mockResolvedValue(initial);
    vi.mocked(patchDashboardPreferences).mockResolvedValue(undefined);
    await saveDashboardPreference('dashboardConfig', updated.dashboardConfig);
    expect(patchDashboardPreferences).toHaveBeenCalledWith(updated);
    expect(dashboardPreferences).toEqual(updated);
  });

  it('does not restore stale preferences when logout invalidates an in-flight load', async () => {
    let resolveLoad!: (value: {
      dashboardConfig: { id: string; enabled: boolean }[];
      mobileDashboardConfig: { id: string; enabled: boolean }[];
    }) => void;
    vi.mocked(getDashboardPreferences).mockReturnValue(
      new Promise((resolve) => { resolveLoad = resolve; }),
    );
    const loading = loadDashboardPreferences();
    clearDashboardPreferences();
    resolveLoad({ dashboardConfig: [{ id: 'old', enabled: true }], mobileDashboardConfig: [] });
    await expect(loading).rejects.toThrow('Dashboard preferences load invalidated');
    expect(dashboardPreferences.dashboardConfig).toBeNull();
    expect(dashboardPreferences.mobileDashboardConfig).toBeNull();
  });

  it('clears reactive state and both persisted preferences', () => {
    setDashboardPreferences({ dashboardConfig: [{ id: 'one', enabled: true }], mobileDashboardConfig: [{ id: 'two', enabled: false }] });
    clearDashboardPreferences();
    expect(dashboardPreferences.dashboardConfig).toBeNull();
    expect(dashboardPreferences.mobileDashboardConfig).toBeNull();
    expect(localStorage.getItem('dashboardConfig')).toBeNull();
    expect(localStorage.getItem('mobileDashboardConfig')).toBeNull();
  });
});
