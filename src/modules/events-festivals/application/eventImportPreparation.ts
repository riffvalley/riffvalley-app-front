import type { ArtistResolutionResult } from "../api/artistResolution";
import type {
  ImportArtistDto,
  ImportBatchRequest,
  ImportEventRowDto,
} from "../api/eventImportContracts";
import { artistResolutionKey, geographyContextKey } from "./entityResolutionIdentity";
import type {
  EventGeographyState,
  EventImportRow,
  EventTourState,
  LineupCellState,
  LineupItem,
} from "./useEventImportRows";
import { parseCalendarDate } from "./eventDate";

function tourIdentity(name: string): string {
  return geographyContextKey(name);
}

/** Operational frontend limit; the backend contract continues to accept up to 100 rows. */
export const EVENT_IMPORT_BATCH_LIMIT = 50;

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
    localityId: row.venue.localityId ?? undefined,
    venueId: row.venue.venueId ?? undefined,
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
  if (geography?.venueStatus === "ambiguous" && row.venue.venueId && effectiveVenue(row, geography))
    return false;
  // A new locality has no localityId, so Venue lookup is intentionally deferred.
  if (!row.venue.localityId) return geography?.localityStatus === "existing";
  return ["idle", "resolving", "ambiguous", "error"].includes(geography?.venueStatus ?? "idle");
}

function effectiveLocality(geography: EventGeographyState | undefined) {
  if (geography?.localityStatus !== "existing") return null;
  const result = geography?.localityResult;
  if (result?.status === "existing") return result.locality;
  if (
    result?.status === "ambiguous" &&
    geography?.selectedLocality &&
    result.candidates.some(({ id }) => id === geography.selectedLocality?.id)
  )
    return geography.selectedLocality;
  return null;
}

function effectiveVenue(row: EventImportRow, geography: EventGeographyState | undefined) {
  const result = geography?.venueStatus === "existing" ? geography.venueCandidates[0] : null;
  if (result?.id === row.venue.venueId) return result;
  if (
    geography?.venueStatus === "ambiguous" &&
    geography.selectedVenueCandidateId === row.venue.venueId
  )
    return geography.venueCandidates.find(({ id }) => id === row.venue.venueId) ?? null;
  return null;
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
  if (row.lineup.length === 0) reasons.push("lineup-required");
  if (row.administrativeRegionId && !UUID_PATTERN.test(row.administrativeRegionId))
    reasons.push("administrative-region-invalid");
  if (row.type !== "concert" && !row.event.trim()) reasons.push("name-required");

  if (row.city.trim()) {
    const locality = geography?.localityResult;
    if (geography?.localityStatus === "ambiguous" || locality?.status === "ambiguous") {
      if (!effectiveLocality(geography)) reasons.push("locality-ambiguous");
    } else if (geography?.localityStatus === "invalid" || locality?.status === "invalid") {
      reasons.push("locality-invalid");
    } else if (geography?.localityStatus === "error") {
      reasons.push("locality-resolution-error");
    } else if (geography?.localityStatus === "idle" || geography?.localityStatus === "resolving") {
      reasons.push("locality-resolution-pending");
    } else if (geography?.localityStatus === "existing") {
      const selected = effectiveLocality(geography);
      if (!selected || selected.country.id !== input.countryId)
        reasons.push("locality-country-mismatch");
      if (!selected || !UUID_PATTERN.test(selected.id) || row.venue.localityId !== selected.id) {
        reasons.push("locality-identity-stale");
      }
      if (
        selected &&
        row.province.trim() &&
        selected.province?.trim() &&
        geographyContextKey(row.province) !== geographyContextKey(selected.province)
      )
        reasons.push("locality-province-mismatch");
      if (
        selected &&
        row.administrativeRegionId &&
        row.administrativeRegionId !== selected.administrativeRegion.id
      )
        reasons.push("locality-region-mismatch");
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

  const selectedLocality = effectiveLocality(geography);
  if (selectedLocality) {
    if (selectedLocality.country.id !== input.countryId) reasons.push("locality-country-mismatch");
    if (!UUID_PATTERN.test(selectedLocality.id) || row.venue.localityId !== selectedLocality.id)
      reasons.push("locality-identity-stale");
    if (
      row.province.trim() &&
      selectedLocality.province?.trim() &&
      geographyContextKey(row.province) !== geographyContextKey(selectedLocality.province)
    )
      reasons.push("locality-province-mismatch");
    if (
      row.administrativeRegionId &&
      row.administrativeRegionId !== selectedLocality.administrativeRegion.id
    )
      reasons.push("locality-region-mismatch");
  }
  if (row.venue.localityId && geography?.localityStatus === "new")
    reasons.push("locality-identity-stale");

  if (row.venue.venueId) {
    const selectedVenue = effectiveVenue(row, geography);
    if (!UUID_PATTERN.test(row.venue.venueId) || !selectedVenue)
      reasons.push("venue-identity-stale");
    else if (!selectedLocality || row.venue.localityId !== selectedLocality.id)
      reasons.push("venue-locality-mismatch");
    else if (
      row.venue.name.trim() &&
      geographyContextKey(row.venue.name) !== geographyContextKey(selectedVenue.name)
    )
      reasons.push("venue-name-mismatch");
  }

  if (row.venue.name.trim() && selectedLocality && geography?.venueStatus === "ambiguous") {
    if (!row.venue.venueId || !effectiveVenue(row, geography)) reasons.push("venue-ambiguous");
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

  if (lineupState?.draft.trim()) reasons.push("artist-draft-unconfirmed");

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
  const locality = effectiveLocality(input.geographyStates[row.id]);
  if (locality && row.venue.localityId === locality.id) dto.localityId = locality.id;
  const selectedVenue = effectiveVenue(row, input.geographyStates[row.id]);
  if (selectedVenue && row.venue.venueId === selectedVenue.id) dto.venueId = selectedVenue.id;
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
