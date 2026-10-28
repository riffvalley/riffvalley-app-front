import type { TopDiscsOptionsResponse } from "../types/topDiscs";

export type TopDiscsFilterAction = "period" | "country" | "genre";

export interface TopDiscsSelection {
  countryId: string;
  genreId: string;
}

export function resolveTopDiscsSelection(
  action: TopDiscsFilterAction,
  selection: TopDiscsSelection,
  options: TopDiscsOptionsResponse
): TopDiscsSelection {
  if (action === "country") {
    return {
      countryId: selection.countryId,
      genreId:
        selection.genreId && options.genres.some((genre) => genre.id === selection.genreId)
          ? selection.genreId
          : "",
    };
  }

  if (action === "genre") {
    return {
      countryId:
        selection.countryId &&
        options.countries.some((country) => country.id === selection.countryId)
          ? selection.countryId
          : "",
      genreId: selection.genreId,
    };
  }

  return {
    countryId:
      selection.countryId && options.countries.some((country) => country.id === selection.countryId)
        ? selection.countryId
        : "",
    genreId:
      selection.genreId && options.genres.some((genre) => genre.id === selection.genreId)
        ? selection.genreId
        : "",
  };
}
