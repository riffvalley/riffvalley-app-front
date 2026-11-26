import { describe, expect, it } from "vitest";
import {
  areSavedDiscFilterCriteriaEqual,
  describeSavedDiscFilterYears,
  isEmptySavedDiscFilterCriteria,
  normalizeSavedDiscFilterCriteria,
  savedDiscFilterDateRange,
} from "./savedDiscFilterCriteria";

describe("saved DiscList filter criteria", () => {
  it("compares genres as a normalized set independent of order", () => {
    expect(
      areSavedDiscFilterCriteriaEqual(
        { genreIds: ["GENRE-B", "genre-a", "genre-a"], countryId: "COUNTRY-A", yearFrom: 2025, yearTo: null },
        { genreIds: ["genre-a", "genre-b"], countryId: "country-a", yearFrom: 2025, yearTo: null }
      )
    ).toBe(true);
  });

  it("normalizes canonical criteria and detects only a fully empty combination", () => {
    expect(normalizeSavedDiscFilterCriteria({ genreIds: [" B ", "a", "b"], countryId: " ", yearFrom: null, yearTo: 2026 })).toEqual({
      genreIds: ["a", "b"], countryId: null, yearFrom: null, yearTo: 2026,
    });
    expect(isEmptySavedDiscFilterCriteria({ genreIds: [], countryId: null, yearFrom: null, yearTo: null })).toBe(true);
    expect(isEmptySavedDiscFilterCriteria({ genreIds: [], countryId: null, yearFrom: 2025, yearTo: null })).toBe(false);
  });

  it("describes the year range of a saved filter", () => {
    const base = { genreIds: [], countryId: null };
    expect(describeSavedDiscFilterYears({ ...base, yearFrom: null, yearTo: null })).toBe("Todos los años");
    expect(describeSavedDiscFilterYears({ ...base, yearFrom: 2025, yearTo: 2025 })).toBe("2025");
    expect(describeSavedDiscFilterYears({ ...base, yearFrom: 2025, yearTo: 2026 })).toBe("2025–2026");
    expect(describeSavedDiscFilterYears({ ...base, yearFrom: 2025, yearTo: null })).toBe("Desde 2025");
    expect(describeSavedDiscFilterYears({ ...base, yearFrom: null, yearTo: 2026 })).toBe("Hasta 2026");
  });

  it("turns saved years into the DiscList date range", () => {
    const base = { genreIds: [], countryId: null };
    expect(savedDiscFilterDateRange({ ...base, yearFrom: null, yearTo: null })).toBeNull();
    expect(savedDiscFilterDateRange({ ...base, yearFrom: 2025, yearTo: 2026 })).toEqual([
      "2025-01-01T00:00:00.000Z",
      "2026-12-31T23:59:59.999Z",
    ]);
  });
});
