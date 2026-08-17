import type { AuthStatus, Role } from './auth.types';

export type AccessDecision = { allowed: true } | {
  allowed: false;
  reason: 'anonymous' | 'missing-role' | 'denied-role' | 'maintenance';
};

export interface AccessPolicyInput {
  status: AuthStatus;
  roles: readonly Role[];
  requiredRoles?: readonly Role[];
  deniedRoles?: readonly Role[];
  maintenance?: boolean;
  maintenanceRoute?: boolean;
}

export function decideAccess(input: AccessPolicyInput): AccessDecision {
  if (input.maintenance && !input.maintenanceRoute) return { allowed: false, reason: 'maintenance' };
  if (!input.maintenance && input.maintenanceRoute) return { allowed: false, reason: 'maintenance' };
  if (input.status !== 'authenticated') return { allowed: false, reason: 'anonymous' };
  if (input.deniedRoles?.some((role) => input.roles.includes(role))) return { allowed: false, reason: 'denied-role' };
  if (input.requiredRoles?.length && !input.requiredRoles.some((role) => input.roles.includes(role))) {
    return { allowed: false, reason: 'missing-role' };
  }
  return { allowed: true };
}
