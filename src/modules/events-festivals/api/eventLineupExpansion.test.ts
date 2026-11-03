import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  EventLineupExpansionConflictError,
  EventLineupExpansionProtocolError,
  importEventLineupExpansion,
} from "./eventLineupExpansion";
import type { LineupExpansionSnapshot } from "../application/eventLineupExpansionPreparation";

const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }));
vi.mock("@services/api/api", () => ({ default: { post: postMock } }));

const ids = {
  event: "44444444-4444-4444-8444-444444444444",
  batch: "11111111-1111-4111-8111-111111111111",
  row: "22222222-2222-4222-8222-222222222222",
};

function snapshot(): LineupExpansionSnapshot {
  const sourceRow = Object.freeze({
    rowId: ids.row,
    type: "concert" as const,
    startDate: "2027-05-15",
    city: "Madrid",
    countryId: "33333333-3333-4333-8333-333333333333",
    lineup: Object.freeze([{ name: "Gojira", artistId: "66666666-6666-4666-8666-666666666666" }]),
  });
  const payload = Object.freeze({
    batchId: ids.batch,
    rowId: ids.row,
    sourceRow,
    artists: Object.freeze([{ name: "Gojira", artistId: "66666666-6666-4666-8666-666666666666" }]),
  });
  return {
    kind: "event-lineup-expansion",
    eventId: ids.event,
    operation: { batchId: ids.batch, rowId: ids.row },
    payload,
    correlation: {
      sourceRowKey: "local-row",
      sourceOperationRowId: "55555555-5555-4555-8555-555555555555",
      sourceBatchId: ids.batch,
      sourceRevision: 2,
      sourceConflictCode: "CONCERT_DUPLICATE",
      sourceSnapshot: sourceRow,
    },
  } as LineupExpansionSnapshot;
}

describe("importEventLineupExpansion", () => {
  beforeEach(() => postMock.mockReset());

  it("POSTs the exact frozen payload to the event-specific endpoint", async () => {
    const prepared = snapshot();
    const response = {
      status: "updated",
      eventId: ids.event,
      addedArtists: [
        { artistId: "66666666-6666-4666-8666-666666666666", name: "Gojira", position: 2 },
      ],
      existingArtists: [],
    };
    postMock.mockResolvedValue({ data: response });

    await expect(importEventLineupExpansion(prepared)).resolves.toEqual(response);
    expect(postMock).toHaveBeenCalledWith(`/events/${ids.event}/import-lineup`, prepared.payload);
    expect(prepared.payload.sourceRow.rowId).toBe(prepared.payload.rowId);
  });

  it("rejects a mismatched destination and malformed updated results", async () => {
    postMock.mockResolvedValue({
      data: { status: "updated", eventId: "other", addedArtists: [], existingArtists: [] },
    });
    await expect(importEventLineupExpansion(snapshot())).rejects.toBeInstanceOf(
      EventLineupExpansionProtocolError
    );
    postMock.mockResolvedValue({ data: { status: "conflict", eventId: ids.event } });
    await expect(importEventLineupExpansion(snapshot())).rejects.toBeInstanceOf(
      EventLineupExpansionProtocolError
    );
    postMock.mockResolvedValue({
      data: {
        status: "updated",
        eventId: ids.event,
        addedArtists: [{ artistId: "not-a-uuid", name: "Artist" }],
        existingArtists: [],
      },
    });
    await expect(importEventLineupExpansion(snapshot())).rejects.toBeInstanceOf(
      EventLineupExpansionProtocolError
    );
  });

  it("types backend revalidation conflicts and propagates HTTP and network failures", async () => {
    postMock.mockRejectedValueOnce({
      response: {
        status: 409,
        data: { code: "IMPORT_CONFLICT_STALE", message: "stale", conflicts: [] },
      },
    });
    await expect(
      importEventLineupExpansion(snapshot())
    ).rejects.toMatchObject<EventLineupExpansionConflictError>({
      code: "IMPORT_CONFLICT_STALE",
      message: "stale",
      details: { conflicts: [] },
    });
    const networkError = new Error("network");
    postMock.mockRejectedValueOnce(networkError);
    await expect(importEventLineupExpansion(snapshot())).rejects.toBe(networkError);
  });
});
