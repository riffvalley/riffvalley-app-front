import type { ArtistResolutionResult } from "../api/artistResolution";
import { artistResolutionKey, geographyContextKey } from "./entityResolutionIdentity";
import type {
  EventGeographyState,
  EventImportRow,
  EventTourState,
  LineupCellState,
  LineupItem,
} from "./useEventImportRows";
import { parseCalendarDate } from "./eventDate";
import type { EventType } from "./eventType";

function tourIdentity(name: string): string {
  return geographyContextKey(name);
}

export const EVENT_IMPORT_BATCH_LIMIT = 100;

export interface ImportArtistDto {
  name: string;
  artistId?: string;
}

/** DTO documented by CON-B04d. Local row metadata is intentionally excluded. */
export interface ImportEventRowDto {
  rowId: string;
  type: EventType;
  name?: string;
  lineup?: ImportArtistDto[];
  startDate: string;
  endDate?: string;
  venue?: string;
  city: string;
  province?: string;
  administrativeRegionId?: string;
  tourId?: string;
  price?: string;
  otherInfo?: string;
}

export interface ImportBatchRequest {
  batchId: string;
  countryId: string;
  rows: ImportEventRowDto[];
}

export type DeepReadonly<T> = T extends readonly (infer Item)[]
  ? readonly DeepReadonly<Item>[]
  : T extends object
    ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
    : T;

export interface PreparedImportRow {
  rowKey: string;
  operationRowId: string;
  revision: number;
  dto: ImportEventRowDto;
}

export interface PendingImportRow {
  rowKey: string;
  revision: number;
  reasons: string[];
}

export interface ImportSnapshot {
  readonly batchId: string;
  readonly countryId: string;
  readonly rows: readonly DeepReadonly<PreparedImportRow>[];
  readonly payload: DeepReadonly<ImportBatchRequest>;
}

export interface ImportPreparation {
  readonly payload: DeepReadonly<ImportBatchRequest> | null;
  readonly snapshot: ImportSnapshot | null;
  readonly eligibleRows: readonly DeepReadonly<PreparedImportRow>[];
  readonly pendingRows: readonly DeepReadonly<PendingImportRow>[];
  readonly errors: readonly DeepReadonly<PendingImportRow>[];
  readonly correlation: Readonly<Record<string, string>>;
}

export interface EventImportPreparationInput {
  rows: readonly EventImportRow[];
  countryId: string;
  countryAvailable: boolean;
  lineupStates: Readonly<Record<string, LineupCellState>>;
  geographyStates: Readonly<Record<string, EventGeographyState>>;
  tourStates: Readonly<Record<string, EventTourState>>;
  administrativeRegionCountryIds?: Readonly<Record<string, string>>;
  blockedRows?: Readonly<Record<string, string>>;
}

export type UuidFactory = () => string;

