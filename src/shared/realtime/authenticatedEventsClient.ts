import { createReconnectDelay } from "./reconnectDelay";

export interface AuthenticatedEventsClientOptions<TEvent> {
  url: string;
  clientIdHeader: string;
  clientId: string;
  getToken: () => string | null;
  renewSession: (generation: number) => Promise<"renewed" | "unauthenticated" | "stale">;
  generation: number;
  isCurrent: () => boolean;
  readEvents: (
    body: ReadableStream<Uint8Array>,
    onEvent: (event: TEvent) => void,
    signal: AbortSignal
  ) => Promise<void>;
  onEvent: (event: TEvent) => void;
  fetcher?: typeof fetch;
  random?: () => number;
  onUnauthorized?: () => void;
  onForbidden?: () => void;
}

function abortableDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const connectivityTarget = typeof window === "undefined" ? undefined : window;
    const finish = () => {
      clearTimeout(timer);
      connectivityTarget?.removeEventListener("online", finish);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    connectivityTarget?.addEventListener("online", finish, { once: true });
    signal.addEventListener("abort", finish, { once: true });
  });
}

/** Owns one authenticated Fetch stream and reconnect loop for one active feature view. */
export async function consumeAuthenticatedEvents<TEvent>(
  options: AuthenticatedEventsClientOptions<TEvent>,
  signal: AbortSignal
): Promise<void> {
  const fetcher = options.fetcher ?? fetch;
  let attempt = 0;
  let retriedAfter401 = false;

  while (!signal.aborted && options.isCurrent()) {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      await abortableDelay(30_000, signal);
      continue;
    }

    const token = options.getToken();
    if (!token) return;
    let response: Response;
    try {
      response = await fetcher(options.url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "text/event-stream",
          [options.clientIdHeader]: options.clientId,
        },
        signal,
        credentials: "omit",
        cache: "no-store",
      });
    } catch {
      if (signal.aborted || !options.isCurrent()) return;
      attempt += 1;
      await abortableDelay(createReconnectDelay(attempt, options.random), signal);
      continue;
    }

    if (response.status === 401) {
      const latestToken = options.getToken();
      if (retriedAfter401) return;
      let result: "renewed" | "unauthenticated" | "stale";
      try {
        result =
          latestToken && latestToken !== token
            ? "renewed"
            : await options.renewSession(options.generation);
      } catch {
        if (signal.aborted || !options.isCurrent()) return;
        attempt += 1;
        await abortableDelay(createReconnectDelay(attempt, options.random), signal);
        continue;
      }
      if (result === "renewed" && options.getToken() && options.isCurrent()) {
        retriedAfter401 = true;
        attempt = 0;
        continue;
      }
      if (result === "unauthenticated") options.onUnauthorized?.();
      return;
    }

    if (response.status === 403) {
      options.onForbidden?.();
      return;
    }
    if (!response.ok || !response.body) {
      attempt += 1;
      await abortableDelay(createReconnectDelay(attempt, options.random), signal);
      continue;
    }

    attempt = 0;
    retriedAfter401 = false;
    try {
      await options.readEvents(
        response.body,
        (event) => {
          if (options.isCurrent() && !signal.aborted) options.onEvent(event);
        },
        signal
      );
    } catch {
      if (signal.aborted || !options.isCurrent()) return;
    }
    if (signal.aborted || !options.isCurrent()) return;
    attempt += 1;
    await abortableDelay(createReconnectDelay(attempt, options.random), signal);
  }
}
