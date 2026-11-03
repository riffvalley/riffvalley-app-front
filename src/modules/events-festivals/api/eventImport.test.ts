import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  existingEventDetailQueryOptions,
  existingEventDetailQueryKeys,
  getExistingEventDetail,
  importEventBatch,
  ImportBatchProtocolError,
  ExistingEventDetailProtocolError,
} from "./eventImport";
import type { ImportSnapshot } from "../application/eventImportPreparation";

const { getMock, postMock } = vi.hoisted(() => ({ getMock: vi.fn(), postMock: vi.fn() }));
vi.mock("@services/api/api", () => ({ default: { get: getMock, post: postMock } }));

const batchId = "11111111-1111-4111-8111-111111111111";
const rowA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const rowB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function snapshot(): ImportSnapshot {
  const payload = Object.freeze({
    batchId,
    countryId: "22222222-2222-4222-8222-222222222222",
    rows: [],
  });
  return {
    batchId,
    countryId: payload.countryId,
    payload,
    rows: Object.freeze([
      Object.freeze({
        rowKey: "local-a",
        operationRowId: rowA,
        revision: 2,
        dto: Object.freeze({}),
      }),
      Object.freeze({
        rowKey: "local-b",
        operationRowId: rowB,
        revision: 1,
        dto: Object.freeze({}),
      }),
    ]),
  } as unknown as ImportSnapshot;
}

describe("importEventBatch", () => {
  beforeEach(() => postMock.mockReset());

  it("POSTs the frozen snapshot to the event batch endpoint and correlates out-of-order rows by rowId", async () => {
    const prepared = snapshot();
    const data = {
      batchId,
      results: [
        { rowId: rowB, status: "failed", code: "IMPORT_ROW_FAILED", message: "retry" },
        {
          rowId: rowA,
          status: "created",
          eventId: "event-a",
          localityId: "locality-a",
          venueId: "venue-a",
          artistIds: ["artist-a"],
          replayed: true,
        },
      ],
    };
    postMock.mockResolvedValue({ data });

    const result = await importEventBatch(prepared);

    expect(postMock).toHaveBeenCalledWith("/events/import-batch", prepared.payload);
    expect(result.results.map(({ rowKey, revision }) => [rowKey, revision])).toEqual([
      ["local-b", 1],
      ["local-a", 2],
    ]);
    expect(result.results[1]?.result).toMatchObject({
      status: "created",
      eventId: "event-a",
      replayed: true,
    });
  });

  it("preserves conflict detail and accepts a partial result set", async () => {
    postMock.mockResolvedValue({
      data: {
        batchId,
        results: [
          {
            rowId: rowA,
            status: "conflict",
            code: "CONCERT_DUPLICATE",
            conflicts: [
              {
                rowId: rowA,
                kind: "duplicate",
                code: "CONCERT_DUPLICATE",
                severity: "blocking",
                message: "Duplicate event",
                relatedRowIds: [rowB],
                existingEventIds: ["event-existing"],
                matchingArtists: [{ artistId: "artist-a", name: "Artist" }],
                addableArtists: [{ artistId: null, name: "New artist" }],
                candidateEventIds: ["event-existing"],
              },
            ],
          },
          { rowId: rowB, status: "invalid", code: "EVENT_DATE_INVALID", message: "Invalid date" },
        ],
      },
    });

    const response = await importEventBatch(snapshot());
    expect(response.results[0]?.result).toMatchObject({
      status: "conflict",
      conflicts: [{ addableArtists: [{ artistId: null, name: "New artist" }] }],
    });
    expect(response.results[1]?.result).toMatchObject({
      status: "invalid",
      code: "EVENT_DATE_INVALID",
    });
  });

  it("rejects conflict detail attributed to a different operation row", async () => {
    postMock.mockResolvedValue({
      data: {
        batchId,
        results: [
          {
            rowId: rowA,
            status: "conflict",
            conflicts: [
              {
                rowId: rowB,
                kind: "participation",
                code: "CONCERT_ARTIST_DATE_LOCALITY_CONFLICT",
                severity: "blocking",
                message: "Conflicto de fila",
                relatedRowIds: [rowA],
                existingEventIds: [],
                matchingArtists: [],
                addableArtists: [],
                candidateEventIds: [],
              },
            ],
          },
          { rowId: rowB, status: "failed" },
        ],
      },
    });

    await expect(importEventBatch(snapshot())).rejects.toBeInstanceOf(ImportBatchProtocolError);
  });

  it.each([
    [
      "malformed result",
      [
        { rowId: rowA, status: "created" },
        { rowId: rowB, status: "failed" },
      ],
    ],
    [
      "duplicate rowId",
      [
        { rowId: rowA, status: "failed" },
        { rowId: rowA, status: "failed" },
      ],
    ],
    ["missing result", [{ rowId: rowA, status: "failed" }]],
    [
      "unknown rowId",
      [
        { rowId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", status: "failed" },
        { rowId: rowB, status: "failed" },
      ],
    ],
    [
      "unknown status",
      [
        { rowId: rowA, status: "skipped" },
        { rowId: rowB, status: "failed" },
      ],
    ],
  ])("rejects an inconsistent response: %s", async (_label, results) => {
    postMock.mockResolvedValue({ data: { batchId, results } });
    await expect(importEventBatch(snapshot())).rejects.toBeInstanceOf(ImportBatchProtocolError);
  });
});

describe("existing event detail", () => {
  beforeEach(() => getMock.mockReset());

  it("reads the authorized event detail shape while retaining only contract fields", async () => {
    const eventId = "event-existing";
    getMock.mockResolvedValue({
      data: {
        id: eventId,
        type: "concert",
        name: null,
        startDate: "2027-05-15",
        endDate: null,
        venue: { name: "La Riviera", locality: { name: "Madrid", province: "Madrid" } },
        lineup: [{ artistId: "artist-1", name: "Septicflesh" }],
        secretField: "ignored",
      },
    });

    await expect(getExistingEventDetail(eventId)).resolves.toMatchObject({
      id: eventId,
      type: "concert",
      name: null,
      startDate: "2027-05-15",
      venue: { name: "La Riviera", locality: { name: "Madrid", province: "Madrid" } },
      lineup: [{ artistId: "artist-1", name: "Septicflesh" }],
    });
    expect(getMock).toHaveBeenCalledWith("/events/event-existing", { signal: undefined });
  });

  it("accepts UUID-only context and rejects a response for a different event", async () => {
    getMock.mockResolvedValueOnce({ data: { id: "event-id-only" } });
    await expect(getExistingEventDetail("event-id-only")).resolves.toEqual({ id: "event-id-only" });
    getMock.mockResolvedValueOnce({ data: { id: "other-event" } });
    await expect(getExistingEventDetail("requested-event")).rejects.toBeInstanceOf(
      ExistingEventDetailProtocolError
    );
  });

  it("keys cached detail by event UUID and forwards cancellation", async () => {
    const options = existingEventDetailQueryOptions("event-a");
    expect(options.queryKey).toEqual(existingEventDetailQueryKeys.detail("event-a"));
    expect(options.queryKey).not.toEqual(existingEventDetailQueryKeys.detail("event-b"));
    expect(options.staleTime).toBe(15_000);
    getMock.mockResolvedValue({ data: { id: "event-a" } });
    const controller = new AbortController();
    await expect(options.queryFn?.({ signal: controller.signal } as never)).resolves.toEqual({
      id: "event-a",
    });
    expect(getMock).toHaveBeenCalledWith("/events/event-a", { signal: controller.signal });
  });
});