interface OperationIdentity {
  signature: string;
  revision: number;
  operationRowId: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function browserUuid(): string {
  return globalThis.crypto.randomUUID();
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

function dateIsValid(date: string | null): date is string {
  if (!date) return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(date);
  return Boolean(match && parseCalendarDate(`${match[3]}/${match[2]}/${match[1]}`) === date);
}

function payloadSignature(
  row: EventImportRow,
  countryId: string,
  tourState?: EventTourState
): string {
  return JSON.stringify({
    countryId,
    type: row.type,
    name: row.type === "concert" ? validOptionalText(row.event) : row.event,
    lineup: row.lineup.map(({ name, artistId }) => ({ name, artistId })),
    startDate: row.startDate,
    endDate: validOptionalText(row.endDate ?? ""),
    venue: validOptionalText(row.venue.name),
    city: row.city,
    province: validOptionalText(row.province),
    price: validOptionalText(row.price),
    otherInfo: validOptionalText(row.otherInfo),
    administrativeRegionId: validOptionalText(row.administrativeRegionId ?? ""),
    confirmedTourId:
      row.type === "tour" ? validOptionalText(tourState?.confirmedTourId ?? "") : undefined,
  });
}

function validOptionalText(value: string): string | undefined {
  return value.trim().length ? value : undefined;
}

function getArtistResult(
  item: LineupItem,
  state: LineupCellState | undefined
): ArtistResolutionResult | { status: "error"; message: string } | undefined {
  return state?.itemResolution[item.key];
}

function venueResolutionIsPending(
  row: EventImportRow,
  geography: EventGeographyState | undefined
): boolean {
  if (!row.venue.name.trim()) return false;
  // A new locality has no localityId, so Venue lookup is intentionally deferred.
  if (!row.venue.localityId) return geography?.localityStatus === "existing";
  return ["idle", "resolving", "ambiguous", "error"].includes(geography?.venueStatus ?? "idle");
}

function validateRow(row: EventImportRow, input: EventImportPreparationInput): string[] {
  const reasons: string[] = [];
  const geography = input.geographyStates[row.id];
  const tour = input.tourStates[row.id];
  const lineupState = input.lineupStates[row.id];

  if (!input.countryAvailable || !UUID_PATTERN.test(input.countryId))
    reasons.push("country-unavailable");
  if (!["concert", "festival", "tour"].includes(row.type)) reasons.push("invalid-type");
  if (!dateIsValid(row.startDate)) reasons.push("start-date-invalid");
  if (row.endDate && !dateIsValid(row.endDate)) reasons.push("end-date-invalid");
  if (
    row.startDate &&
    row.endDate &&
    dateIsValid(row.startDate) &&
    dateIsValid(row.endDate) &&
    row.endDate < row.startDate
  ) {
    reasons.push("end-date-before-start-date");
  }
  if (!row.city.trim()) reasons.push("city-required");
  if (row.type !== "concert" && !row.event.trim()) reasons.push("name-required");

  if (row.city.trim()) {
    const locality = geography?.localityResult;
    if (geography?.localityStatus === "ambiguous" || locality?.status === "ambiguous") {
      const selected = geography?.selectedLocality;
      const selectedFromCandidates =
        locality?.status === "ambiguous" &&
        selected &&
        selected.country.id === input.countryId &&
        locality.candidates.some(({ id }) => id === selected.id) &&
        row.venue.localityId === selected.id &&
        row.administrativeRegionId === selected.administrativeRegion.id &&
        (!geographyContextKey(selected.province ?? "") ||
          !geographyContextKey(row.province) ||
          geographyContextKey(row.province) === geographyContextKey(selected.province ?? "")) &&
        locality.candidates.filter(
          (candidate) =>
            candidate.administrativeRegion.id === selected.administrativeRegion.id &&
            (!geographyContextKey(row.province) ||
              !geographyContextKey(candidate.province ?? "") ||
              geographyContextKey(candidate.province ?? "") === geographyContextKey(row.province))
        ).length === 1;
      if (!selectedFromCandidates) reasons.push("locality-ambiguous");
    } else if (geography?.localityStatus === "invalid" || locality?.status === "invalid") {
      reasons.push("locality-invalid");
    } else if (geography?.localityStatus === "error") {
      reasons.push("locality-resolution-error");
    } else if (geography?.localityStatus === "idle" || geography?.localityStatus === "resolving") {
      reasons.push("locality-resolution-pending");
    } else if (geography?.localityStatus === "existing") {
      const resolvedCountryId =
        locality?.status === "existing"
          ? locality.locality.country.id
          : geography?.selectedLocality?.country.id;
      if (!resolvedCountryId || resolvedCountryId !== input.countryId)
        reasons.push("locality-country-mismatch");
      const resolvedLocalityId =
        locality?.status === "existing" ? locality.locality.id : geography?.selectedLocality?.id;
      if (row.venue.localityId && row.venue.localityId !== resolvedLocalityId) {
        reasons.push("locality-identity-stale");
      }
    } else if (geography?.localityStatus === "new") {
      if (locality?.status !== "new") reasons.push("locality-resolution-pending");
      else if (
        locality.requiresAdministrativeRegionId &&
        (!row.administrativeRegionId || !UUID_PATTERN.test(row.administrativeRegionId))
      )
        reasons.push("administrative-region-required");
      else if (
        row.administrativeRegionId &&
        input.administrativeRegionCountryIds &&
        input.administrativeRegionCountryIds[row.administrativeRegionId] !== input.countryId
      )
        reasons.push("administrative-region-country-mismatch");
    } else {
      reasons.push("locality-resolution-pending");
    }
  }

  if (venueResolutionIsPending(row, geography)) {
    const status = geography?.venueStatus ?? "idle";
    if (status === "ambiguous") reasons.push("venue-ambiguous");
    else if (status === "error") reasons.push("venue-resolution-error");
    else reasons.push("venue-resolution-pending");
  }

  for (const item of row.lineup) {
    const result = getArtistResult(item, lineupState);
    if (lineupState?.itemStatus[item.key] === "error" || result?.status === "error") {
      reasons.push(`artist-resolution-error:${item.key}`);
    } else if (lineupState?.itemStatus[item.key] === "resolving") {
      reasons.push(`artist-resolution-pending:${item.key}`);
    } else if (!result || artistResolutionKey(result.name) !== artistResolutionKey(item.name)) {
      reasons.push(`artist-resolution-pending:${item.key}`);
    } else if (result.status === "ambiguous") {
      if (!item.artistId || !result.candidates.some(({ id }) => id === item.artistId)) {
        reasons.push(`artist-ambiguous:${item.key}`);
      }
    } else if (result.status === "invalid") {
      reasons.push(`artist-invalid:${item.key}`);
    } else if (result.status === "existing" && item.artistId !== result.artist.id) {
      reasons.push(`artist-identity-stale:${item.key}`);
    } else if (result.status === "new" && item.artistId) {
      reasons.push(`artist-identity-stale:${item.key}`);
    }
  }

  if (row.type === "tour") {
    if (!tour || !tour.result || tourIdentity(tour.result.name) !== tourIdentity(row.event)) {
      reasons.push("tour-resolution-pending");
    } else if (tour.status === "ambiguous" && !tour.confirmedTourId) reasons.push("tour-ambiguous");
    else if (tour.status === "invalid") reasons.push("tour-invalid");
    else if (tour?.status === "error") reasons.push("tour-resolution-error");
    else if (tour?.status === "resolving" || tour?.status === "idle")
      reasons.push("tour-resolution-pending");
    else if (
      (tour.status === "existing" || tour.status === "ambiguous") &&
      (!tour.confirmedTourId || tour.confirmedTourId !== tour.selectedCandidateId)
    )
      reasons.push("tour-confirmation-required");
    else if (
      (tour.status === "existing" || tour.status === "ambiguous") &&
      tour.confirmedTourId &&
      (!UUID_PATTERN.test(tour.confirmedTourId) ||
        (tour.result.status === "existing" && tour.result.entity.id !== tour.confirmedTourId) ||
        (tour.result.status === "ambiguous" &&
          !tour.result.candidates.some(({ id }) => id === tour.confirmedTourId)))
    )
      reasons.push("tour-identity-invalid");
    else if (tour.status === "new" && tour.result.status !== "new")
      reasons.push("tour-resolution-pending");
  }

  return [...new Set(reasons)];
}

function toDto(
  row: EventImportRow,
  operationRowId: string,
  input: EventImportPreparationInput
): ImportEventRowDto {
  const lineup = row.lineup.map((item): ImportArtistDto => {
    const result = getArtistResult(item, input.lineupStates[row.id]);
    return {
      name: item.name,
      ...(result?.status === "existing"
        ? { artistId: result.artist.id }
        : result?.status === "ambiguous" &&
            item.artistId &&
            result.candidates.some(({ id }) => id === item.artistId)
          ? { artistId: item.artistId }
          : {}),
    };
  });
  const tour = input.tourStates[row.id];
  const dto: ImportEventRowDto = {
    rowId: operationRowId,
    type: row.type,
    startDate: row.startDate!,
    city: row.city,
  };
  const name = validOptionalText(row.event);
  const endDate = validOptionalText(row.endDate ?? "");
  const venue = validOptionalText(row.venue.name);
  const province = validOptionalText(row.province);
  const price = validOptionalText(row.price);
  const otherInfo = validOptionalText(row.otherInfo);
  if (name !== undefined) dto.name = name;
  if (lineup.length) dto.lineup = lineup;
  if (endDate !== undefined) dto.endDate = endDate;
  if (venue !== undefined) dto.venue = venue;
  if (province !== undefined) dto.province = province;
  if (row.administrativeRegionId) dto.administrativeRegionId = row.administrativeRegionId;
  if (row.type === "tour" && tour?.confirmedTourId) dto.tourId = tour.confirmedTourId;
  if (price !== undefined) dto.price = price;
  if (otherInfo !== undefined) dto.otherInfo = otherInfo;
  return dto;
}

export function createEventImportPreparer(uuidFactory: UuidFactory = browserUuid) {
  const identities = new Map<string, OperationIdentity>();
  const snapshotsBySignature = new Map<string, ImportSnapshot>();

  function identityFor(
    row: EventImportRow,
    countryId: string,
    tourState?: EventTourState
  ): OperationIdentity {
    const signature = payloadSignature(row, countryId, tourState);
    const prior = identities.get(row.id);
    if (prior?.signature === signature) return prior;
    const identity = {
      signature,
      revision: (prior?.revision ?? 0) + 1,
      operationRowId: uuidFactory(),
    };
    identities.set(row.id, identity);
    return identity;
  }

  function prepare(input: EventImportPreparationInput): ImportPreparation {
    const validCountry = input.countryAvailable && UUID_PATTERN.test(input.countryId);
    const eligibleRows: PreparedImportRow[] = [];
    const pendingRows: PendingImportRow[] = [];

    for (const row of input.rows) {
      const identity = identityFor(row, input.countryId, input.tourStates[row.id]);
      const blockedReason = input.blockedRows?.[row.id];
      if (blockedReason) {
        pendingRows.push({ rowKey: row.id, revision: identity.revision, reasons: [blockedReason] });
        continue;
      }
      const reasons = validateRow(row, input);
      if (reasons.length) {
        pendingRows.push({ rowKey: row.id, revision: identity.revision, reasons });
      } else if (eligibleRows.length < EVENT_IMPORT_BATCH_LIMIT) {
        eligibleRows.push({
          rowKey: row.id,
          operationRowId: identity.operationRowId,
          revision: identity.revision,
          dto: toDto(row, identity.operationRowId, input),
        });
      } else {
        pendingRows.push({
          rowKey: row.id,
          revision: identity.revision,
          reasons: ["batch-limit-exceeded"],
        });
      }
    }

    if (!validCountry) {
      // Keep row-level reasons and make the preparation error explicit for an empty table too.
      if (!input.rows.length)
        pendingRows.push({ rowKey: "", revision: 0, reasons: ["country-unavailable"] });
      eligibleRows.length = 0;
    }

    if (!eligibleRows.length) {
      const errors = pendingRows.filter(({ reasons }) =>
        reasons.some((reason) => reason !== "batch-limit-exceeded")
      );
      return deepFreeze({
        payload: null,
        snapshot: null,
        eligibleRows,
        pendingRows,
        errors,
        correlation: {},
      });
    }

    const batchSignature = JSON.stringify({
      countryId: input.countryId,
      operations: eligibleRows.map(({ operationRowId }) => operationRowId).sort(),
    });
    let snapshot = snapshotsBySignature.get(batchSignature);
    if (!snapshot) {
      const batchId = uuidFactory();
      const rows = eligibleRows.map((row) => ({ ...row, dto: { ...row.dto } }));
      const payload: ImportBatchRequest = {
        batchId,
        countryId: input.countryId,
        rows: rows.map(({ dto }) => dto),
      };
      snapshot = deepFreeze({ batchId, countryId: input.countryId, rows, payload });
      snapshotsBySignature.set(batchSignature, snapshot);
    }
    const snapshotRows = snapshot.rows;
    const correlation = Object.fromEntries(
      snapshotRows.map(({ rowKey, operationRowId }) => [rowKey, operationRowId])
    );
    const snapshotPendingRows = pendingRows;
    const errors = snapshotPendingRows.filter(({ reasons }) =>
      reasons.some((reason) => reason !== "batch-limit-exceeded")
    );
    return deepFreeze({
      payload: snapshot.payload,
      snapshot,
      eligibleRows: snapshotRows,
      pendingRows: snapshotPendingRows,
      errors,
      correlation,
    });
  }

  function isCurrent(
    snapshot: ImportSnapshot,
    rowKey: string,
    current: EventImportPreparationInput
  ): boolean {
    const snapshotRow = snapshot.rows.find((row) => row.rowKey === rowKey);
    const row = current.rows.find((candidate) => candidate.id === rowKey);
    if (
      !snapshotRow ||
      !row ||
      current.countryId !== snapshot.countryId ||
      !current.countryAvailable
    )
      return false;
    const identity = identities.get(row.id);
    return (
      identity?.signature ===
        payloadSignature(row, current.countryId, current.tourStates[row.id]) &&
      identity.revision === snapshotRow.revision &&
      identity.operationRowId === snapshotRow.operationRowId
    );
  }

  return { prepare, isCurrent };
}
