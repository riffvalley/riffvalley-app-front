import { describe, expect, it, vi } from "vitest";
import { importEventBatch } from "./eventImport";
import {
  createEventImportPreparer,
  type EventImportPreparationInput,
  type ImportSnapshot,
} from "../application/eventImportPreparation";
import { reconcileEventImportResults } from "../application/eventImportReconciliation";
import type {
  EventGeographyState,
  EventImportRow,
  EventTourState,
  LineupCellState,
} from "../application/useEventImportRows";

const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }));
vi.mock("@services/api/api", () => ({ default: { post: postMock } }));

const COUNTRY_ID = "00000000-0000-4000-8000-000000000001";
const LOCALITY_ID = "00000000-0000-4000-8000-000000000002";
const VENUE_ID = "00000000-0000-4000-8000-000000000003";
const ARTIST_ID = "00000000-0000-4000-8000-000000000004";

function uuid(value: number): string {
  return `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
}

function createSnapshots(): ImportSnapshot[] {
  const rows: EventImportRow[] = Array.from({ length: 600 }, (_, index) => ({
    id: `local-row-${index}`,
    type: "concert",
    event: "",
    lineup: [{ key: `artist-${index}`, name: "Septicflesh", artistId: ARTIST_ID }],
    startDate: "2112-02-21",
    startDateDraft: "21/02/2112",
    endDate: null,
    endDateDraft: "",
    venue: { name: "", venueId: null, localityId: null },
    price: "",
    otherInfo: "",
    city: "Madrid",
    province: "",
    administrativeRegionId: null,
  }));
  const lineupStates: Record<string, LineupCellState> = Object.fromEntries(
    rows.map(({ id, lineup }) => [
      id,
      {
        draft: "",
        draftStatus: "idle",
        itemStatus: {},
        draftError: null,
        itemResolution: Object.fromEntries(
          lineup.map(({ key, name }, index) => [
            key,
            {
              index,
              name,
              status: "existing",
              artist: { id: ARTIST_ID, name },
              candidates: [],
            },
          ])
        ),
      },
    ])
  );
  const geography: EventGeographyState = {
    localityStatus: "new",
    localityCandidates: [],
    selectedLocality: null,
    localitySelectionOriginalContext: null,
    localityResult: {
      index: 0,
      input: { name: "Madrid", countryId: COUNTRY_ID },
      status: "new",
      requiresAdministrativeRegionId: false,
      candidates: [],
    },
    localityError: null,
    venueStatus: "idle",
    venueCandidates: [],
    selectedVenueCandidateId: null,
    venueError: null,
  };
  const tour: EventTourState = {
    status: "idle",
    result: null,
    selectedCandidateId: null,
    confirmedTourId: null,
    error: null,
  };
  const input: EventImportPreparationInput = {
    rows,
    countryId: COUNTRY_ID,
    countryAvailable: true,
    lineupStates,
    geographyStates: Object.fromEntries(rows.map(({ id }) => [id, geography])),
    tourStates: Object.fromEntries(rows.map(({ id }) => [id, tour])),
  };
  let nextId = 100;
  const preparer = createEventImportPreparer(() => uuid(nextId++));
  const snapshots: ImportSnapshot[] = [];
  const blockedRows: Record<string, string> = {};
  while (snapshots.length < 12) {
    const snapshot = preparer.prepare({ ...input, blockedRows }).snapshot;
    if (!snapshot) throw new Error("La preparación terminó antes de alcanzar 600 filas.");
    snapshots.push(snapshot);
    snapshot.rows.forEach(({ rowKey }) => {
      blockedRows[rowKey] = "automatic-batch-already-processed";
    });
  }
  return snapshots;
}

function contractResult(rowId: string, globalIndex: number) {
  if (globalIndex % 30 === 0) {
    return {
      rowId,
      status: "unchanged",
      eventId: uuid(10_000 + globalIndex),
      code: "CONCERT_DUPLICATE",
      message: "This event is already registered and was not imported again",
    };
  }
  if (globalIndex % 30 === 1) {
    return { rowId, status: "conflict", code: "IMPORT_CONFLICT", message: "Review required" };
  }
  if (globalIndex % 30 === 2) {
    return { rowId, status: "invalid", code: "EVENT_DATE_INVALID", message: "Invalid date" };
  }
  if (globalIndex % 30 === 3) {
    return { rowId, status: "failed", code: "IMPORT_ROW_FAILED", message: "Retry available" };
  }
  return {
    rowId,
    status: "created",
    eventId: uuid(20_000 + globalIndex),
    localityId: LOCALITY_ID,
    venueId: VENUE_ID,
    artistIds: [ARTIST_ID],
    replayed: false,
  };
}

describe("600-row event import over the HTTP transport boundary", () => {
  it("sends twelve sequential requests and reconciles every result to its original row", async () => {
    const preparationStartedAt = performance.now();
    const snapshots = createSnapshots();
    const preparationMs = performance.now() - preparationStartedAt;
    let activeRequests = 0;
    let maximumActiveRequests = 0;
    let releaseFirst!: (value: { data: unknown }) => void;
    const transportStartedAt = performance.now();
    const responseByBatch = (payload: ImportSnapshot["payload"]) => {
      return {
        batchId: payload.batchId,
        // Deliberately reverse response order; the API must correlate by rowId.
        results: [...payload.rows].reverse().map((row) => {
          const batchIndex = snapshots.findIndex(({ batchId }) => batchId === payload.batchId);
          const batchSnapshot = snapshots[batchIndex];
          const rowIndex =
            batchSnapshot?.rows.findIndex(({ operationRowId }) => operationRowId === row.rowId) ??
            -1;
          const globalIndex = batchIndex * 50 + rowIndex;
          return contractResult(row.rowId, globalIndex);
        }),
      };
    };

    postMock.mockImplementation((_url: string, payload: ImportSnapshot["payload"]) => {
      activeRequests++;
      maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests);
      const response = responseByBatch(payload);
      if (postMock.mock.calls.length === 1) {
        return new Promise<{ data: unknown }>((resolve) => {
          releaseFirst = (value) => {
            activeRequests--;
            resolve(value);
          };
        });
      }
      activeRequests--;
      return Promise.resolve({ data: response });
    });

    const firstRequest = importEventBatch(snapshots[0]!);
    expect(postMock).toHaveBeenCalledTimes(1);
    expect(postMock.mock.calls[0]?.[0]).toBe("/events/import-batch");
    expect(postMock.mock.calls[0]?.[1].rows).toHaveLength(50);
    await Promise.resolve();
    expect(postMock).toHaveBeenCalledTimes(1);

    const firstRawResponse = responseByBatch(snapshots[0]!.payload);
    releaseFirst({
      data: { batchId: firstRawResponse.batchId, results: firstRawResponse.results },
    });
    const firstResponse = await firstRequest;
    const startedResponses = [firstResponse];
    const reconciledRows = [
      ...reconcileEventImportResults(snapshots[0]!, firstResponse, () => true).results,
    ];

    for (const snapshot of snapshots.slice(1)) {
      const response = await importEventBatch(snapshot);
      startedResponses.push(response);
      reconciledRows.push(...reconcileEventImportResults(snapshot, response, () => true).results);
    }

    const flatResults = startedResponses.flatMap(({ results }) => results);
    const counts = flatResults.reduce(
      (totals, { result }) => {
        totals[result.status]++;
        return totals;
      },
      { created: 0, unchanged: 0, conflict: 0, invalid: 0, failed: 0 }
    );
    const distinctCreatedIds = new Set(
      flatResults.flatMap(({ result }) => (result.status === "created" ? [result.eventId] : []))
    );
    const payloadBytes = snapshots.reduce(
      (total, snapshot) =>
        total + new TextEncoder().encode(JSON.stringify(snapshot.payload)).length,
      0
    );
    const transportAndReconciliationMs = performance.now() - transportStartedAt;

    expect(postMock).toHaveBeenCalledTimes(12);
    expect(postMock.mock.calls.map(([, payload]) => payload.rows.length)).toEqual(
      Array(12).fill(50)
    );
    expect(maximumActiveRequests).toBe(1);
    expect(new Set(flatResults.map(({ operationRowId }) => operationRowId)).size).toBe(600);
    expect(new Set(flatResults.map(({ rowKey }) => rowKey)).size).toBe(600);
    expect(flatResults).toHaveLength(600);
    expect(reconciledRows.every(({ current, action }) => current && action !== "ignored")).toBe(
      true
    );
    expect(counts).toEqual({ created: 520, unchanged: 20, conflict: 20, invalid: 20, failed: 20 });
    expect(distinctCreatedIds.size).toBe(520);
    expect(
      flatResults.find(
        ({ operationRowId }) => operationRowId === snapshots[0]!.rows[4]!.operationRowId
      )?.result
    ).toMatchObject({
      status: "created",
      localityId: LOCALITY_ID,
      venueId: VENUE_ID,
      artistIds: [ARTIST_ID],
      replayed: false,
    });
    expect(postMock.mock.calls.every(([url]) => url === "/events/import-batch")).toBe(true);
    expect(preparationMs).toBeGreaterThanOrEqual(0);
    expect(transportAndReconciliationMs).toBeGreaterThanOrEqual(0);
    expect(payloadBytes).toBeGreaterThan(0);
    console.info(
      "CON_F12J_600_IMPORT_METRICS",
      JSON.stringify({
        preparationMs,
        transportAndReconciliationMs,
        payloadBytes,
        requests: 12,
        maximumActiveRequests,
      })
    );
  });
});
