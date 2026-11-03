import api from "@services/api/api";
import { queryOptions } from "@tanstack/vue-query";
import type { ImportSnapshot } from "../application/eventImportPreparation";
export type {
  ImportArtistDto,
  ImportBatchRequest,
  ImportEventRowDto,
} from "./eventImportContracts";

export interface ImportConflict {
  rowId: string;
  kind: "participation" | "duplicate";
  code:
    | "CONCERT_DUPLICATE"
    | "CONCERT_ARTIST_DATE_LOCALITY_CONFLICT"
    | "CONCERT_FESTIVAL_PARTICIPATION_CONFLICT"
    | "FESTIVAL_DUPLICATE"
    | "FESTIVAL_POSSIBLE_DUPLICATE";
  severity: "blocking" | "review";
  message: string;
  relatedRowIds: string[];
  existingEventIds: string[];
  matchingArtists: Array<{ artistId: string | null; name: string }>;
  addableArtists: Array<{ artistId: string | null; name: string }>;
  candidateEventIds: string[];
}

export interface ExistingEventDetail {
  id: string;
  type?: "concert" | "festival";
  name?: string | null;
  startDate?: string;
  endDate?: string | null;
  tourId?: string | null;
  venue?: { name?: string; locality?: { name?: string; province?: string | null } };
  lineup?: Array<{ artistId?: string | null; name: string }>;
}

export class ExistingEventDetailProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExistingEventDetailProtocolError";
  }
}

function parseExistingEventDetail(value: unknown, requestedId: string): ExistingEventDetail {
  if (!isRecord(value) || value.id !== requestedId) {
    throw new ExistingEventDetailProtocolError("El servidor devolvió un evento inválido.");
  }

  const detail: ExistingEventDetail = { id: requestedId };
  if (value.type === "concert" || value.type === "festival") detail.type = value.type;
  if (value.name === null || isString(value.name)) detail.name = value.name;
  if (isString(value.startDate)) detail.startDate = value.startDate;
  if (value.endDate === null || isString(value.endDate)) detail.endDate = value.endDate;
  if (value.tourId === null || isString(value.tourId)) detail.tourId = value.tourId;
  if (isRecord(value.venue)) {
    const venue: NonNullable<ExistingEventDetail["venue"]> = {};
    if (isString(value.venue.name)) venue.name = value.venue.name;
    if (isRecord(value.venue.locality)) {
      const locality: NonNullable<NonNullable<ExistingEventDetail["venue"]>["locality"]> = {};
      if (isString(value.venue.locality.name)) locality.name = value.venue.locality.name;
      if (value.venue.locality.province === null || isString(value.venue.locality.province)) {
        locality.province = value.venue.locality.province;
      }
      venue.locality = locality;
    }
    detail.venue = venue;
  }
  if (Array.isArray(value.lineup)) {
    detail.lineup = value.lineup.flatMap((artist) =>
      isRecord(artist) && isString(artist.name)
        ? [{ artistId: isString(artist.artistId) ? artist.artistId : null, name: artist.name }]
        : []
    );
  }
  return detail;
}

export async function getExistingEventDetail(
  eventId: string,
  signal?: AbortSignal
): Promise<ExistingEventDetail> {
  const { data } = await api.get<unknown>(`/events/${encodeURIComponent(eventId)}`, { signal });
  return parseExistingEventDetail(data, eventId);
}

export const existingEventDetailQueryKeys = {
  detail: (eventId: string) => ["events-festivals", "event-detail", eventId] as const,
};

export const EXISTING_EVENT_DETAIL_STALE_TIME = 15_000;

export function existingEventDetailQueryOptions(eventId: string) {
  return queryOptions({
    queryKey: existingEventDetailQueryKeys.detail(eventId),
    queryFn: ({ signal }) => getExistingEventDetail(eventId, signal),
    staleTime: EXISTING_EVENT_DETAIL_STALE_TIME,
  });
}

interface ImportResultBase {
  rowId: string;
  code?: string;
  message?: string;
}

export interface ImportCreatedResult extends ImportResultBase {
  status: "created";
  eventId: string;
  tourId?: string;
  localityId?: string;
  venueId?: string;
  artistIds?: string[];
  replayed?: boolean;
}

export interface ImportConflictResult extends ImportResultBase {
  status: "conflict";
  conflicts?: ImportConflict[];
  candidates?: Array<{ id: string; name: string }>;
}

export interface ImportInvalidResult extends ImportResultBase {
  status: "invalid";
  candidates?: Array<{ id: string; name: string }>;
}

export interface ImportFailedResult extends ImportResultBase {
  status: "failed";
}

export type ImportBatchRowResult =
  ImportCreatedResult | ImportConflictResult | ImportInvalidResult | ImportFailedResult;

