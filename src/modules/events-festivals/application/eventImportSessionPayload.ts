import { isProxy, toRaw } from "vue";
import type { EventImportRow } from "./useEventImportRows";

export interface EventImportSessionPayloadInput {
  countryId: string;
  rows: readonly EventImportRow[];
  lineupStates: Record<string, { draft: string }>;
  tourStates: Record<
    string,
    { confirmedTourId: string | null; selectedCandidateId: string | null }
  >;
  uncertainSnapshots: readonly unknown[];
  createdDrafts: Record<string, unknown>;
  appliedExpansionsByRow: Record<string, unknown>;
  protectedExpansionSnapshots: Record<string, unknown>;
  conflictOperation: unknown;
  lastImport: unknown;
}

/** Copy only structured-clone data, recursively removing Vue proxies and rejecting unsafe values. */
function copySessionValue(value: unknown, ancestors = new WeakSet<object>()): unknown {
  const raw = isProxy(value) ? toRaw(value) : value;
  if (raw === null || raw === undefined || typeof raw === "string" || typeof raw === "boolean")
    return raw;
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) throw new TypeError("La sesión contiene un número no serializable.");
    return raw;
  }
  if (typeof raw !== "object") {
    throw new TypeError("La sesión contiene un valor no serializable.");
  }
  if (ancestors.has(raw)) throw new TypeError("La sesión contiene una referencia circular.");
  if (
    !Array.isArray(raw) &&
    Object.getPrototypeOf(raw) !== Object.prototype &&
    Object.getPrototypeOf(raw) !== null
  ) {
    throw new TypeError("La sesión contiene un objeto no compatible con el almacenamiento local.");
  }
  ancestors.add(raw);
  const copied = Array.isArray(raw)
    ? raw.map((item) => copySessionValue(item, ancestors))
    : Object.fromEntries(
        Object.entries(raw).map(([key, item]) => [key, copySessionValue(item, ancestors)])
      );
  ancestors.delete(raw);
  return copied;
}

/** Version 1 persisted draft projection. Runtime resolution/query state is intentionally omitted. */
export function createEventImportSessionPayload(input: EventImportSessionPayloadInput) {
  const rows = input.rows.map((row) => ({
    id: row.id,
    type: row.type,
    event: row.event,
    lineup: row.lineup.map(({ key, name, artistId }) => ({ key, name, artistId })),
    startDate: row.startDate,
    startDateDraft: row.startDateDraft,
    endDate: row.endDate,
    endDateDraft: row.endDateDraft,
    venue: {
      name: row.venue.name,
      venueId: row.venue.venueId,
      localityId: row.venue.localityId,
    },
    price: row.price,
    otherInfo: row.otherInfo,
    city: row.city,
    province: row.province,
    administrativeRegionId: row.administrativeRegionId,
  }));

  return copySessionValue({
    countryId: input.countryId,
    rows,
    lineupStates: input.lineupStates,
    tourStates: input.tourStates,
    uncertainSnapshots: input.uncertainSnapshots,
    createdDrafts: input.createdDrafts,
    appliedExpansionsByRow: input.appliedExpansionsByRow,
    protectedExpansionSnapshots: input.protectedExpansionSnapshots,
    conflictOperation: input.conflictOperation,
    lastImport: input.lastImport,
  });
}
