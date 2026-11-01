import { consumeAuthenticatedEvents } from "@/shared/realtime/authenticatedEventsClient";
import { editorialClientId } from "@/shared/realtime/editorialClientId";
import { readListsEvents, type ListsEvent } from "./listsEventsParser";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/+$/, "");
export const listsEventsUrl = `${apiBaseUrl}/lists/events`;
export const listsClientId = editorialClientId;

export interface ListsEventsClientOptions {
  getToken: () => string | null;
  renewSession: (generation: number) => Promise<"renewed" | "unauthenticated" | "stale">;
  generation: number;
  isCurrent: () => boolean;
  onEvent: (event: ListsEvent) => void;
  fetcher?: typeof fetch;
  random?: () => number;
  onUnauthorized?: () => void;
  onForbidden?: () => void;
}

export function consumeListsEvents(
  options: ListsEventsClientOptions,
  signal: AbortSignal
): Promise<void> {
  return consumeAuthenticatedEvents(
    {
      ...options,
      url: listsEventsUrl,
      clientIdHeader: "X-Riff-Valley-Client-Id",
      clientId: listsClientId,
      readEvents: readListsEvents,
    },
    signal
  );
}
