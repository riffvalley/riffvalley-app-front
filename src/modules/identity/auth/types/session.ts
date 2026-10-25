import type { UserRole } from "@/modules/identity/shared/types/auth";

export interface SessionAuthUser {
  id: string;
  username: string;
  role: UserRole;
  image?: string | null;
  dashboardButtonsEnabled?: boolean;
  dashboardConfig?: { id: string; enabled: boolean }[] | null;
  mobileDashboardConfig?: { id: string; enabled: boolean }[] | null;
}

export interface CsrfBootstrapResponse {
  csrfToken: string;
}

export interface SessionLoginResponse extends SessionAuthUser {
  token: string;
  csrfToken: string;
  logoutCsrfToken: string;
}

export interface SessionRefreshResponse {
  user: SessionAuthUser;
  token: string;
  csrfToken: string;
  logoutCsrfToken: string;
  expiresAt: string;
}

export type SessionAuthErrorCategory =
  | "unauthenticated"
  | "forbidden"
  | "rate-limited"
  | "unavailable"
  | "coordination-unavailable"
  | "conflict"
  | "bad-request"
  | "http-error"
  | "network-error"
  | "protocol-error";

export interface SessionAuthErrorResponse {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}
