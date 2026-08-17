import type { LoginResponseDto } from '../api/auth.dto';
import { ROLES, type AuthSession, type Role } from './auth.types';

const roleSet = new Set<string>(ROLES);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isRole(value: unknown): value is Role {
  return typeof value === 'string' && roleSet.has(value);
}

export function parseRoles(value: unknown): Role[] | null {
  if (!Array.isArray(value) || !value.every(isRole)) return null;
  return value.map((role) => role);
}

export function mapLoginResponse(dto: LoginResponseDto): AuthSession {
  if (typeof dto.token !== 'string' || !dto.token ||
      !isRecord(dto.user)) {
    throw new Error('Invalid login response');
  }

  const user = dto.user;
  const roles = parseRoles(user.roles);
  if (typeof user.id !== 'string' || !user.id ||
      typeof user.username !== 'string' || !user.username ||
      (user.avatarUrl !== null && typeof user.avatarUrl !== 'string') ||
      roles === null) {
    throw new Error('Invalid login response');
  }

  return {
    token: dto.token,
    user: {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      roles,
    },
  };
}
