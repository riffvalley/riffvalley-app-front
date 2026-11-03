import { describe, expect, it } from "vitest";
import type { ImportConflictResult, CorrelatedImportResult } from "../api/eventImport";
import type { ImportSnapshot } from "./eventImportPreparation";
import { createEventImportConflictPresentation } from "./eventImportConflicts";

const batchId = "batch-a";
const operationA = "operation-a";
const operationB = "operation-b";
const operationC = "operation-c";

function snapshot(): ImportSnapshot {
  return {
    batchId,
    countryId: "country",
    payload: { batchId, countryId: "country", rows: [] },
    rows: [operationA, operationB, operationC].map((operationRowId, index) => ({
      operationRowId,
      rowKey: `row-${operationRowId.slice(-1)}`,
      revision: index + 1,
      dto: {
        rowId: operationRowId,
        type: "concert",
        startDate: "2027-05-15",
        city: "Madrid",
        venue: "La Riviera",
        lineup: [{ name: "Septicflesh", artistId: "artist-1" }],
      },
    })),
  } as unknown as ImportSnapshot;
}

function conflict(
  rowId: string,
  relatedRowIds: string[],
  extra: Partial<ImportConflictResult> = {}
): ImportConflictResult {
  return {
    rowId,
    kind: "participation",
    code: "CONCERT_ARTIST_DATE_LOCALITY_CONFLICT",
    severity: "blocking",
    message: "Conflicto de participación",
    relatedRowIds,
    existingEventIds: [],
    matchingArtists: [],
    addableArtists: [],
    candidateEventIds: [],
    ...extra,
  };
}

function result(rowId: string, conflicts: ImportConflictResult[]): CorrelatedImportResult {
  const row = snapshot().rows.find((candidate) => candidate.operationRowId === rowId)!;
  return {
    operationRowId: rowId,
    rowKey: row.rowKey,
    revision: row.revision,
    result: { rowId, status: "conflict", conflicts } as const,
  };
}

describe("createEventImportConflictPresentation", () => {
  it("correlates out-of-order symmetric row relations through the sent snapshot", () => {
    const output = createEventImportConflictPresentation(
      snapshot(),
      [
        result(operationB, [conflict(operationB, [operationA])]),
        result(operationA, [conflict(operationA, [operationB])]),
      ],
      new Set(["row-a", "row-b"]),
      () => true
    );

    expect(
      output.map(({ rowKey, relatedRows, status, snapshotRevision }) => ({
        rowKey,
        relatedRows,
        status,
        snapshotRevision,
      }))
    ).toEqual([
      {
        rowKey: "row-b",
        relatedRows: [
          { operationRowId: operationA, rowKey: "row-a", snapshotRevision: 1, available: true },
        ],
        status: "current",
        snapshotRevision: 2,
      },
      {
        rowKey: "row-a",
        relatedRows: [
          { operationRowId: operationB, rowKey: "row-b", snapshotRevision: 2, available: true },
        ],
        status: "current",
        snapshotRevision: 1,
      },
    ]);
  });

  it("preserves multi-participant references, deduplicates repeats, and keeps missing rows historical", () => {
    const output = createEventImportConflictPresentation(
      snapshot(),
      [
        result(operationA, [
          conflict(operationA, [operationB, operationC]),
          conflict(operationA, [operationC, operationB]),
        ]),
      ],
      new Set(["row-a", "row-c"]),
      (rowKey) => rowKey !== "row-c"
    );

    expect(output).toHaveLength(1);
    expect(output[0]).toMatchObject({
      status: "historical",
      relatedRows: [
        { operationRowId: operationB, rowKey: "row-b", snapshotRevision: 2, available: false },
        { operationRowId: operationC, rowKey: "row-c", snapshotRevision: 3, available: true },
      ],
    });
  });

  it("does not attach unknown operation references to a new row with the same position", () => {
    const output = createEventImportConflictPresentation(
      snapshot(),
      [result(operationA, [conflict(operationA, ["removed-operation"])])],
      new Set(["row-a", "new-row-in-old-position"]),
      () => true
    );

    expect(output[0]?.relatedRows).toEqual([
      {
        operationRowId: "removed-operation",
        rowKey: null,
        snapshotRevision: null,
        available: false,
      },
    ]);
  });

  it("keeps snapshot data, confirmed event identity, candidates and artist identities separate", () => {
    const output = createEventImportConflictPresentation(
      snapshot(),
      [
        result(operationA, [
          conflict(operationA, [], {
            kind: "duplicate",
            code: "CONCERT_DUPLICATE",
            existingEventIds: ["event-persisted"],
            candidateEventIds: ["event-persisted", "event-candidate"],
            matchingArtists: [{ artistId: "artist-id", name: "Artista recibido" }],
            addableArtists: [{ artistId: null, name: "Artista adicional" }],
          }),
        ]),
      ],
      new Set(["row-a"]),
      () => true
    );

    expect(output[0]).toMatchObject({
      kind: "duplicate",
      existingEventIds: ["event-persisted"],
      candidateEventIds: ["event-persisted", "event-candidate"],
      eventReferences: [
        { eventId: "event-persisted", status: "identified" },
        { eventId: "event-candidate", status: "candidate" },
      ],
      snapshot: {
        rowId: operationA,
        type: "concert",
        startDate: "2027-05-15",
        city: "Madrid",
        venue: "La Riviera",
        lineup: [{ name: "Septicflesh", artistId: "artist-1" }],
      },
      matchingArtists: [{ artistId: "artist-id", name: "Artista recibido" }],
      addableArtists: [{ artistId: null, name: "Artista adicional" }],
      relatedRows: [],
      status: "current",
    });
  });
});
