import { describe, expect, it } from "vitest";
import { resolveTopDiscsSelection } from "./topDiscsFilterSelection";

const countries = [
  { id: "country-1", name: "País 1", isoCode: "P1" },
  { id: "country-2", name: "País 2", isoCode: "P2" },
];
const genres = [
  { id: "genre-1", name: "Género 1", color: "#111111" },
  { id: "genre-2", name: "Género 2", color: "#222222" },
];

describe("resolveTopDiscsSelection", () => {
  it("preserves the explicit country and clears a genre no longer available there", () => {
    expect(
      resolveTopDiscsSelection(
        "country",
        { countryId: "country-2", genreId: "genre-1" },
        { countries, genres: [genres[1]] }
      )
    ).toEqual({ countryId: "country-2", genreId: "" });
  });

  it("preserves the explicit genre and clears a country no longer available with it", () => {
    expect(
      resolveTopDiscsSelection(
        "genre",
        { countryId: "country-1", genreId: "genre-2" },
        { countries: [countries[1]], genres }
      )
    ).toEqual({ countryId: "", genreId: "genre-2" });
  });

  it("validates both selections after a period change and clears incompatible selections together", () => {
    expect(
      resolveTopDiscsSelection(
        "period",
        { countryId: "country-1", genreId: "genre-1" },
        { countries: [countries[1]], genres: [genres[1]] }
      )
    ).toEqual({ countryId: "", genreId: "" });
  });

  it("retains individually valid selections after a period change", () => {
    expect(
      resolveTopDiscsSelection(
        "period",
        { countryId: "country-1", genreId: "genre-1" },
        { countries: [countries[1]], genres: [genres[0]] }
      )
    ).toEqual({ countryId: "", genreId: "genre-1" });
  });
});
