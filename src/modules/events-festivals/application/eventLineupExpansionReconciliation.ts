import type { EventLineupExpansionResponse } from "../api/eventLineupExpansion";
import type { LineupExpansionSnapshot } from "./eventLineupExpansionPreparation";

export interface ReconciledLineupExpansion {
  operationKey: string;
  rowKey: string;
  eventId: string;
  response: EventLineupExpansionResponse;
  current: boolean;
  rowPresent: boolean;
  action: "removed" | "kept" | "already-handled";
}

export function lineupExpansionOperationKey(snapshot: LineupExpansionSnapshot): string {
  return JSON.stringify([snapshot.eventId, snapshot.operation.batchId, snapshot.operation.rowId]);
}

/** Correlates a validated response with the exact authorized snapshot, once per operation. */
export function reconcileLineupExpansionResult(
  snapshot: LineupExpansionSnapshot,
  response: EventLineupExpansionResponse,
  isCurrent: (snapshot: LineupExpansionSnapshot) => boolean,
  rowExists: (rowKey: string) => boolean,
  handledOperations: Set<string>
): ReconciledLineupExpansion {
  const operationKey = lineupExpansionOperationKey(snapshot);
  const rowKey = snapshot.correlation.sourceRowKey;
  if (handledOperations.has(operationKey)) {
    return {
      operationKey,
      rowKey,
      eventId: snapshot.eventId,
      response,
      current: false,
      rowPresent: rowExists(rowKey),
      action: "already-handled",
    };
  }
  if (response.status !== "updated" || response.eventId !== snapshot.eventId) {
    throw new Error("La ampliación no corresponde al destino autorizado.");
  }
  handledOperations.add(operationKey);
  const rowPresent = rowExists(rowKey);
  const current = rowPresent && isCurrent(snapshot);
  return {
    operationKey,
    rowKey,
    eventId: snapshot.eventId,
    response,
    current,
    rowPresent,
    action: current ? "removed" : "kept",
  };
}
