export const ROLES = ['babyUser', 'user', 'riffValley', 'superUser', 'admin'] as const;

export type Role = (typeof ROLES)[number];
export type AuthStatus = 'initializing' | 'authenticated' | 'anonymous';
export type LogoutReason = 'manual' | 'expired' | 'invalid-session';

export interface AuthenticatedUser {
  id: string;
  username: string;
  avatarUrl: string | null;
  roles: Role[];
}

export interface AuthSession {
  token: string;
  user: AuthenticatedUser;
}

export type CurrentUserPatch = Partial<Pick<AuthenticatedUser, 'avatarUrl'>>;

export interface DashboardModuleConfig {
  id: string;
  enabled: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginBootstrapResult {
  session: AuthSession;
  legacyDashboardPreferences: {
    dashboardConfig: DashboardModuleConfig[] | null;
    mobileDashboardConfig: DashboardModuleConfig[] | null;
  };
}
