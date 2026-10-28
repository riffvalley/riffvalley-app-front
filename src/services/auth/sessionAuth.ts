import axios, { AxiosHeaders, type AxiosInstance, type AxiosResponse } from "axios";
import { USER_ROLES, type UserRole } from "@interfaces/auth";
import type { LoginPayload } from "@interfaces/auth";
import {
  broadcastSessionCsrfUpdated,
  subscribeToRemoteSessionCsrfUpdated,
  withAuthSessionLock,
} from "@services/auth/sessionAuthCoordinator";

export const AUTH_SESSION_MODE_HEADER = "X-Auth-Session-Mode";
export const AUTH_SESSION_MODE = "refresh-v1";
export const CSRF_HEADER = "X-CSRF-Token";
export const REFRESH_OPERATION_HEADER = "X-Refresh-Operation";

// Session-bound CSRF proofs are not bearer credentials; share them by origin so
// every tab can refresh with the browser-managed HttpOnly cookie.
const SESSION_CSRF_STORAGE_KEY = "rv.auth.session-csrf";
const LOGOUT_CSRF_STORAGE_KEY = "rv.auth.logout-csrf";
const AUTH_REQUEST_TIMEOUT_MS = 15_000;

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

export class SessionAuthError extends Error {
  constructor(
    message: string,
    readonly category: SessionAuthErrorCategory,
    readonly status: number | null,
    readonly retryAfter: string | null = null,
  ) {
    super(message);
    this.name = "SessionAuthError";
  }
}

type OperationIdFactory = () => string;

const authHttp: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

function createOperationId(): string {
  return globalThis.crypto.randomUUID();
}

function readStoredCsrf(key: string): string | null {
  try {
    const sharedValue = localStorage.getItem(key);
    if (isNonEmptyString(sharedValue)) return sharedValue;

    // Migrate the per-tab proofs written by the previous App build.
    const legacyValue = sessionStorage.getItem(key);
    if (!isNonEmptyString(legacyValue)) return null;
    localStorage.setItem(key, legacyValue);
    sessionStorage.removeItem(key);
    return legacyValue;
  } catch {
    return null;
  }
}

function writeStoredCsrf(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
    sessionStorage.removeItem(key);
  } catch {
    // The in-memory session remains usable when browser storage is unavailable.
  }
}

function removeStoredCsrf(key: string): void {
  try {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  } catch {
    // A later page load will require a fresh login if storage cannot be cleared.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.some((role) => role === value);
}

function readDashboardConfig(value: unknown): SessionAuthUser["dashboardConfig"] | undefined {
  if (value === undefined || value === null) return value;
  if (!Array.isArray(value)) return undefined;

  const config: { id: string; enabled: boolean }[] = [];
  for (const item of value) {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.enabled !== "boolean"
    ) {
      return undefined;
    }
    config.push({ id: item.id, enabled: item.enabled });
  }
  return config;
}

function readUser(value: unknown): SessionAuthUser | null {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.username) ||
    !isUserRole(value.role)
  ) {
    return null;
  }

  const user: SessionAuthUser = {
    id: value.id,
    username: value.username,
    role: value.role,
  };

  if (value.image === null || typeof value.image === "string") user.image = value.image;
  if (typeof value.dashboardButtonsEnabled === "boolean") {
    user.dashboardButtonsEnabled = value.dashboardButtonsEnabled;
  }
  const dashboardConfig = readDashboardConfig(value.dashboardConfig);
  if (dashboardConfig !== undefined) user.dashboardConfig = dashboardConfig;
  const mobileDashboardConfig = readDashboardConfig(value.mobileDashboardConfig);
  if (mobileDashboardConfig !== undefined) user.mobileDashboardConfig = mobileDashboardConfig;
  return user;
}

