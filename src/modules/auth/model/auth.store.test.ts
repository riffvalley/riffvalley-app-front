import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthSessionStorage } from './auth.storage';
import { createAuthStore } from './auth.store';

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
});
