import { beforeEach, describe, expect, it } from 'vitest';
import { clearDashboardPreferences, dashboardPreferences, setDashboardPreferences } from './dashboardPreferences';

describe('dashboard preferences', () => {
  beforeEach(() => localStorage.clear());
  it('clears reactive state and both persisted preferences', () => {
    setDashboardPreferences({ dashboardConfig: [{ id: 'one', enabled: true }], mobileDashboardConfig: [{ id: 'two', enabled: false }] });
    clearDashboardPreferences();
    expect(dashboardPreferences.dashboardConfig).toBeNull();
    expect(dashboardPreferences.mobileDashboardConfig).toBeNull();
    expect(localStorage.getItem('dashboardConfig')).toBeNull();
    expect(localStorage.getItem('mobileDashboardConfig')).toBeNull();
  });
});
