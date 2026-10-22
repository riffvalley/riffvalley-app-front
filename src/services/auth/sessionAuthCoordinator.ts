const SESSION_MUTATION_LOCK = "riffvalley-app-auth-session-mutation";
const SESSION_CHANNEL_NAME = "riffvalley-app-auth-session";
const SESSION_LOCK_WAIT_TIMEOUT_MS = 30_000;

interface LogoutMessage {
  type: "logout";
}

interface LoginMessage {
  type: "login";
}

interface SessionCsrfUpdatedMessage {
  type: "session-csrf-updated";
}

type LogoutListener = () => void;
type LoginListener = () => void;
type SessionCsrfListener = () => void;

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
    if (isSessionCsrfUpdatedMessage(event.data)) {
      sessionCsrfListeners.forEach((listener) => listener());
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

function isSessionCsrfUpdatedMessage(value: unknown): value is SessionCsrfUpdatedMessage {
  return typeof value === "object" && value !== null &&
    (value as Record<string, unknown>).type === "session-csrf-updated";
}

export class AuthSessionLockTimeoutError extends Error {
  constructor() {
    super("La coordinación de sesión tardó demasiado. Puedes volver a intentarlo.");
    this.name = "AuthSessionLockTimeoutError";
  }
}

export async function withAuthSessionLock<T>(operation: () => Promise<T>): Promise<T> {
  if (typeof navigator === "undefined" || !navigator.locks) return operation();

  const controller = new AbortController();
  let timedOut = false;
  const timeout = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, SESSION_LOCK_WAIT_TIMEOUT_MS);
  try {
    return await navigator.locks.request(
      SESSION_MUTATION_LOCK,
      { mode: "exclusive", signal: controller.signal },
      operation,
    );
  } catch (error: unknown) {
    if (timedOut) throw new AuthSessionLockTimeoutError();
    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
  }
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

export function broadcastSessionCsrfUpdated(): void {
  try {
    getChannel()?.postMessage({ type: "session-csrf-updated" } satisfies SessionCsrfUpdatedMessage);
  } catch {
    // Shared storage remains available in the current tab if peer notification fails.
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

export function subscribeToRemoteSessionCsrfUpdated(listener: SessionCsrfListener): () => void {
  getChannel();
  sessionCsrfListeners.add(listener);
  return () => sessionCsrfListeners.delete(listener);
}