function readLoginResponse(value: unknown): SessionLoginResponse | null {
  const user = readUser(value);
  if (
    !user ||
    !isRecord(value) ||
    !isNonEmptyString(value.token) ||
    !isNonEmptyString(value.csrfToken) ||
    !isNonEmptyString(value.logoutCsrfToken)
  ) {
    return null;
  }

  return {
    ...user,
    token: value.token,
    csrfToken: value.csrfToken,
    logoutCsrfToken: value.logoutCsrfToken,
  };
}

function readRefreshResponse(value: unknown): SessionRefreshResponse | null {
  if (!isRecord(value)) return null;
  const user = readUser(value.user);
  if (
    !user ||
    !isNonEmptyString(value.token) ||
    !isNonEmptyString(value.csrfToken) ||
    !isNonEmptyString(value.logoutCsrfToken) ||
    !isNonEmptyString(value.expiresAt) ||
    !Number.isFinite(Date.parse(value.expiresAt))
  ) {
    return null;
  }

  return {
    user,
    token: value.token,
    csrfToken: value.csrfToken,
    logoutCsrfToken: value.logoutCsrfToken,
    expiresAt: value.expiresAt,
  };
}

function protocolError(): SessionAuthError {
  return new SessionAuthError(
    "La respuesta de Identity no coincide con el contrato de sesión.",
    "protocol-error",
    null,
  );
}

function categoryForStatus(status: number): SessionAuthErrorCategory {
  switch (status) {
    case 400:
      return "bad-request";
    case 401:
      return "unauthenticated";
    case 403:
      return "forbidden";
    case 409:
      return "conflict";
    case 429:
      return "rate-limited";
    case 503:
      return "unavailable";
    default:
      return "http-error";
  }
}

function messageForCategory(category: SessionAuthErrorCategory): string {
  switch (category) {
    case "unauthenticated":
      return "La sesión no está disponible.";
    case "forbidden":
      return "Identity ha rechazado la solicitud de sesión.";
    case "rate-limited":
      return "Se ha alcanzado el límite de solicitudes de autenticación.";
    case "unavailable":
      return "El servicio de autenticación no está disponible temporalmente.";
    case "conflict":
      return "La operación de sesión ya se ha procesado.";
    case "bad-request":
      return "La solicitud de sesión no es válida.";
    case "network-error":
      return "No se pudo conectar con el servicio de autenticación.";
    case "protocol-error":
      return "La respuesta de Identity no coincide con el contrato de sesión.";
    default:
      return "Identity no pudo completar la solicitud de sesión.";
  }
}

function toSessionAuthError(error: unknown): SessionAuthError {
  if (error instanceof SessionAuthError) return error;

  if (!axios.isAxiosError<SessionAuthErrorResponse>(error)) {
    return new SessionAuthError(
      messageForCategory("network-error"),
      "network-error",
      null,
    );
  }

  const status = error.response?.status;
  if (status === undefined) {
    return new SessionAuthError(
      messageForCategory("network-error"),
      "network-error",
      null,
    );
  }

  const category = categoryForStatus(status);
  const retryAfter = AxiosHeaders.from(error.response?.headers).get("retry-after") ?? null;
  return new SessionAuthError(
    messageForCategory(category),
    category,
    status,
    retryAfter,
  );
}

export class SessionAuthTransport {
  private sessionCsrfToken = readStoredCsrf(SESSION_CSRF_STORAGE_KEY);
  private logoutCsrfToken = readStoredCsrf(LOGOUT_CSRF_STORAGE_KEY);
  private refreshInFlight: Promise<SessionRefreshResponse> | null = null;

  constructor(
    private readonly http: AxiosInstance = authHttp,
    private readonly operationIdFactory: OperationIdFactory = createOperationId,
  ) {
    subscribeToRemoteSessionCsrfUpdated(() => this.loadSessionCsrfTokens());
  }

