import {
  readContentsInvalidateEvents,
  type ContentsInvalidateEvent,
} from "./contentsInvalidateParser";
import { createReconnectDelay } from "./contentCalendarRealtime";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/+$/, "");
export const contentsEventsUrl = `${apiBaseUrl}/contents/events`;
// One ephemeral ID per loaded tab; stream and calendar mutations share this origin.
export const contentCalendarClientId = crypto.randomUUID();

export interface ContentsEventsClientOptions {
  getToken: () => string | null;
  renewSession: (generation: number) => Promise<"renewed" | "unauthenticated" | "stale">;
  generation: number;
  isCurrent: () => boolean;
  onInvalidate: (event: ContentsInvalidateEvent) => void;
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

/** Owns one Bearer fetch stream and its reconnect loop for a single calendar session. */
export async function consumeContentsEvents(
  options: ContentsEventsClientOptions,
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
      response = await fetcher(contentsEventsUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "text/event-stream",
          "X-Content-Calendar-Client-Id": contentCalendarClientId,
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
      await readContentsInvalidateEvents(
        response.body,
        (event) => {
          if (options.isCurrent() && !signal.aborted) options.onInvalidate(event);
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
