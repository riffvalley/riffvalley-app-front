import {
  consumeAuthenticatedEvents,
  type AuthenticatedEventsClientOptions,
} from "@/shared/realtime/authenticatedEventsClient";
import { readSseMessages } from "@/shared/realtime/readSseMessages";
import { editorialClientId } from "@/shared/realtime/editorialClientId";
import { parseReunionsEvent } from "./reunionsEventsParser";
import type { ReunionsEvent } from "../types/reunions";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/+$/, "");
export const reunionsEventsUrl = `${apiBaseUrl}/reunions/events`;

export function consumeReunionsEvents(
  options: Omit<
    AuthenticatedEventsClientOptions<ReunionsEvent>,
    "url" | "clientIdHeader" | "clientId" | "readEvents"
  >,
  signal: AbortSignal
): Promise<void> {
  return consumeAuthenticatedEvents(
    {
      ...options,
      url: reunionsEventsUrl,
      clientIdHeader: "X-Riff-Valley-Client-Id",
      clientId: editorialClientId,
      readEvents: async (body, onEvent, streamSignal) =>
        readSseMessages(
          body,
          (message) => {
            const event = parseReunionsEvent(message);
            if (event) onEvent(event);
          },
          streamSignal
        ),
    },
    signal
  );
}
