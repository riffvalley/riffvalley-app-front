const SESSION_MUTATION_LOCK = "riffvalley-app-auth-session-mutation";
const SESSION_CHANNEL_NAME = "riffvalley-app-auth-session";

interface LogoutMessage {
  type: "logout";
}

interface LoginMessage {
  type: "login";
}

export interface SessionCsrfProofs {
  csrfToken: string;
  logoutCsrfToken: string;
}

interface SessionCsrfMessage extends SessionCsrfProofs {
  type: "session-csrf";
}

type LogoutListener = () => void;
type LoginListener = () => void;
type SessionCsrfListener = (proofs: SessionCsrfProofs) => void;

let channel: BroadcastChannel | null | undefined;
const logoutListeners = new Set<LogoutListener>();
const loginListeners = new Set<LoginListener>();
const sessionCsrfListeners = new Set<SessionCsrfListener>();

function getChannel(): BroadcastChannel | null {
  if (channel !== undefined) return channel;
  channel = typeof BroadcastChannel === "undefined"
    ? null
    : new BroadcastChannel(SESSION_CHANNEL_NAME);
  channel?.addEventListener("message", (event: MessageEvent<unknown>) => {
    if (isLogoutMessage(event.data)) {
      logoutListeners.forEach((listener) => listener());
      return;
    }
    if (isLoginMessage(event.data)) {
      loginListeners.forEach((listener) => listener());
      return;
    }
    if (isSessionCsrfMessage(event.data)) {
      sessionCsrfListeners.forEach((listener) => listener({
        csrfToken: event.data.csrfToken,
        logoutCsrfToken: event.data.logoutCsrfToken,
      }));
    }
  });
  return channel;
}

function isLogoutMessage(value: unknown): value is LogoutMessage {
  return typeof value === "object" && value !== null &&
    (value as Record<string, unknown>).type === "logout";
}

function isLoginMessage(value: unknown): value is LoginMessage {
  return typeof value === "object" && value !== null &&
    (value as Record<string, unknown>).type === "login";
}

function isSessionCsrfMessage(value: unknown): value is SessionCsrfMessage {
  if (typeof value !== "object" || value === null) return false;
  const message = value as Record<string, unknown>;
  return message.type === "session-csrf" &&
    typeof message.csrfToken === "string" &&
    typeof message.logoutCsrfToken === "string";
}

export function withAuthSessionLock<T>(operation: () => Promise<T>): Promise<T> {
  if (typeof navigator === "undefined" || !navigator.locks) return operation();
  return navigator.locks.request(SESSION_MUTATION_LOCK, { mode: "exclusive" }, operation);
}

export function broadcastAuthLogout(): void {
  try {
    getChannel()?.postMessage({ type: "logout" } satisfies LogoutMessage);
  } catch {
    // Local logout must still proceed if the browser cannot broadcast to peers.
  }
}

export function broadcastAuthLogin(): void {
  try {
    getChannel()?.postMessage({ type: "login" } satisfies LoginMessage);
  } catch {
    // The current tab remains authenticated if peer synchronization is unavailable.
  }
}

export function broadcastSessionCsrf(proofs: SessionCsrfProofs): void {
  try {
    getChannel()?.postMessage({ type: "session-csrf", ...proofs } satisfies SessionCsrfMessage);
  } catch {
    // CSRF proofs remain available in the current tab if peer synchronization fails.
  }
}

export function subscribeToRemoteAuthLogout(listener: LogoutListener): () => void {
  getChannel();
  logoutListeners.add(listener);
  return () => logoutListeners.delete(listener);
}

export function subscribeToRemoteAuthLogin(listener: LoginListener): () => void {
  getChannel();
  loginListeners.add(listener);
  return () => loginListeners.delete(listener);
}

export function subscribeToRemoteSessionCsrf(listener: SessionCsrfListener): () => void {
  getChannel();
  sessionCsrfListeners.add(listener);
  return () => sessionCsrfListeners.delete(listener);
}
