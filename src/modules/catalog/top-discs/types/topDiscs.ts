import type { Country, Genre } from "@services/catalog/catalog";
import type { DiscsStatsResponse } from "@services/discs/discs";

export interface TopDiscsFilterParams {
  dateRange?: [string, string];
  countryId?: string;
  genreId?: string;
  /** Compatibility with the legacy country filter accepted by the API. */
  country?: string;
}

export interface TopDiscsParams extends TopDiscsFilterParams {
  statsDateRange?: [string, string];
  distributionDateRange?: [string, string];
}

export type TopDiscsOptionsParams = TopDiscsFilterParams;

export type TopDiscsResponse = DiscsStatsResponse;

export interface TopDiscsOptionsResponse {
  countries: Country[];
  genres: Genre[];
}

export type AvailableTopDiscCountry = Country;
export type AvailableTopDiscGenre = Genre;
