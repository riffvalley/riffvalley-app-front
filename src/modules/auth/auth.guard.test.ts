import { describe, expect, it, vi } from 'vitest';
import { createAuthGuard } from './auth.guard';
import type { AuthStatus, Role } from './model/auth.types';

function route(name: string, meta: Record<string, unknown> = {}) {
  return { name, matched: [{ meta }], meta, path: name === 'Import' ? '/import' : '/' } as never;
}
function setup(status: AuthStatus, roles: Role[], maintenance = false) {
  const initialize = vi.fn(async () => undefined);
  const auth = { status, roles, initialize, currentUser: null, isAuthenticated: status === 'authenticated', login: vi.fn(), logout: vi.fn(), hasRole: vi.fn(), hasAnyRole: vi.fn(), updateCurrentUser: vi.fn() };
  const guard = createAuthGuard({ useAuth: () => auth, isMaintenance: () => maintenance });
  return { guard, initialize };
}

describe('auth guard adapter', () => {
  it('awaits initialization before deciding anonymous protected access', async () => {
    const { guard, initialize } = setup('anonymous', []);
    await expect(guard(route('Private', { requiresAuth: true }), {} as never, vi.fn())).resolves.toEqual({ name: 'Login' });
    expect(initialize).toHaveBeenCalledOnce();
  });
  it('redirects a missing role to Home', async () => {
    const { guard } = setup('authenticated', ['user']);
    await expect(guard(route('Private', { requiresAuth: true, requiredRoles: ['superUser'] }), {} as never, vi.fn())).resolves.toEqual({ name: 'Home' });
  });
  it('redirects denied babyUser on import to Home', async () => {
    const { guard } = setup('authenticated', ['babyUser']);
    await expect(guard(route('Import', { requiresAuth: true, deniedRoles: ['babyUser'] }), {} as never, vi.fn())).resolves.toEqual({ name: 'Home' });
  });
  it('redirects to Maintenance while maintenance is active', async () => {
    const { guard } = setup('anonymous', [], true);
    await expect(guard(route('Private', { requiresAuth: true }), {} as never, vi.fn())).resolves.toEqual({ name: 'Maintenance' });
  });
  it('redirects away from Maintenance when maintenance is inactive', async () => {
    const { guard } = setup('anonymous', []);
    await expect(guard(route('Maintenance'), {} as never, vi.fn())).resolves.toEqual({ name: 'Home' });
  });
});
