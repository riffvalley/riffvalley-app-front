import type { SavedDiscFilterCriteria } from "../types/savedDiscFilter";

export function normalizeSavedDiscFilterCriteria(
  criteria: SavedDiscFilterCriteria
): SavedDiscFilterCriteria {
  return {
    genreIds: [...new Set(criteria.genreIds.map((id) => id.trim().toLowerCase()).filter(Boolean))].sort(),
    countryId: criteria.countryId?.trim().toLowerCase() || null,
    yearFrom: criteria.yearFrom ?? null,
    yearTo: criteria.yearTo ?? null,
  };
}

export function areSavedDiscFilterCriteriaEqual(
  first: SavedDiscFilterCriteria,
  second: SavedDiscFilterCriteria
): boolean {
  const a = normalizeSavedDiscFilterCriteria(first);
  const b = normalizeSavedDiscFilterCriteria(second);
  return (
    a.genreIds.length === b.genreIds.length &&
    a.genreIds.every((id, index) => id === b.genreIds[index]) &&
    a.countryId === b.countryId &&
    a.yearFrom === b.yearFrom &&
    a.yearTo === b.yearTo
  );
}

export function isEmptySavedDiscFilterCriteria(criteria: SavedDiscFilterCriteria): boolean {
  const normalized = normalizeSavedDiscFilterCriteria(criteria);
  return (
    normalized.genreIds.length === 0 &&
    normalized.countryId === null &&
    normalized.yearFrom === null &&
    normalized.yearTo === null
  );
}