  async getCsrf(): Promise<CsrfBootstrapResponse> {
    const response = await this.request(() =>
      this.http.get<unknown>("/auth/csrf", {
        withCredentials: true,
        timeout: AUTH_REQUEST_TIMEOUT_MS,
      }),
    );

    if (!isRecord(response) || !isNonEmptyString(response.csrfToken)) {
      throw protocolError();
    }

    return { csrfToken: response.csrfToken };
  }

  async login(payload: LoginPayload): Promise<SessionLoginResponse> {
    return withAuthSessionLock(async () => {
      const { csrfToken } = await this.getCsrf();
      const response = await this.request(() =>
        this.http.post<unknown>("/auth/login", payload, {
          withCredentials: true,
          timeout: AUTH_REQUEST_TIMEOUT_MS,
          headers: {
            "Content-Type": "application/json",
            [AUTH_SESSION_MODE_HEADER]: AUTH_SESSION_MODE,
            [CSRF_HEADER]: csrfToken,
          },
        }),
      );

      const session = readLoginResponse(response);
      if (!session) throw protocolError();

      this.setSessionCsrfTokens(session.csrfToken, session.logoutCsrfToken);
      return session;
    });
  }

  refresh(options: { operationId?: string } = {}): Promise<SessionRefreshResponse> {
    if (this.refreshInFlight) return this.refreshInFlight;

    const pending = this.performRefresh(options);
    this.refreshInFlight = pending;
    const clearPending = () => {
      if (this.refreshInFlight === pending) this.refreshInFlight = null;
    };
    void pending.then(clearPending, clearPending);
    return pending;
  }

