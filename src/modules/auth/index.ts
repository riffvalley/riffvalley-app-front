import { useAuthStore } from './model/auth.store';

export { useAuthStore };
export type { AuthenticatedUser, AuthSession, AuthStatus, CurrentUserPatch, DashboardModuleConfig, LoginCredentials, LogoutReason, Role } from './model/auth.types';
export { decideAccess, type AccessDecision } from './model/auth.permissions';
export { authGuard } from './auth.guard';
export { configureAuthHttp } from './auth.http';
export { default as LoginPage } from './pages/LoginPage.vue';

export const authInfrastructure = {
  getAccessToken(): string | null { return useAuthStore().getAccessToken(); },
};
