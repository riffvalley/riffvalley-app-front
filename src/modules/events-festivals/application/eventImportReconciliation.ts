import type { ImportBatchResponse, CorrelatedImportResult } from "../api/eventImport";
import type { ImportSnapshot } from "./eventImportPreparation";

export interface ReconciledImportResult {
  item: CorrelatedImportResult;
  current: boolean;
  rowPresent: boolean;
  action: "removed" | "kept" | "stale-created" | "ignored";
}

export interface EventImportReconciliation {
  results: ReconciledImportResult[];
  rowKeysToRemove: string[];
  createdDrafts: Array<{ rowKey: string; eventId: string; operationRowId: string }>;
}

export function countDistinctCreatedEvents(response: ImportBatchResponse): number {
  return new Set(
    response.results.flatMap(({ result }) => (result.status === "created" ? [result.eventId] : []))
  ).size;
}

/** Reconcile only results proven to belong to the immutable request snapshot. */
export function reconcileEventImportResults(
  snapshot: ImportSnapshot,
  response: ImportBatchResponse,
  isCurrent: (snapshot: ImportSnapshot, rowKey: string) => boolean,
  handledOperations: ReadonlySet<string> = new Set(),
  rowExists: (rowKey: string) => boolean = () => true
): EventImportReconciliation {
  if (response.batchId !== snapshot.batchId) {
    return { results: [], rowKeysToRemove: [], createdDrafts: [] };
  }

  const sentByOperation = new Map(snapshot.rows.map((row) => [row.operationRowId, row]));
  const seen = new Set<string>();
  const results: ReconciledImportResult[] = [];
  const rowKeysToRemove = new Set<string>();
  const createdDrafts = new Map<
    string,
    { rowKey: string; eventId: string; operationRowId: string }
  >();

  for (const item of response.results) {
    const sent = sentByOperation.get(item.operationRowId);
    if (
      !sent ||
      seen.has(item.operationRowId) ||
      item.result.rowId !== sent.operationRowId ||
      item.rowKey !== sent.rowKey ||
      item.revision !== sent.revision
    ) {
      results.push({ item, current: false, rowPresent: false, action: "ignored" });
      continue;
    }
    seen.add(item.operationRowId);
    const operationKey = `${snapshot.batchId}:${item.operationRowId}`;
    if (handledOperations.has(operationKey)) {
      results.push({ item, current: false, rowPresent: false, action: "ignored" });
      continue;
    }

    const rowPresent = rowExists(sent.rowKey);
    const current = rowPresent && isCurrent(snapshot, sent.rowKey);
    if (item.result.status === "created" && current) {
      rowKeysToRemove.add(sent.rowKey);
      results.push({ item, current: true, rowPresent: true, action: "removed" });
    } else if (item.result.status === "created") {
      if (rowPresent) {
        createdDrafts.set(item.operationRowId, {
          rowKey: sent.rowKey,
          eventId: item.result.eventId,
          operationRowId: item.operationRowId,
        });
        results.push({ item, current: false, rowPresent, action: "stale-created" });
      } else {
        results.push({ item, current: false, rowPresent, action: "kept" });
      }
    } else {
      results.push({ item, current, rowPresent, action: "kept" });
    }
  }

  return {
    results,
    rowKeysToRemove: [...rowKeysToRemove],
    createdDrafts: [...createdDrafts.values()],
  };
}
