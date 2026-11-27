import type { ScrapedEventJsonDocument } from "./scrapedEventJson";

export interface EventImportAnalysisCounts {
  total: number;
  prepared: number;
  needsIntervention: number;
  conflicts: number;
  duplicates: number;
  invalid: number;
  alreadyInDraft: number;
  resolutionErrors: number;
}

export function summarizeEventImportAnalysis(
  document: ScrapedEventJsonDocument,
  analyzedRowIds: Readonly<Record<number, string>>,
  eligibleRowIds: ReadonlySet<string>,
  resolutionErrors: number,
  invalidRowIds: ReadonlySet<string> = new Set(),
  conflictRowIds: ReadonlySet<string> = new Set()
): EventImportAnalysisCounts {
  const duplicateIndexes = new Set(document.duplicateIndexes);
  const isExcludedAsInvalid = (index: number) =>
    document.events[index]?.issues.some(
      (issue) =>
        issue === `Evento ${index + 1}: debe ser un objeto.` ||
        issue.startsWith("Tipo inválido") ||
        issue.startsWith("El país del evento")
    ) ?? false;
  const invalidIndexes = new Set(
    document.events.flatMap((_, index) =>
      !duplicateIndexes.has(index) && isExcludedAsInvalid(index) ? [index] : []
    )
  );
  const validIndexes = document.events.flatMap((_, index) =>
    !duplicateIndexes.has(index) && !invalidIndexes.has(index) ? [index] : []
  );
  const validRows = Object.entries(analyzedRowIds).filter(([index]) =>
    validIndexes.includes(Number(index))
  );
  const rowIds = validRows.map(([, rowId]) => rowId);
  const invalidRows = new Set(rowIds.filter((rowId) => invalidRowIds.has(rowId)));
  const conflicts = new Set(
    rowIds.filter((rowId) => !invalidRows.has(rowId) && conflictRowIds.has(rowId))
  );
  const prepared = rowIds.filter(
    (rowId) => eligibleRowIds.has(rowId) && !invalidRows.has(rowId) && !conflicts.has(rowId)
  ).length;
  const alreadyInDraft = Math.max(0, validIndexes.length - validRows.length);

  return {
    total: document.events.length,
    prepared,
    needsIntervention: Math.max(0, validRows.length - prepared - invalidRows.size - conflicts.size),
    conflicts: conflicts.size,
    duplicates: duplicateIndexes.size,
    invalid: invalidIndexes.size + invalidRows.size,
    alreadyInDraft,
    resolutionErrors,
  };
}
