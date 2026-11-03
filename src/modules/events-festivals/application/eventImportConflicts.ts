import type { CorrelatedImportResult, ImportConflict, ImportEventRowDto } from "../api/eventImport";
import type { ImportSnapshot } from "./eventImportPreparation";

export interface EventImportConflictReference {
  operationRowId: string;
  rowKey: string | null;
  snapshotRevision: number | null;
  available: boolean;
}

export interface EventImportConflictPresentation {
  operationId: string;
  rowKey: string;
  operationRowId: string;
  snapshotRevision: number;
  status: "current" | "historical";
  code: ImportConflict["code"];
  message: string;
  severity: ImportConflict["severity"];
  kind: ImportConflict["kind"];
  /** Exact row sent in this operation; never read from the editable table. */
  snapshot: ImportEventRowDto;
  relatedRows: EventImportConflictReference[];
  existingEventIds: string[];
  candidateEventIds: string[];
  eventReferences: Array<{ eventId: string; status: "identified" | "candidate" }>;
  matchingArtists: ImportConflict["matchingArtists"];
  addableArtists: ImportConflict["addableArtists"];
}

/** Adapt the validated HTTP result to a stable, row-oriented presentation model. */
export function createEventImportConflictPresentation(
  snapshot: ImportSnapshot,
  results: readonly CorrelatedImportResult[],
  existingRowKeys: ReadonlySet<string>,
  isCurrent: (rowKey: string) => boolean
): EventImportConflictPresentation[] {
  const sentByOperationId = new Map(snapshot.rows.map((row) => [row.operationRowId, row]));
  const output: EventImportConflictPresentation[] = [];
  const seen = new Set<string>();

  for (const result of results) {
    if (result.result.status !== "conflict") continue;
    const source = sentByOperationId.get(result.operationRowId);
    if (
      !source ||
      source.rowKey !== result.rowKey ||
      source.revision !== result.revision ||
      result.result.rowId !== result.operationRowId
    )
      continue;

    for (const conflict of result.result.conflicts ?? []) {
      // The server may repeat one relation in an outcome. Keep one item per source row and
      // semantic relation, while preserving relations emitted for the other participant.
      const key = JSON.stringify([
        snapshot.batchId,
        source.operationRowId,
        conflict.kind,
        conflict.code,
        conflict.message,
        conflict.severity,
        [...conflict.relatedRowIds].sort(),
        [...conflict.existingEventIds].sort(),
        [...conflict.candidateEventIds].sort(),
      ]);
      if (seen.has(key)) continue;
      seen.add(key);
      output.push({
        operationId: snapshot.batchId,
        rowKey: source.rowKey,
        operationRowId: source.operationRowId,
        snapshotRevision: source.revision,
        status:
          isCurrent(source.rowKey) &&
          conflict.relatedRowIds.every((operationRowId) => {
            const related = sentByOperationId.get(operationRowId);
            return Boolean(
              related && existingRowKeys.has(related.rowKey) && isCurrent(related.rowKey)
            );
          })
            ? "current"
            : "historical",
        code: conflict.code,
        message: conflict.message,
        severity: conflict.severity,
        kind: conflict.kind,
        snapshot: source.dto,
        relatedRows: [...new Set(conflict.relatedRowIds)].map((operationRowId) => {
          const related = sentByOperationId.get(operationRowId);
          return {
            operationRowId,
            rowKey: related?.rowKey ?? null,
            snapshotRevision: related?.revision ?? null,
            available: Boolean(related && existingRowKeys.has(related.rowKey)),
          };
        }),
        existingEventIds: [...new Set(conflict.existingEventIds)],
        candidateEventIds: [...new Set(conflict.candidateEventIds)],
        eventReferences: [
          ...[...new Set(conflict.existingEventIds)].map((eventId) => ({
            eventId,
            status: "identified" as const,
          })),
          ...[...new Set(conflict.candidateEventIds)]
            .filter((eventId) => !conflict.existingEventIds.includes(eventId))
            .map((eventId) => ({ eventId, status: "candidate" as const })),
        ],
        matchingArtists: conflict.matchingArtists,
        addableArtists: conflict.addableArtists,
      });
    }
  }
  return output;
}
