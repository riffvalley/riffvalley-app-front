import { describe, expect, it } from 'vitest';
import { mapLoginResponse } from './auth.mapper';

describe('mapLoginResponse', () => {
  it('maps only the Auth session and ignores additional legacy login fields', () => {
    const dto = { id: '1', username: 'ana', token: 'token', roles: ['admin'], image: '/a.png', dashboardConfig: [{ id: 'news', enabled: true }] };
    const result = mapLoginResponse(dto);
    expect(result).toEqual({ token: 'token', user: { id: '1', username: 'ana', avatarUrl: '/a.png', roles: ['admin'] } });
    expect(result).not.toHaveProperty('dashboardConfig');
  });

  it('rejects the complete DTO when one role is unknown', () => {
    expect(() => mapLoginResponse({ id: '1', username: 'ana', token: 'token', roles: ['superAdmin'] })).toThrow('Invalid login response');
  });

  it('rejects a DTO without roles', () => {
    expect(() => mapLoginResponse({ id: '1', username: 'ana', token: 'token' } as never)).toThrow('Invalid login response');
  });
});
