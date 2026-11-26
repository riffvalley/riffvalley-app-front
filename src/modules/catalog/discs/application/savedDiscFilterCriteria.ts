import type { SavedDiscFilterCriteria } from "../types/savedDiscFilter";
import { getDiscListYearRange } from "./discListDateFilters";

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

/** Texto corto con el rango de años de un filtro guardado («2025», «2025–2026», «Desde 2025»…). */
export function describeSavedDiscFilterYears({ yearFrom, yearTo }: SavedDiscFilterCriteria): string {
  if (yearFrom === null && yearTo === null) return "Todos los años";
  if (yearFrom !== null && yearTo !== null)
    return yearFrom === yearTo ? String(yearFrom) : `${yearFrom}–${yearTo}`;
  return yearFrom !== null ? `Desde ${yearFrom}` : `Hasta ${yearTo}`;
}

/** Rango de fechas de Discos equivalente a los años de un filtro guardado (null = todos los años). */
export function savedDiscFilterDateRange({ yearFrom, yearTo }: SavedDiscFilterCriteria): [string, string] | null {
  if (yearFrom === null && yearTo === null) return null;
  return [getDiscListYearRange(yearFrom ?? 1)[0], getDiscListYearRange(yearTo ?? 9999)[1]];
}
