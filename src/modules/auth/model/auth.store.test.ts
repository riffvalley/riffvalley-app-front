import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthSessionStorage } from './auth.storage';
import { createAuthStore, useAuthStore } from './auth.store';
import { requestLogin } from '../api/auth.api';

vi.mock('../api/auth.api', () => ({ requestLogin: vi.fn() }));

describe('auth store', () => {
  beforeEach(() => setActivePinia(createPinia()));
  it('shares concurrent initialization and derives all public state from the session', async () => {
    const session = { token: 't', user: { id: '1', username: 'u', avatarUrl: null, roles: ['user'] as const } };
    const storage: AuthSessionStorage = { restore: vi.fn(() => session), persist: vi.fn(), clear: vi.fn() };
    const auth = createAuthStore(storage)();
    await Promise.all([auth.initialize(), auth.initialize(), auth.initialize()]);
    await auth.initialize();
    expect(storage.restore).toHaveBeenCalledTimes(1);
    expect(auth.currentUser).toEqual(session.user); expect(auth.roles).toEqual(['user']); expect(auth.isAuthenticated).toBe(true);
    expect(auth.$state).toHaveProperty('session');
  });
  it('persists a valid login and updates the session state', async () => {
    const session = { token: 'new', user: { id: '2', username: 'ana', avatarUrl: null, roles: ['user'] as const } };
    vi.mocked(requestLogin).mockResolvedValue({ session, legacyDashboardPreferences: { dashboardConfig: null, mobileDashboardConfig: null } });
    const storage: AuthSessionStorage = { restore: vi.fn(), persist: vi.fn(), clear: vi.fn() };
    const auth = createAuthStore(storage)();
    await auth.login({ username: 'ana', password: 'secret' });
    expect(auth.session).toEqual(session);
    expect(auth.status).toBe('authenticated');
    expect(storage.persist).toHaveBeenCalledWith(session);
  });
  it('updates only the avatar and persists it', async () => {
    const session = { token: 't', user: { id: '1', username: 'u', avatarUrl: null, roles: ['user'] as const } };
    const storage: AuthSessionStorage = { restore: () => session, persist: vi.fn(), clear: vi.fn() };
    const auth = createAuthStore(storage)(); await auth.initialize();
    auth.updateCurrentUser({ avatarUrl: '/new' });
    expect(auth.currentUser).toEqual({ ...session.user, avatarUrl: '/new' });
    expect(storage.persist).toHaveBeenCalledOnce();
  });
  it('becomes anonymous and clears storage on logout', async () => {
    const storage: AuthSessionStorage = { restore: () => null, persist: vi.fn(), clear: vi.fn() };
    const auth = createAuthStore(storage)(); await auth.initialize(); auth.logout();
    expect(auth.status).toBe('anonymous'); expect(storage.clear).toHaveBeenCalledOnce();
  });
  it('keeps session and access token out of the feature facade', () => {
    const auth = useAuthStore();
    expect(auth).not.toHaveProperty('session');
    expect(auth).not.toHaveProperty('getAccessToken');
  });
});
