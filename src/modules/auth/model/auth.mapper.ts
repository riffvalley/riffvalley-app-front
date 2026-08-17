import type { LoginResponseDto } from '../api/auth.dto';
import { ROLES, type DashboardModuleConfig, type LoginBootstrapResult, type Role } from './auth.types';

const roleSet = new Set<string>(ROLES);

export function parseRoles(value: unknown): Role[] | null {
  if (!Array.isArray(value) || !value.every((role) => typeof role === 'string' && roleSet.has(role))) return null;
  return [...value] as Role[];
}

function parseDashboardConfig(value: unknown): DashboardModuleConfig[] | null {
  if (value == null) return null;
  if (!Array.isArray(value) || !value.every((item) =>
    typeof item === 'object' && item !== null &&
    typeof (item as Record<string, unknown>).id === 'string' &&
    typeof (item as Record<string, unknown>).enabled === 'boolean')) return null;
  return value.map((item) => ({
    id: (item as DashboardModuleConfig).id,
    enabled: (item as DashboardModuleConfig).enabled,
  }));
}

export function mapLoginResponse(dto: LoginResponseDto): LoginBootstrapResult {
  const roles = parseRoles(dto.roles ?? []);
  if (typeof dto.id !== 'string' || !dto.id || typeof dto.username !== 'string' || !dto.username ||
      typeof dto.token !== 'string' || !dto.token || roles === null ||
      (dto.image != null && typeof dto.image !== 'string')) {
    throw new Error('Invalid login response');
  }

  return {
    session: {
      token: dto.token,
      user: { id: dto.id, username: dto.username, avatarUrl: dto.image || null, roles },
    },
    legacyDashboardPreferences: {
      dashboardConfig: parseDashboardConfig(dto.dashboardConfig),
      mobileDashboardConfig: parseDashboardConfig(dto.mobileDashboardConfig),
    },
  };
}