  private async performRefresh(options: { operationId?: string }): Promise<SessionRefreshResponse> {
    return withAuthSessionLock(async () => {
      // Read after acquiring the cross-tab lock so the request uses the proof
      // written by the tab that most recently rotated the shared cookie.
      this.loadSessionCsrfTokens();
      const csrfToken = this.sessionCsrfToken;
      if (!csrfToken) throw protocolError();

      const operationId = options.operationId ?? this.operationIdFactory();
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operationId)) {
        throw new SessionAuthError(
          "El identificador de operación de refresh no es válido.",
          "protocol-error",
          null,
        );
      }
      const refresh = (proof: string) => this.request(() =>
        this.http.post<unknown>("/auth/refresh", {}, {
          withCredentials: true,
          timeout: AUTH_REQUEST_TIMEOUT_MS,
          headers: {
            "Content-Type": "application/json",
            [AUTH_SESSION_MODE_HEADER]: AUTH_SESSION_MODE,
            [REFRESH_OPERATION_HEADER]: operationId,
            [CSRF_HEADER]: proof,
          },
        }),
      );
      let response: unknown;
      try {
        response = await refresh(csrfToken);
      } catch (error: unknown) {
        if (error instanceof SessionAuthError && error.category === "unauthenticated") {
          this.clearSessionCsrfTokens();
          throw error;
        }
        if (!(error instanceof SessionAuthError) || error.category !== "forbidden") {
          throw error;
        }

        let recoveredCsrfToken: string;
        try {
          recoveredCsrfToken = await this.recoverRefreshCsrfToken();
        } catch (recoveryError: unknown) {
          if (
            recoveryError instanceof SessionAuthError &&
            recoveryError.category === "unauthenticated"
          ) {
            this.clearSessionCsrfTokens();
          }
          throw recoveryError;
        }
        this.setRefreshCsrfToken(recoveredCsrfToken);
        try {
          response = await refresh(recoveredCsrfToken);
        } catch (retryError: unknown) {
          if (
            retryError instanceof SessionAuthError &&
            retryError.category === "unauthenticated"
          ) {
            this.clearSessionCsrfTokens();
          }
          throw retryError;
        }
      }

      const session = readRefreshResponse(response);
      if (!session) throw protocolError();

      this.setSessionCsrfTokens(session.csrfToken, session.logoutCsrfToken);
      return session;
    });
  }

  async logout(): Promise<void> {
    const pendingRefresh = this.refreshInFlight;
    if (pendingRefresh) {
      try {
        await pendingRefresh;
      } catch (error: unknown) {
        if (error instanceof SessionAuthError && error.category === "unauthenticated") {
          throw error;
        }
      }
    }

    try {
      await this.revokeWithCurrentLogoutProof();
    } catch (error: unknown) {
      // A proof can expire while the app is idle. Refresh obtains a new
      // refresh proof when needed, then rotates both proofs before logout is
      // retried with the new logout proof.
      if (!(error instanceof SessionAuthError) || error.category !== "forbidden") {
        throw error;
      }

      await this.refresh();
      await this.revokeWithCurrentLogoutProof();
    }
  }

  private async revokeWithCurrentLogoutProof(): Promise<void> {
    return withAuthSessionLock(async () => {
      this.loadSessionCsrfTokens();
      const csrfToken = this.logoutCsrfToken;
      if (!csrfToken) throw protocolError();

      try {
        await this.request(async () => {
          const response = await this.http.post<void>("/auth/logout", {}, {
            withCredentials: true,
            timeout: AUTH_REQUEST_TIMEOUT_MS,
            headers: { "Content-Type": "application/json", [CSRF_HEADER]: csrfToken },
          });
          if (response.status !== 204) throw protocolError();
          return response;
        });
        this.clearSessionCsrfTokens();
      } catch (error: unknown) {
        if (error instanceof SessionAuthError && error.category === "unauthenticated") {
          this.clearSessionCsrfTokens();
        }
        throw error;
      }
    });
  }

  private async request<T>(request: () => Promise<AxiosResponse<T>>): Promise<T> {
    try {
      return (await request()).data;
    } catch (error: unknown) {
      throw toSessionAuthError(error);
    }
  }

  private async recoverRefreshCsrfToken(): Promise<string> {
    const response = await this.request(() =>
      this.http.get<unknown>("/auth/refresh/csrf", {
        withCredentials: true,
        timeout: AUTH_REQUEST_TIMEOUT_MS,
      }),
    );
    if (!isRecord(response) || !isNonEmptyString(response.csrfToken)) {
      throw protocolError();
    }
    return response.csrfToken;
  }

  private setSessionCsrfTokens(
    csrfToken: string,
    logoutCsrfToken: string,
  ): void {
    this.sessionCsrfToken = csrfToken;
    this.logoutCsrfToken = logoutCsrfToken;
    writeStoredCsrf(SESSION_CSRF_STORAGE_KEY, csrfToken);
    writeStoredCsrf(LOGOUT_CSRF_STORAGE_KEY, logoutCsrfToken);
    broadcastSessionCsrfUpdated();
  }

  private setRefreshCsrfToken(csrfToken: string): void {
    this.sessionCsrfToken = csrfToken;
    writeStoredCsrf(SESSION_CSRF_STORAGE_KEY, csrfToken);
    broadcastSessionCsrfUpdated();
  }

  private loadSessionCsrfTokens(): void {
    try {
      // Do not discard the in-memory proofs when browser storage is blocked.
      localStorage.getItem(SESSION_CSRF_STORAGE_KEY);
      localStorage.getItem(LOGOUT_CSRF_STORAGE_KEY);
    } catch {
      return;
    }
    this.sessionCsrfToken = readStoredCsrf(SESSION_CSRF_STORAGE_KEY);
    this.logoutCsrfToken = readStoredCsrf(LOGOUT_CSRF_STORAGE_KEY);
  }

  private clearSessionCsrfTokens(): void {
    this.sessionCsrfToken = null;
    this.logoutCsrfToken = null;
    removeStoredCsrf(SESSION_CSRF_STORAGE_KEY);
    removeStoredCsrf(LOGOUT_CSRF_STORAGE_KEY);
    broadcastSessionCsrfUpdated();
  }
}

export const sessionAuthTransport = new SessionAuthTransport();
