import { beforeEach, describe, expect, it } from 'vitest';
import { createLocalStorageAuthSessionStorage } from './auth.storage';

const key = 'rv.auth.session.v1';

describe('localStorageAuthSessionStorage', () => {
  beforeEach(() => localStorage.clear());

  it('restores V1 and persists exactly the versioned document', () => {
    const adapter = createLocalStorageAuthSessionStorage(localStorage);
    const session = { token: 't', user: { id: '1', username: 'u', avatarUrl: null, roles: ['user'] as const } };
    adapter.persist(session);
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual({ version: 1, ...session });
    expect(adapter.restore()).toEqual(session);
  });

  it.each([
    '{',
    JSON.stringify({ version: 2, token: 't', user: {} }),
    JSON.stringify({ version: 1, token: 't', user: { id: '1', username: 'u', avatarUrl: null, roles: ['unknown'] } }),
  ])('rejects and clears invalid V1 documents', (document) => {
    localStorage.setItem(key, document);
    expect(createLocalStorageAuthSessionStorage(localStorage).restore()).toBeNull();
    expect(localStorage.getItem(key)).toBeNull();
  });

  it.each([['["user","admin"]', ['user', 'admin']], ['user,riffValley', ['user', 'riffValley']]])('migrates legacy roles %s', (rawRoles, roles) => {
    localStorage.setItem('token', 't'); localStorage.setItem('username', 'u'); localStorage.setItem('userId', '1'); localStorage.setItem('image', '/a'); localStorage.setItem('roles', rawRoles);
    const restored = createLocalStorageAuthSessionStorage(localStorage).restore();
    expect(restored?.user).toEqual({ id: '1', username: 'u', avatarUrl: '/a', roles });
    expect(localStorage.getItem(key)).not.toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('clears new and legacy auth keys but not dashboard preferences', () => {
    localStorage.setItem(key, '{}'); localStorage.setItem('token', 't'); localStorage.setItem('dashboardConfig', 'keep');
    createLocalStorageAuthSessionStorage(localStorage).clear();
    expect(localStorage.getItem(key)).toBeNull(); expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('dashboardConfig')).toBe('keep');
  });
});
