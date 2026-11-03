import api from "@services/api/api";
import type {
  LineupExpansionSnapshot,
  ImportLineupRequest,
} from "../application/eventLineupExpansionPreparation";

export interface LineupExpansionArtistResult {
  artistId: string;
  name: string;
  position?: number;
}

export interface EventLineupExpansionResponse {
  status: "updated";
  eventId: string;
  addedArtists: LineupExpansionArtistResult[];
  existingArtists: LineupExpansionArtistResult[];
}

export class EventLineupExpansionProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EventLineupExpansionProtocolError";
  }
}

export class EventLineupExpansionConflictError extends Error {
  readonly code: string | undefined;
  readonly details: unknown;

  constructor(message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "EventLineupExpansionConflictError";
    this.code = code;
    this.details = details;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isArtistResult(value: unknown): value is LineupExpansionArtistResult {
  return (
    isRecord(value) &&
    typeof value.artistId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      value.artistId
    ) &&
    typeof value.name === "string" &&
    value.name.length > 0 &&
    (value.position === undefined ||
      (typeof value.position === "number" &&
        Number.isInteger(value.position) &&
        value.position >= 0))
  );
}

function parseResponse(value: unknown, expectedEventId: string): EventLineupExpansionResponse {
  if (
    !isRecord(value) ||
    value.status !== "updated" ||
    value.eventId !== expectedEventId ||
    !Array.isArray(value.addedArtists) ||
    !value.addedArtists.every(isArtistResult) ||
    !Array.isArray(value.existingArtists) ||
    !value.existingArtists.every(isArtistResult)
  ) {
    throw new EventLineupExpansionProtocolError(
      "La respuesta de ampliación no coincide con el contrato o el evento confirmado."
    );
  }
  return {
    status: "updated",
    eventId: expectedEventId,
    addedArtists: value.addedArtists.map((artist) => ({ ...artist })),
    existingArtists: value.existingArtists.map((artist) => ({ ...artist })),
  };
}

function validateSnapshot(snapshot: LineupExpansionSnapshot): ImportLineupRequest {
  const { payload, eventId, operation } = snapshot;
  if (
    snapshot.kind !== "event-lineup-expansion" ||
    !eventId ||
    payload.batchId !== operation.batchId ||
    payload.rowId !== operation.rowId ||
    payload.sourceRow.rowId !== payload.rowId ||
    payload.artists.length < 1 ||
    payload.artists.length > 100
  ) {
    throw new EventLineupExpansionProtocolError("El snapshot de ampliación no es válido.");
  }
  return payload;
}

export async function importEventLineupExpansion(
  snapshot: LineupExpansionSnapshot
): Promise<EventLineupExpansionResponse> {
  const payload = validateSnapshot(snapshot);
  try {
    const { data } = await api.post<unknown>(
      `/events/${encodeURIComponent(snapshot.eventId)}/import-lineup`,
      payload
    );
    return parseResponse(data, snapshot.eventId);
  } catch (error) {
    if (error instanceof EventLineupExpansionProtocolError) throw error;
    const response = isRecord(error) && isRecord(error.response) ? error.response : undefined;
    if (response?.status === 409) {
      const data = isRecord(response.data) ? response.data : undefined;
      throw new EventLineupExpansionConflictError(
        typeof data?.message === "string"
          ? data.message
          : "El conflicto cambió; revisa la fila y vuelve a confirmar.",
        typeof data?.code === "string" ? data.code : undefined,
        data
      );
    }
    throw error;
  }
}
