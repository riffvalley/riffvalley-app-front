import type { LoginResponseDto } from '../api/auth.dto';
import { ROLES, type AuthSession, type Role } from './auth.types';

const roleSet = new Set<string>(ROLES);

function isRole(value: unknown): value is Role {
  return typeof value === 'string' && roleSet.has(value);
}

export function parseRoles(value: unknown): Role[] | null {
  if (!Array.isArray(value) || !value.every(isRole)) return null;
  return value.map((role) => role);
}

export function mapLoginResponse(dto: LoginResponseDto): AuthSession {
  const roles = parseRoles(dto.roles);
  if (typeof dto.id !== 'string' || !dto.id || typeof dto.username !== 'string' || !dto.username ||
      typeof dto.token !== 'string' || !dto.token || roles === null ||
      (dto.image != null && typeof dto.image !== 'string')) {
    throw new Error('Invalid login response');
  }

  return {
    token: dto.token,
    user: { id: dto.id, username: dto.username, avatarUrl: dto.image || null, roles },
  };
}