export interface CorrelatedImportResult {
  operationRowId: string;
  rowKey: string;
  revision: number;
  result: ImportBatchRowResult;
}

export interface ImportBatchResponse {
  batchId: string;
  results: CorrelatedImportResult[];
}

export class ImportBatchProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportBatchProtocolError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isCandidateList(value: unknown): value is Array<{ id: string; name: string }> {
  return (
    Array.isArray(value) &&
    value.every(
      (candidate) => isRecord(candidate) && isString(candidate.id) && isString(candidate.name)
    )
  );
}

function isConflict(value: unknown): value is ImportConflict {
  return (
    isRecord(value) &&
    isString(value.rowId) &&
    (value.kind === "participation" || value.kind === "duplicate") &&
    [
      "CONCERT_DUPLICATE",
      "CONCERT_ARTIST_DATE_LOCALITY_CONFLICT",
      "CONCERT_FESTIVAL_PARTICIPATION_CONFLICT",
      "FESTIVAL_DUPLICATE",
      "FESTIVAL_POSSIBLE_DUPLICATE",
    ].includes(String(value.code)) &&
    (value.severity === "blocking" || value.severity === "review") &&
    isString(value.message) &&
    isStringList(value.relatedRowIds) &&
    isStringList(value.existingEventIds) &&
    isStringList(value.candidateEventIds) &&
    Array.isArray(value.matchingArtists) &&
    value.matchingArtists.every(
      (artist) =>
        isRecord(artist) &&
        (artist.artistId === null || isString(artist.artistId)) &&
        isString(artist.name)
    ) &&
    Array.isArray(value.addableArtists) &&
    value.addableArtists.every(
      (artist) =>
        isRecord(artist) &&
        (artist.artistId === null || isString(artist.artistId)) &&
        isString(artist.name)
    )
  );
}

function hasOptionalStringFields(value: Record<string, unknown>, fields: string[]): boolean {
  return fields.every((field) => value[field] === undefined || isString(value[field]));
}

function isRowResult(value: unknown): value is ImportBatchRowResult {
  if (
    !isRecord(value) ||
    !isString(value.rowId) ||
    !hasOptionalStringFields(value, ["code", "message"])
  ) {
    return false;
  }
  switch (value.status) {
    case "created":
      return (
        isString(value.eventId) &&
        hasOptionalStringFields(value, ["tourId", "localityId", "venueId"]) &&
        (value.artistIds === undefined || isStringList(value.artistIds)) &&
        (value.replayed === undefined || typeof value.replayed === "boolean")
      );
    case "conflict":
      return (
        (value.conflicts === undefined ||
          (Array.isArray(value.conflicts) &&
            value.conflicts.every(
              (conflict) => isConflict(conflict) && conflict.rowId === value.rowId
            ))) &&
        (value.candidates === undefined || isCandidateList(value.candidates))
      );
    case "invalid":
      return value.candidates === undefined || isCandidateList(value.candidates);
    case "failed":
      return true;
    default:
      return false;
  }
}

function validateAndCorrelate(snapshot: ImportSnapshot, value: unknown): ImportBatchResponse {
  if (
    !isRecord(value) ||
    value.batchId !== snapshot.batchId ||
    !Array.isArray(value.results) ||
    value.results.length !== snapshot.rows.length
  ) {
    throw new ImportBatchProtocolError("El servidor devolvió una respuesta incompleta o inválida.");
  }

  const rowsById = new Map(snapshot.rows.map((row) => [row.operationRowId, row]));
  const seen = new Set<string>();
  const correlated = value.results.map((rawResult) => {
    if (!isRowResult(rawResult)) {
      throw new ImportBatchProtocolError("El servidor devolvió un resultado de fila inválido.");
    }
    const sourceRow = rowsById.get(rawResult.rowId);
    if (!sourceRow || seen.has(rawResult.rowId)) {
      throw new ImportBatchProtocolError(
        "El servidor devolvió identificadores de fila inconsistentes."
      );
    }
    seen.add(rawResult.rowId);
    return {
      operationRowId: rawResult.rowId,
      rowKey: sourceRow.rowKey,
      revision: sourceRow.revision,
      result: rawResult,
    };
  });

  if (seen.size !== rowsById.size) {
    throw new ImportBatchProtocolError("Faltan resultados para algunas filas enviadas.");
  }
  return { batchId: snapshot.batchId, results: correlated };
}

export async function importEventBatch(snapshot: ImportSnapshot): Promise<ImportBatchResponse> {
  const { data } = await api.post<unknown>("/events/import-batch", snapshot.payload);
  return validateAndCorrelate(snapshot, data);
}
