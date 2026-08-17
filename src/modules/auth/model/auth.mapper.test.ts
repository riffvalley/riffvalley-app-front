import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mapLoginResponse } from './auth.mapper';

describe('mapLoginResponse', () => {
  it('maps the final nested login contract to AuthSession', () => {
    const result = mapLoginResponse({
      token: 'token',
      user: { id: '1', username: 'ana', avatarUrl: '/a.png', roles: ['admin', 'user'] },
    });
    expect(result).toEqual({
      token: 'token',
      user: { id: '1', username: 'ana', avatarUrl: '/a.png', roles: ['admin', 'user'] },
    });
  });

  it('accepts a null avatarUrl', () => {
    const result = mapLoginResponse({
      token: 'token',
      user: { id: '1', username: 'ana', avatarUrl: null, roles: ['user'] },
    });
    expect(result.user.avatarUrl).toBeNull();
  });

  it('rejects an unknown role', () => {
    expect(() => mapLoginResponse({
      token: 'token',
      user: { id: '1', username: 'ana', avatarUrl: null, roles: ['superAdmin'] },
    })).toThrow('Invalid login response');
  });

  it('rejects an invalid token', () => {
    expect(() => mapLoginResponse({
      token: '',
      user: { id: '1', username: 'ana', avatarUrl: null, roles: ['user'] },
    })).toThrow('Invalid login response');
  });

  it('rejects a missing or invalid user', () => {
    expect(() => mapLoginResponse({ token: 'token' } as never)).toThrow('Invalid login response');
    expect(() => mapLoginResponse({ token: 'token', user: null })).toThrow('Invalid login response');
    expect(() => mapLoginResponse({ token: 'token', user: { id: '1' } })).toThrow('Invalid login response');
  });

  it('rejects the former flat login contract', () => {
    expect(() => mapLoginResponse({
      token: 'token', id: '1', username: 'ana', image: '/a.png', roles: ['user'],
    } as never)).toThrow('Invalid login response');
  });

  it('does not know legacy image or Dashboard fields', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/modules/auth/model/auth.mapper.ts'), 'utf8');
    expect(source).not.toMatch(/\bimage\b|dashboardConfig|mobileDashboardConfig/);
  });
});
