import { describe, expect, it } from 'vitest';
import { decideAccess } from './auth.permissions';

describe('decideAccess', () => {
  it('uses ANY semantics for required roles', () => {
    expect(decideAccess({ status: 'authenticated', roles: ['user'], requiredRoles: ['user', 'superUser'] })).toEqual({ allowed: true });
  });
  it('gives denied roles priority', () => {
    expect(decideAccess({ status: 'authenticated', roles: ['user', 'babyUser'], requiredRoles: ['user'], deniedRoles: ['babyUser'] })).toEqual({ allowed: false, reason: 'denied-role' });
  });
  it('does not give admin implicit permissions', () => {
    expect(decideAccess({ status: 'authenticated', roles: ['admin'], requiredRoles: ['user'] })).toEqual({ allowed: false, reason: 'missing-role' });
  });
  it('handles maintenance before authentication', () => {
    expect(decideAccess({ status: 'anonymous', roles: [], maintenance: true })).toEqual({ allowed: false, reason: 'maintenance' });
  });
});
