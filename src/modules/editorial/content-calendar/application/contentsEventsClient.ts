import { editorialClientId } from "@/shared/realtime/editorialClientId";
import { consumeAuthenticatedEvents } from "@/shared/realtime/authenticatedEventsClient";
import {
  readContentsInvalidateEvents,
  type ContentsInvalidateEvent,
} from "./contentsInvalidateParser";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/+$/, "");
export const contentsEventsUrl = `${apiBaseUrl}/contents/events`;
// Preserve the Content Calendar origin contract while sharing the per-tab editorial ID.
export const contentCalendarClientId = editorialClientId;

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

export function consumeContentsEvents(
  options: ContentsEventsClientOptions,
  signal: AbortSignal
): Promise<void> {
  return consumeAuthenticatedEvents(
    {
      url: contentsEventsUrl,
      clientIdHeader: "X-Content-Calendar-Client-Id",
      clientId: contentCalendarClientId,
      getToken: options.getToken,
      renewSession: options.renewSession,
      generation: options.generation,
      isCurrent: options.isCurrent,
      readEvents: readContentsInvalidateEvents,
      onEvent: options.onInvalidate,
      fetcher: options.fetcher,
      random: options.random,
      onUnauthorized: options.onUnauthorized,
      onForbidden: options.onForbidden,
    },
    signal
  );
}
