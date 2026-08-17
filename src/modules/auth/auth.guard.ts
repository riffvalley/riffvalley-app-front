import type { NavigationGuard, RouteLocationNormalized } from 'vue-router';
import { decideAccess } from './model/auth.permissions';
import type { Role } from './model/auth.types';
import { useAuthStore } from './model/auth.store';

function rolesFromMeta(to: RouteLocationNormalized, key: 'requiredRoles' | 'deniedRoles'): Role[] | undefined {
  return to.matched.flatMap((record) => (record.meta[key] as Role[] | undefined) ?? []);
}

export const authGuard: NavigationGuard = async (to) => {
  const auth = useAuthStore();
  await auth.initialize();
  const isMaintenance = import.meta.env.VITE_MAINTENANCE_MODE === 'true';
  const maintenanceRoute = to.name === 'Maintenance';
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  if (!requiresAuth && !isMaintenance && !maintenanceRoute) return true;
  const decision = decideAccess({
    status: requiresAuth ? auth.status : 'authenticated',
    roles: auth.roles,
    requiredRoles: rolesFromMeta(to, 'requiredRoles'),
    deniedRoles: rolesFromMeta(to, 'deniedRoles'),
    maintenance: isMaintenance,
    maintenanceRoute,
  });
  if (decision.allowed) return true;
  if (decision.reason === 'maintenance') return { name: isMaintenance ? 'Maintenance' : 'Home' };
  if (decision.reason === 'anonymous') return { name: 'Login' };
  return { name: 'Home' };
};
