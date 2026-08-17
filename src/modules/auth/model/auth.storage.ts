import { parseRoles } from './auth.mapper';
import type { AuthSession } from './auth.types';

export interface StoredAuthSessionV1 {
  version: 1;
  token: string;
  user: AuthSession['user'];
}

export interface AuthSessionStorage {
  restore(): AuthSession | null;
  persist(session: AuthSession): void;
  clear(): void;
}

// Puerto de persistencia pequeño y exclusivo de Auth. No es un repository ni
// forma parte de una arquitectura de persistencia general de la aplicación.

const SESSION_KEY = 'rv.auth.session.v1';
const LEGACY_KEYS = ['token', 'username', 'userId', 'image', 'roles'] as const;

function readStoredSession(value: unknown): AuthSession | null {
  if (typeof value !== 'object' || value === null) return null;
  const doc = value as Record<string, unknown>;
  const user = doc.user as Record<string, unknown> | null;
  const roles = user ? parseRoles(user.roles) : null;
  if (doc.version !== 1 || typeof doc.token !== 'string' || !doc.token || !user ||
      typeof user.id !== 'string' || !user.id || typeof user.username !== 'string' || !user.username ||
      (user.avatarUrl !== null && typeof user.avatarUrl !== 'string') || roles === null) return null;
  return { token: doc.token, user: { id: user.id, username: user.username, avatarUrl: user.avatarUrl, roles } };
}

function parseLegacyRoles(raw: string): ReturnType<typeof parseRoles> {
  try { return parseRoles(JSON.parse(raw)); }
  catch {
    if (raw.includes('[') || raw.includes('{')) return null;
    return parseRoles(raw.split(',').map((role) => role.trim()).filter(Boolean));
  }
}

function removeLegacy(storage: Storage): void {
  LEGACY_KEYS.forEach((key) => storage.removeItem(key));
}

export function createLocalStorageAuthSessionStorage(storage: Storage): AuthSessionStorage {
  return {
    restore() {
      const raw = storage.getItem(SESSION_KEY);
      if (raw !== null) {
        try {
          const session = readStoredSession(JSON.parse(raw));
          if (session) return session;
        } catch { /* corrupt documents are cleared below */ }
        storage.removeItem(SESSION_KEY);
        removeLegacy(storage);
        return null;
      }

      const token = storage.getItem('token');
      const username = storage.getItem('username');
      const id = storage.getItem('userId');
      const rolesRaw = storage.getItem('roles');
      if (![token, username, id, rolesRaw].some((value) => value !== null)) return null;
      const roles = rolesRaw === null ? null : parseLegacyRoles(rolesRaw);
      if (!token || !username || !id || roles === null) {
        removeLegacy(storage);
        return null;
      }
      const session: AuthSession = { token, user: { id, username, avatarUrl: storage.getItem('image') || null, roles } };
      this.persist(session);
      removeLegacy(storage);
      return session;
    },
    persist(session) {
      const document: StoredAuthSessionV1 = { version: 1, token: session.token, user: session.user };
      storage.setItem(SESSION_KEY, JSON.stringify(document));
    },
    clear() {
      storage.removeItem(SESSION_KEY);
      removeLegacy(storage);
    },
  };
}

export const localStorageAuthSessionStorage = createLocalStorageAuthSessionStorage(window.localStorage);
