import { describe, expect, it } from 'vitest';
import { mapLoginResponse } from './auth.mapper';

describe('mapLoginResponse', () => {
  it('maps session and keeps dashboard preferences outside it', () => {
    const result = mapLoginResponse({ id: '1', username: 'ana', token: 'token', roles: ['admin'], image: '/a.png', dashboardConfig: [{ id: 'news', enabled: true }] });
    expect(result.session).toEqual({ token: 'token', user: { id: '1', username: 'ana', avatarUrl: '/a.png', roles: ['admin'] } });
    expect(result.session).not.toHaveProperty('dashboardConfig');
    expect(result.legacyDashboardPreferences.dashboardConfig).toEqual([{ id: 'news', enabled: true }]);
  });

  it('rejects the complete DTO when one role is unknown', () => {
    expect(() => mapLoginResponse({ id: '1', username: 'ana', token: 'token', roles: ['superAdmin'] })).toThrow('Invalid login response');
  });
});
