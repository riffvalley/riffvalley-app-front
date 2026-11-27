import type { ScrapedEventJsonDocument, ScrapedEventJsonRow } from "./scrapedEventJson";
import type { EventImportRow } from "./useEventImportRows";

export type EventImportReviewFilter =
  "needs-review" | "prepared" | "conflicts" | "invalid" | "duplicates" | "all";

export type EventImportReviewCategory = Exclude<EventImportReviewFilter, "all">;

export interface EventImportReviewEntry {
  sourceIndex: number;
  source: ScrapedEventJsonRow;
  row: EventImportRow | null;
  rowId: string | null;
  category: EventImportReviewCategory | "already-draft";
  reasons: string[];
  searchText: string;
}

export interface EventImportReviewCounts extends Record<EventImportReviewFilter, number> {
  alreadyInDraft: number;
}

export function normalizeEventReviewSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("und")
    .trim();
}

function reviewSearchText(source: ScrapedEventJsonRow, row: EventImportRow | null): string {
  return normalizeEventReviewSearch(
    [
      source.title,
      ...source.artists,
      source.locality,
      source.venue,
      source.startDate,
      source.endDate,
      source.type === "festival" ? source.title : "",
      row?.event,
      ...(row?.lineup.map(({ name }) => name) ?? []),
      row?.city,
      row?.venue.name,
      row?.startDate,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

export function buildEventImportReviewEntries(input: {
  document: ScrapedEventJsonDocument;
  analyzedRowIds: Readonly<Record<number, string>>;
  rows: readonly EventImportRow[];
  preparedRowIds: ReadonlySet<string>;
  invalidRowIds: ReadonlySet<string>;
  conflictRowIds: ReadonlySet<string>;
  alreadyInDraftIndexes?: ReadonlySet<number>;
}): { entries: EventImportReviewEntry[]; counts: EventImportReviewCounts } {
  const rowsById = new Map(input.rows.map((row) => [row.id, row]));
  const duplicateIndexes = new Set(input.document.duplicateIndexes);
  const alreadyInDraft = input.alreadyInDraftIndexes ?? new Set<number>();
  const counts: EventImportReviewCounts = {
    "needs-review": 0,
    prepared: 0,
    conflicts: 0,
    invalid: 0,
    duplicates: 0,
    all: input.document.events.length,
    alreadyInDraft: 0,
  };
  const entries = input.document.events.map((source, sourceIndex) => {
    const rowId = input.analyzedRowIds[sourceIndex] ?? null;
    const row = rowId ? (rowsById.get(rowId) ?? null) : null;
    const hardInvalid = source.issues.some(
      (issue) =>
        issue === `Evento ${sourceIndex + 1}: debe ser un objeto.` ||
        issue.startsWith("Tipo inválido") ||
        issue.startsWith("El país del evento")
    );
    let category: EventImportReviewCategory;
    if (duplicateIndexes.has(sourceIndex)) category = "duplicates";
    else if (hardInvalid || (rowId && input.invalidRowIds.has(rowId))) category = "invalid";
    else if (rowId && input.conflictRowIds.has(rowId)) category = "conflicts";
    else if (rowId && input.preparedRowIds.has(rowId)) category = "prepared";
    else if (!rowId && alreadyInDraft.has(sourceIndex)) category = "already-draft";
    else category = "needs-review";
    if (category === "already-draft") counts.alreadyInDraft += 1;
    else counts[category] += 1;
    const reasons = [
      ...source.issues,
      ...(category === "duplicates" ? ["Repetido dentro del archivo."] : []),
      ...(alreadyInDraft.has(sourceIndex)
        ? ["Ya estaba en el borrador y no se volvió a cargar."]
        : []),
    ];
    return {
      sourceIndex,
      source,
      row,
      rowId,
      category,
      reasons: [...new Set(reasons)],
      searchText: reviewSearchText(source, row),
    };
  });
  return { entries, counts };
}

export function filterEventImportReviewEntries(
  entries: readonly EventImportReviewEntry[],
  filter: EventImportReviewFilter,
  search: string
): EventImportReviewEntry[] {
  const query = normalizeEventReviewSearch(search);
  return entries.filter(
    (entry) =>
      (filter === "all" || entry.category === filter) &&
      (!query || entry.searchText.includes(query))
  );
}
