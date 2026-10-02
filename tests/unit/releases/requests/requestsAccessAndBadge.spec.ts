// @vitest-environment happy-dom
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import router from '../../../../src/app/router';
import { createSessionGuard } from '../../../../src/app/router/sessionGuard';
import { usePetitionsStore } from '../../../../src/stores/petitions/petitions';

describe('requests access and pending badge state', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('declares authenticated babyUser access for submission and riffValley for administration', () => {
    const suggest = router.getRoutes().find((route) => route.path === '/suggest');
    const petitions = router.getRoutes().find((route) => route.path === '/petitions');
    expect(suggest?.meta).toMatchObject({ requiresAuth: true, requiresRole: 'babyUser' });
    expect(petitions?.meta).toMatchObject({ requiresAuth: true, requiresRole: 'riffValley' });
    expect(typeof suggest?.components?.default).toBe('function');
    expect(typeof petitions?.components?.default).toBe('function');
  });

  it.each([
    ['/suggest', ['babyUser'], true], ['/suggest', ['riffValley'], false],
    ['/petitions', ['riffValley'], true], ['/petitions', ['superUser'], false],
  ])('guard permits route %s for roles %j: %s', (path, roles, allowed) => {
    const guard = createSessionGuard(() => ({ isAuthenticated: true, roles }), () => false);
    const result = guard(router.resolve(path));
    expect(result === true).toBe(allowed);
  });

  it('redirects anonymous users to Login for both request routes', () => {
    const guard = createSessionGuard(() => ({ isAuthenticated: false, roles: [] }), () => false);
    expect(guard(router.resolve('/suggest'))).toEqual({ name: 'Login' });
    expect(guard(router.resolve('/petitions'))).toEqual({ name: 'Login' });
  });

  it('stores pending count as a plain presentation value and replaces it on sync', () => {
    const store = usePetitionsStore();
    expect(store.pendingCount).toBe(0);
    store.setPendingCount(4);
    expect(store.pendingCount).toBe(4);
    store.setPendingCount(1);
    expect(store.pendingCount).toBe(1);
  });
});
