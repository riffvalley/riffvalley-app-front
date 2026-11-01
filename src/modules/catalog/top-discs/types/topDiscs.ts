import type { Country, Genre } from "@services/catalog/catalog";
import type { Disc } from "@services/discs/discs";

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

/** Contract specific to GET /discs/topDiscs; homeDiscs keeps its legacy DTO. */
export type TopRankedDisc = Omit<Disc, "averageRate" | "voteCount"> & {
  averageRate: number | null;
  voteCount: number;
  weightedScore: number | null;
};

export interface TopDiscsResponse {
  discs: TopRankedDisc[];
  totalDiscs: number;
  totalVotes: number;
  ratingDistribution: { rate: number; count: number }[];
  topUsersByRates: unknown[];
  topUsersByCover: unknown[];
}

export type TopDiscsCardUpdateEvent =
  | {
      type: "rating";
      discId: string;
      rateId: string | null;
      rate: number | null;
      cover: number | null;
      hasMusicalRate: boolean;
      hasCover: boolean;
      averageRate: number | null;
      averageCover: number | null;
      voteCount: number;
    }
  | {
      type: "community";
      discId: string;
      favoriteId: string | null;
      pendingId: string | null;
    };

export interface TopDiscsOptionsResponse {
  countries: Country[];
  genres: Genre[];
}

export type AvailableTopDiscCountry = Country;
export type AvailableTopDiscGenre = Genre;
