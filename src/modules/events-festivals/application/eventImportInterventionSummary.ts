import type { EventImportRow } from "./useEventImportRows";
import type { PendingImportRow } from "./eventImportPreparation";

export type EventImportInterventionReasonId =
  | "required-data"
  | "validation"
  | "unresolved-reference"
  | "resolution-error"
  | "resolution-incomplete"
  | "blocked-operation"
  | "other";

export interface EventImportInterventionReasonCount {
  id: EventImportInterventionReasonId;
  label: string;
  rowCount: number;
}

export interface EventImportInterventionSummary {
  needsIntervention: number;
  readyForLaterBatches: number;
  reasons: EventImportInterventionReasonCount[];
}

const LABELS: Record<EventImportInterventionReasonId, string> = {
  "required-data": "Faltan datos obligatorios",
  validation: "Errores de validación",
  "unresolved-reference": "Referencias que requieren selección o confirmación",
  "resolution-error": "Errores al resolver referencias",
  "resolution-incomplete": "Resoluciones pendientes",
  "blocked-operation": "Filas bloqueadas por una operación anterior",
  other: "Otros motivos",
};

const REQUIRED_DATA_REASONS = new Set([
  "city-required",
  "lineup-required",
  "name-required",
  "country-unavailable",
]);

const VALIDATION_REASONS = new Set([
  "invalid-type",
  "start-date-invalid",
  "end-date-invalid",
  "end-date-before-start-date",
  "administrative-region-invalid",
  "administrative-region-required",
  "administrative-region-country-mismatch",
  "locality-invalid",
  "locality-country-mismatch",
  "locality-identity-stale",
  "locality-province-mismatch",
  "locality-region-mismatch",
  "venue-identity-stale",
  "venue-locality-mismatch",
  "venue-name-mismatch",
  "artist-invalid",
  "tour-invalid",
]);

const BLOCKED_OPERATION_REASONS = new Set([
  "event-already-created-draft-diverged",
  "lineup-expansion-already-applied",
  "operation-uncertain",
  "operation-snapshot-protected",
  "automatic-batch-already-processed",
]);

function classifyReason(
  reason: string,
  row: EventImportRow | undefined
): EventImportInterventionReasonId {
  const code = reason.split(":", 1)[0]!;
  if (code === "start-date-invalid" && row && !row.startDateDraft.trim()) return "required-data";
  if (REQUIRED_DATA_REASONS.has(code)) return "required-data";
  if (BLOCKED_OPERATION_REASONS.has(code)) return "blocked-operation";
  if (reason.includes("resolution-error") || reason.startsWith("artist-resolution-error"))
    return "resolution-error";
  if (reason.includes("resolution-pending") || reason.endsWith("-resolving"))
    return "resolution-incomplete";
  if (
    code.startsWith("artist-") ||
    code.startsWith("locality-") ||
    code.startsWith("venue-") ||
    code.startsWith("tour-")
  ) {
    if (code.includes("ambiguous") || code.includes("confirmation-required"))
      return "unresolved-reference";
  }
  if (VALIDATION_REASONS.has(code) || code.endsWith("-invalid") || code.endsWith("-mismatch"))
    return "validation";
  return "other";
}

/** Counts intervention rows uniquely while allowing each row to contribute to several reason groups. */
export function summarizeEventImportIntervention(
  pendingRows: readonly PendingImportRow[],
  rows: readonly EventImportRow[]
): EventImportInterventionSummary {
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  const interventionRowIds = new Set<string>();
  const laterBatchRowIds = new Set<string>();
  const rowIdsByReason = new Map<EventImportInterventionReasonId, Set<string>>();

  for (const pending of pendingRows) {
    if (pending.reasons.every((reason) => reason === "batch-limit-exceeded")) {
      laterBatchRowIds.add(pending.rowKey);
      continue;
    }
    interventionRowIds.add(pending.rowKey);
    const row = rowsById.get(pending.rowKey);
    for (const reason of pending.reasons) {
      if (reason === "batch-limit-exceeded") continue;
      const id = classifyReason(reason, row);
      const group = rowIdsByReason.get(id) ?? new Set<string>();
      group.add(pending.rowKey);
      rowIdsByReason.set(id, group);
    }
  }

  const reasons = [...rowIdsByReason.entries()]
    .map(([id, rowIds]) => ({ id, label: LABELS[id], rowCount: rowIds.size }))
    .sort((left, right) => right.rowCount - left.rowCount || left.label.localeCompare(right.label));

  return {
    needsIntervention: interventionRowIds.size,
    readyForLaterBatches: laterBatchRowIds.size,
    reasons,
  };
}
