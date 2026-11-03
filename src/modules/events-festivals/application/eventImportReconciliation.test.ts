import { describe, expect, it } from "vitest";
import type { ImportBatchResponse } from "../api/eventImport";
import type { ImportSnapshot } from "./eventImportPreparation";
import {
  countDistinctCreatedEvents,
  reconcileEventImportResults,
} from "./eventImportReconciliation";

function makeSnapshot(rowKeys: string[]): ImportSnapshot {
  const rows = rowKeys.map((rowKey, index) => ({
    rowKey,
    operationRowId: `operation-${index}`,
    revision: 1,
    dto: { rowId: `operation-${index}` },
  }));
  return { batchId: "batch-1", countryId: "country", rows, payload: {} } as ImportSnapshot;
}

function makeResponse(
  snapshot: ImportSnapshot,
  statuses: Array<"created" | "conflict" | "invalid" | "failed">
): ImportBatchResponse {
  return {
    batchId: snapshot.batchId,
    results: snapshot.rows.map((row, index) => {
      const status = statuses[index]!;
      return {
        operationRowId: row.operationRowId,
        rowKey: row.rowKey,
        revision: row.revision,
        result:
          status === "created"
            ? { rowId: row.operationRowId, status, eventId: `event-${index}` }
            : { rowId: row.operationRowId, status },
      } as ImportBatchResponse["results"][number];
    }),
  };
}

describe("reconcileEventImportResults", () => {
  it("retires only unchanged created rows from a mixed batch", () => {
    const snapshot = makeSnapshot(["a", "b", "c", "d"]);
    const response = makeResponse(snapshot, ["created", "conflict", "invalid", "failed"]);
    const result = reconcileEventImportResults(snapshot, response, (_snapshot, key) => key === "a");

    expect(result.rowKeysToRemove).toEqual(["a"]);
    expect(result.results.map(({ action }) => action)).toEqual(["removed", "kept", "kept", "kept"]);
    expect(result.createdDrafts).toEqual([]);
  });

  it("removes several rows by operation identity regardless of their current order", () => {
    const snapshot = makeSnapshot(["row-a", "row-b", "row-c"]);
    const result = reconcileEventImportResults(
      snapshot,
      makeResponse(snapshot, ["created", "created", "created"]),
      (_snapshot, key) => ["row-a", "row-c"].includes(key)
    );
    expect(result.rowKeysToRemove).toEqual(["row-a", "row-c"]);
  });

  it("does not recreate deleted rows or apply results to a replacement row", () => {
    const snapshot = makeSnapshot(["deleted-row"]);
    const result = reconcileEventImportResults(
      snapshot,
      makeResponse(snapshot, ["created"]),
      () => false,
      new Set(),
      () => false
    );
    expect(result.rowKeysToRemove).toEqual([]);
    expect(result.createdDrafts).toEqual([]);
    expect(result.results[0]?.action).toBe("kept");
    expect(result.results[0]?.rowPresent).toBe(false);
  });

  it("keeps a changed created draft and retains the persisted event identity", () => {
    const snapshot = makeSnapshot(["edited-row"]);
    const result = reconcileEventImportResults(
      snapshot,
      makeResponse(snapshot, ["created"]),
      () => false
    );
    expect(result.rowKeysToRemove).toEqual([]);
    expect(result.createdDrafts[0]).toEqual({
      rowKey: "edited-row",
      eventId: "event-0",
      operationRowId: "operation-0",
    });
  });

  it("keeps a changed negative-result draft without treating the old result as current", () => {
    const snapshot = makeSnapshot(["edited-conflict"]);
    const result = reconcileEventImportResults(
      snapshot,
      makeResponse(snapshot, ["conflict"]),
      () => false
    );
    expect(result.rowKeysToRemove).toEqual([]);
    expect(result.results[0]).toMatchObject({ action: "kept", current: false, rowPresent: true });
  });

  it("is idempotent for a repeated operation and rejects mismatched correlation", () => {
    const snapshot = makeSnapshot(["row-a", "row-b"]);
    const response = makeResponse(snapshot, ["created", "created"]);
    response.results[1]!.rowKey = "row-a";
    const result = reconcileEventImportResults(
      snapshot,
      response,
      () => true,
      new Set(["batch-1:operation-0"])
    );
    expect(result.rowKeysToRemove).toEqual([]);
    expect(result.results.map(({ action }) => action)).toEqual(["ignored", "ignored"]);
  });

  it("treats the same row operation in a different batch as a new response", () => {
    const original = makeSnapshot(["row-a"]);
    const nextBatch = { ...original, batchId: "batch-2" } as ImportSnapshot;
    const result = reconcileEventImportResults(
      nextBatch,
      makeResponse(nextBatch, ["created"]),
      () => true,
      new Set(["batch-1:operation-0"])
    );
    expect(result.rowKeysToRemove).toEqual(["row-a"]);
  });

  it("deduplicates replayed event counts by backend event id", () => {
    const snapshot = makeSnapshot(["one", "two"]);
    const response = makeResponse(snapshot, ["created", "created"]);
    (response.results[1]!.result as { eventId?: string }).eventId = "event-0";
    const result = reconcileEventImportResults(snapshot, response, () => true);
    expect(countDistinctCreatedEvents(response)).toBe(1);
    expect(result.rowKeysToRemove).toEqual(["one", "two"]);
  });
});
