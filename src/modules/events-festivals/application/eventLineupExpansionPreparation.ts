import type { ImportConflict } from "../api/eventImport";
import type { ImportEventRowDto } from "../api/eventImportContracts";
import type { ArtistResolutionResult } from "../api/artistResolution";
import type { EventImportConflictPresentation } from "./eventImportConflicts";
import type { DeepReadonly } from "./eventImportPreparation";
import type { EventImportRow, LineupCellState } from "./useEventImportRows";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export interface ImportLineupArtistDto {
  name: string;
  artistId?: string;
}

export interface ImportLineupSourceDto {
  rowId: string;
  type: ImportEventRowDto["type"];
  name?: string;
  lineup?: ImportLineupArtistDto[];
  startDate: string;
  endDate?: string;
  city: string;
  province?: string;
  administrativeRegionId?: string;
  venue?: string;
  tourId?: string;
  price?: string;
  otherInfo?: string;
  countryId: string;
}

export interface ImportLineupRequest {
  batchId: string;
  rowId: string;
  sourceRow: ImportLineupSourceDto;
  artists: ImportLineupArtistDto[];
}

export type LineupExpansionPendingReason =
  | "conflict-historical"
  | "source-row-missing"
  | "source-row-changed"
  | "event-target-missing"
  | "event-target-ambiguous"
  | "event-target-invalid"
  | "artist-ambiguous"
  | "artist-invalid"
  | "artist-resolution-error"
  | "artist-resolution-pending"
  | "artist-identity-uncertain"
  | "required-source-data-missing"
  | "row-created"
  | "creation-operation-uncertain"
  | "row-discarded"
  | "event-not-supported"
  | "conflict-not-expandable";

export interface LineupExpansionSnapshot {
  readonly kind: "event-lineup-expansion";
  readonly correlation: DeepReadonly<{
    sourceRowKey: string;
    sourceOperationRowId: string;
    sourceBatchId: string;
    sourceRevision: number;
    sourceConflictCode: ImportConflict["code"];
    sourceSnapshot: ImportEventRowDto;
  }>;
  readonly operation: DeepReadonly<{ batchId: string; rowId: string }>;
  readonly eventId: string;
  readonly payload: DeepReadonly<ImportLineupRequest>;
}

export type LineupExpansionPreparation =
  | { state: "ready"; snapshot: LineupExpansionSnapshot; pendingReasons: readonly [] }
  | { state: "pending"; snapshot: null; pendingReasons: readonly LineupExpansionPendingReason[] }
  | { state: "inapplicable"; snapshot: null; pendingReasons: readonly [] }
  | { state: "obsolete"; snapshot: null; pendingReasons: readonly ["conflict-historical"] };

export interface LineupExpansionPreparationInput {
  conflict: EventImportConflictPresentation;
  currentRow: EventImportRow | undefined;
  lineupState: LineupCellState | undefined;
  currentRevision: number | undefined;
  rowCreated?: boolean;
  creationUncertain?: boolean;
  selectedEventId?: string;
}

export type ExpansionUuidFactory = () => string;

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

function validUuid(value: string | undefined): value is string {
  return Boolean(value && UUID_PATTERN.test(value));
}

function resolutionFor(
  item: EventImportRow["lineup"][number],
  state: LineupCellState | undefined
): ArtistResolutionResult | { status: "error"; message: string } | undefined {
  return state?.itemResolution[item.key];
}

function sourceRowFor(
  dto: ImportEventRowDto,
  rowId: string,
  countryId: string
): ImportLineupSourceDto {
  const source: ImportLineupSourceDto = {
    rowId,
    type: dto.type,
    startDate: dto.startDate,
    city: dto.city,
    countryId,
  };
  if (dto.name !== undefined) source.name = dto.name;
  if (dto.lineup?.length)
    source.lineup = dto.lineup.map(({ name, artistId }) => ({
      name,
      ...(artistId ? { artistId } : {}),
    }));
  if (dto.endDate !== undefined) source.endDate = dto.endDate;
  if (dto.province !== undefined) source.province = dto.province;
  if (dto.administrativeRegionId !== undefined)
    source.administrativeRegionId = dto.administrativeRegionId;
  if (dto.venue !== undefined) source.venue = dto.venue;
  if (dto.tourId !== undefined) source.tourId = dto.tourId;
  if (dto.price !== undefined) source.price = dto.price;
  if (dto.otherInfo !== undefined) source.otherInfo = dto.otherInfo;
  return source;
}

