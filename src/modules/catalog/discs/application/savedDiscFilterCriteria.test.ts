import { describe, expect, it } from "vitest";
import {
  areSavedDiscFilterCriteriaEqual,
  isEmptySavedDiscFilterCriteria,
  normalizeSavedDiscFilterCriteria,
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
});
