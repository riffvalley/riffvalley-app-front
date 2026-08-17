import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setDashboardPreferences } from '@/stores/dashboardPreferences';
import { performLogout } from './logout';

describe('performLogout', () => {
  beforeEach(() => localStorage.clear());
  it('delegates Auth logout and preserves legacy dashboard cleanup', () => {
    setDashboardPreferences({ dashboardConfig: [{ id: 'one', enabled: true }], mobileDashboardConfig: [] });
    const auth = { logout: vi.fn() };
    performLogout(auth, 'expired');
    expect(auth.logout).toHaveBeenCalledWith('expired');
    expect(localStorage.getItem('dashboardConfig')).toBeNull();
    expect(localStorage.getItem('mobileDashboardConfig')).toBeNull();
  });
});
