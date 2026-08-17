import { computed, ref } from 'vue';
import { defineStore, type Pinia } from 'pinia';
import { requestLogin } from '../api/auth.api';
import type { AuthSessionStorage } from './auth.storage';
import { localStorageAuthSessionStorage } from './auth.storage';
import type { AuthSession, AuthStatus, CurrentUserPatch, LoginCredentials, LogoutReason, Role } from './auth.types';

export function createAuthStore(sessionStorage: AuthSessionStorage) {
  return defineStore('auth', () => {
    const status = ref<AuthStatus>('initializing');
    const session = ref<AuthSession | null>(null);
    let initialization: Promise<void> | null = null;

    const currentUser = computed(() => session.value?.user ?? null);
    const roles = computed(() => currentUser.value?.roles ?? []);
    const isAuthenticated = computed(() => status.value === 'authenticated');

    function initialize(): Promise<void> {
      if (initialization) return initialization;
      initialization = Promise.resolve().then(() => {
        const restored = sessionStorage.restore();
        session.value = restored;
        status.value = restored ? 'authenticated' : 'anonymous';
      }).catch(() => {
        session.value = null;
        status.value = 'anonymous';
      });
      return initialization;
    }

    async function login(credentials: LoginCredentials) {
      const result = await requestLogin(credentials);
      sessionStorage.persist(result.session);
      session.value = result.session;
      status.value = 'authenticated';
      return result.legacyDashboardPreferences;
    }

    function logout(_reason: LogoutReason = 'manual'): void {
      sessionStorage.clear();
      session.value = null;
      status.value = 'anonymous';
    }

    function hasRole(role: Role): boolean { return roles.value.includes(role); }
    function hasAnyRole(expected: readonly Role[]): boolean { return expected.some(hasRole); }

    function updateCurrentUser(patch: CurrentUserPatch): void {
      if (!session.value) return;
      session.value = { ...session.value, user: { ...session.value.user, ...patch } };
      sessionStorage.persist(session.value);
    }

    return { status, session, currentUser, roles, isAuthenticated, initialize, login, logout, hasRole, hasAnyRole, updateCurrentUser };
  });
}

const useAuthPiniaStore = createAuthStore(localStorageAuthSessionStorage);

export function useAuthStore(pinia?: Pinia) {
  const store = useAuthPiniaStore(pinia);
  return {
    get status() { return store.status; },
    get currentUser() { return store.currentUser; },
    get roles() { return store.roles; },
    get isAuthenticated() { return store.isAuthenticated; },
    initialize: store.initialize,
    login: store.login,
    logout: store.logout,
    hasRole: store.hasRole,
    hasAnyRole: store.hasAnyRole,
    updateCurrentUser: store.updateCurrentUser,
  };
}

export function createAuthInfrastructure(pinia: Pinia) {
  const store = useAuthPiniaStore(pinia);
  return {
    getAccessToken(): string | null { return store.session?.token ?? null; },
  };
}
