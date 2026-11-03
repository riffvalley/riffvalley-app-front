import { describe, expect, it } from "vitest";
import type { EventLineupExpansionResponse } from "../api/eventLineupExpansion";
import type { LineupExpansionSnapshot } from "./eventLineupExpansionPreparation";
import {
  lineupExpansionOperationKey,
  reconcileLineupExpansionResult,
} from "./eventLineupExpansionReconciliation";

const snapshot = {
  kind: "event-lineup-expansion",
  eventId: "44444444-4444-4444-8444-444444444444",
  operation: {
    batchId: "11111111-1111-4111-8111-111111111111",
    rowId: "22222222-2222-4222-8222-222222222222",
  },
  payload: {
    batchId: "11111111-1111-4111-8111-111111111111",
    rowId: "22222222-2222-4222-8222-222222222222",
    sourceRow: { rowId: "22222222-2222-4222-8222-222222222222" },
    artists: [{ name: "Artist" }],
  },
  correlation: {
    sourceRowKey: "draft-row",
    sourceOperationRowId: "original-row",
    sourceBatchId: "11111111-1111-4111-8111-111111111111",
    sourceRevision: 3,
    sourceConflictCode: "CONCERT_DUPLICATE",
    sourceSnapshot: {},
  },
} as unknown as LineupExpansionSnapshot;
const response: EventLineupExpansionResponse = {
  status: "updated",
  eventId: snapshot.eventId,
  addedArtists: [{ artistId: "artist-1", name: "New Artist", position: 3 }],
  existingArtists: [{ artistId: "artist-2", name: "Existing Artist", position: 1 }],
};

describe("reconcileLineupExpansionResult", () => {
  it("removes only a matching unchanged row and retains both result lists", () => {
    const handled = new Set<string>();
    const result = reconcileLineupExpansionResult(
      snapshot,
      response,
      () => true,
      () => true,
      handled
    );
    expect(result).toMatchObject({
      action: "removed",
      current: true,
      rowPresent: true,
      eventId: snapshot.eventId,
    });
    expect(result.response.addedArtists).toEqual(response.addedArtists);
    expect(result.response.existingArtists).toEqual(response.existingArtists);
  });

  it("keeps a concurrently edited row and a discarded row stays absent", () => {
    const edited = reconcileLineupExpansionResult(
      snapshot,
      response,
      () => false,
      () => true,
      new Set()
    );
    expect(edited.action).toBe("kept");
    expect(edited.current).toBe(false);
    const discarded = reconcileLineupExpansionResult(
      snapshot,
      response,
      () => false,
      () => false,
      new Set()
    );
    expect(discarded).toMatchObject({ action: "kept", rowPresent: false });
  });

  it("does not reconcile a replay twice under the same operation identity", () => {
    const handled = new Set<string>();
    const key = lineupExpansionOperationKey(snapshot);
    const first = reconcileLineupExpansionResult(
      snapshot,
      response,
      () => true,
      () => true,
      handled
    );
    const replay = reconcileLineupExpansionResult(
      snapshot,
      response,
      () => true,
      () => true,
      handled
    );
    expect(first.action).toBe("removed");
    expect(replay.action).toBe("already-handled");
    expect(handled).toEqual(new Set([key]));
  });
});