function resultFor(state: LineupCellState | undefined, item: EventImportRow["lineup"][number]) {
  return resolutionFor(item, state);
}

function pending(reasons: readonly LineupExpansionPendingReason[]): LineupExpansionPreparation {
  return { state: "pending", snapshot: null, pendingReasons: [...new Set(reasons)] };
}

/** Creates stable, immutable expansion snapshots without performing any network operation. */
export function createEventLineupExpansionPreparer(
  uuidFactory: ExpansionUuidFactory = () => globalThis.crypto.randomUUID()
) {
  const snapshotsBySignature = new Map<string, LineupExpansionSnapshot>();

  function prepare(input: LineupExpansionPreparationInput): LineupExpansionPreparation {
    const { conflict } = input;
    if (input.rowCreated) return pending(["row-created"]);
    if (input.creationUncertain) return pending(["creation-operation-uncertain"]);
    if (!input.currentRow) return pending(["row-discarded"]);
    if (conflict.status === "historical")
      return { state: "obsolete", snapshot: null, pendingReasons: ["conflict-historical"] };
    if (input.currentRevision === undefined) return pending(["source-row-missing"]);
    if (input.currentRevision !== conflict.snapshotRevision) return pending(["source-row-changed"]);
    if (input.currentRow.id !== conflict.rowKey) return pending(["source-row-changed"]);

    const targetIds = [...new Set(conflict.existingEventIds)];
    const referencedEventIds = new Set([...targetIds, ...conflict.candidateEventIds]);
    let eventId: string | undefined;
    if (input.selectedEventId) {
      if (!validUuid(input.selectedEventId) || !referencedEventIds.has(input.selectedEventId))
        return pending(["event-target-invalid"]);
      eventId = input.selectedEventId;
    } else if (
      targetIds.length > 1 ||
      (!targetIds.length && conflict.candidateEventIds.length > 1)
    ) {
      return pending(["event-target-ambiguous"]);
    } else if (targetIds.length === 1) {
      eventId = targetIds[0];
    } else if (conflict.candidateEventIds.length === 1) {
      return pending(["event-target-missing"]);
    } else {
      return pending(["event-target-missing"]);
    }
    if (!validUuid(eventId)) return pending(["event-target-invalid"]);
    if (!input.selectedEventId && conflict.candidateEventIds.some((id) => id !== eventId))
      return pending(["event-target-ambiguous"]);

    const dto = conflict.snapshot;
    if (
      !validUuid(dto.rowId) ||
      !validUuid(conflict.operationRowId) ||
      !validUuid(conflict.operationId) ||
      !validUuid(conflict.countryId)
    )
      return pending(["required-source-data-missing"]);
    if (
      input.currentRow.type !== dto.type ||
      input.currentRow.startDate !== dto.startDate ||
      input.currentRow.city !== dto.city
    )
      return pending(["source-row-changed"]);
    if (input.currentRow.type === "tour" || dto.type === "tour") {
      // Tour is a concert row with a tour reference; the endpoint applies to its single Event.
    }
    const supportedTypes = ["concert", "festival", "tour"];
    if (!supportedTypes.includes(dto.type)) return pending(["event-not-supported"]);
    const expandableConflict =
      dto.type === "festival"
        ? conflict.code === "FESTIVAL_DUPLICATE"
        : conflict.code === "CONCERT_DUPLICATE" ||
          conflict.code === "CONCERT_ARTIST_DATE_LOCALITY_CONFLICT";
    if (!expandableConflict || conflict.matchingArtists.length === 0)
      return pending(["conflict-not-expandable"]);

    const reasons: LineupExpansionPendingReason[] = [];
    const addableById = new Map(
      conflict.addableArtists
        .filter(({ artistId }) => artistId)
        .map((artist) => [artist.artistId!, artist])
    );
    const addableByName = new Map<string, typeof conflict.addableArtists>();
    for (const artist of conflict.addableArtists) {
      const names = addableByName.get(artist.name) ?? [];
      names.push(artist);
      addableByName.set(artist.name, names);
      if (artist.artistId === null) {
        // A name-only backend addable entry is usable only when the editor has
        // independently resolved that exact appearance as a genuinely new Artist.
      }
    }
    if (conflict.matchingArtists.some(({ artistId }) => artistId === null))
      reasons.push("artist-identity-uncertain");
    const matchingIds = new Set(
      conflict.matchingArtists.flatMap(({ artistId }) => (artistId ? [artistId] : []))
    );
    const lineup = input.currentRow.lineup;
    const sourceLineup = dto.lineup ?? [];
    if (
      lineup.length !== sourceLineup.length ||
      lineup.some((item, index) => item.name !== sourceLineup[index]?.name)
    )
      return pending(["source-row-changed"]);

    const artists: ImportLineupArtistDto[] = [];
    const addedIdentityIds = new Set<string>();
    for (let index = 0; index < lineup.length; index += 1) {
      const item = lineup[index]!;
      const sourceArtist = sourceLineup[index]!;
      const resolution = resultFor(input.lineupState, item);
      if (
        resolution?.status === "ambiguous" &&
        (!sourceArtist.artistId ||
          !resolution.candidates.some(({ id }) => id === sourceArtist.artistId))
      ) {
        reasons.push("artist-ambiguous");
        continue;
      }
      if (resolution?.status === "invalid") {
        reasons.push("artist-invalid");
        continue;
      }
      if (resolution?.status === "error") {
        reasons.push("artist-resolution-error");
        continue;
      }
      const artistId =
        sourceArtist.artistId ??
        (resolution?.status === "existing" ? resolution.artist.id : undefined);
      if (!artistId && resolution?.status !== "new") {
        reasons.push("artist-resolution-pending");
        continue;
      }
      if (artistId && matchingIds.has(artistId)) continue;

      let addable = artistId ? addableById.get(artistId) : undefined;
      if (!addable && resolution?.status === "new") {
        const namedMatches = addableByName.get(sourceArtist.name) ?? [];
        if (namedMatches.length === 1 && namedMatches[0]?.artistId === null)
          addable = namedMatches[0];
        else if (namedMatches.length) reasons.push("artist-identity-uncertain");
      }
      if (!addable && (addableByName.get(sourceArtist.name)?.length ?? 0) > 0) {
        reasons.push("artist-identity-uncertain");
      }
      if (!addable) continue;
      // Keep the imported source snapshot untouched. A deliberate Artist selection can
      // still make the requested addition identity explicit in the separate DTO list.
      const requestArtistId =
        sourceArtist.artistId ??
        (resolution?.status === "existing" ? resolution.artist.id : undefined);
      const identity = addable.artistId ?? undefined;
      if (identity && addedIdentityIds.has(identity)) continue;
      if (identity) addedIdentityIds.add(identity);
      artists.push({
        name: sourceArtist.name,
        ...(requestArtistId ? { artistId: requestArtistId } : {}),
      });
    }
    if (reasons.length) return pending(reasons);
    if (!artists.length) return { state: "inapplicable", snapshot: null, pendingReasons: [] };
    if (artists.length > 100) return pending(["required-source-data-missing"]);

    const semanticSignature = JSON.stringify({
      sourceBatchId: conflict.operationId,
      sourceRowKey: conflict.rowKey,
      sourceOperationRowId: conflict.operationRowId,
      sourceRevision: conflict.snapshotRevision,
      sourceSnapshot: dto,
      conflictCode: conflict.code,
      eventId,
      artists,
      countryId: conflict.countryId,
    });
    let snapshot = snapshotsBySignature.get(semanticSignature);
    if (!snapshot) {
      const rowId = uuidFactory();
      if (!validUuid(rowId)) return pending(["required-source-data-missing"]);
      const sourceRow = sourceRowFor(dto, rowId, conflict.countryId);
      const payload: ImportLineupRequest = {
        batchId: conflict.operationId,
        rowId,
        sourceRow,
        artists: artists.map((artist) => ({ ...artist })),
      };
      snapshot = deepFreeze({
        kind: "event-lineup-expansion" as const,
        correlation: {
          sourceRowKey: conflict.rowKey,
          sourceOperationRowId: conflict.operationRowId,
          sourceBatchId: conflict.operationId,
          sourceRevision: conflict.snapshotRevision,
          sourceConflictCode: conflict.code,
          sourceSnapshot: { ...dto, lineup: dto.lineup?.map((artist) => ({ ...artist })) },
        },
        operation: { batchId: conflict.operationId, rowId },
        eventId,
        payload,
      });
      snapshotsBySignature.set(semanticSignature, snapshot);
    }
    return { state: "ready", snapshot, pendingReasons: [] };
  }

  return { prepare };
}
