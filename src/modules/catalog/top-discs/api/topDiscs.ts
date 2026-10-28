import api from "@services/api/api";
import type {
  AvailableTopDiscCountry,
  AvailableTopDiscGenre,
  TopDiscsOptionsParams,
  TopDiscsOptionsResponse,
  TopDiscsParams,
  TopDiscsResponse,
} from "../types/topDiscs";
import { normalizeTopDiscsFilterParams } from "../utils/normalizeParams";

type TopDiscsRequestParams = {
  dateRange?: [string, string];
  countryId?: string;
  genreId?: string;
  country?: string;
  statsDateRange?: [string, string];
  distributionDateRange?: [string, string];
};

function normalizeFilterParams(
  params: TopDiscsParams | TopDiscsOptionsParams
): TopDiscsRequestParams {
  return normalizeTopDiscsFilterParams(params);
}

export function buildTopDiscsRequestParams(params: TopDiscsParams = {}): TopDiscsRequestParams {
  return {
    ...normalizeFilterParams(params),
    ...(params.statsDateRange
      ? { statsDateRange: [params.statsDateRange[0], params.statsDateRange[1]] }
      : {}),
    ...(params.distributionDateRange
      ? {
          distributionDateRange: [params.distributionDateRange[0], params.distributionDateRange[1]],
        }
      : {}),
  };
}

export function buildTopDiscsOptionsRequestParams(
  params: TopDiscsOptionsParams = {}
): TopDiscsRequestParams {
  return normalizeFilterParams(params);
}

export function mapTopDiscsOptions(response: TopDiscsOptionsResponse): TopDiscsOptionsResponse {
  return {
    countries: response.countries.map((country): AvailableTopDiscCountry => ({
      id: country.id,
      name: country.name,
      isoCode: country.isoCode,
    })),
    genres: response.genres.map((genre): AvailableTopDiscGenre => ({
      id: genre.id,
      name: genre.name,
      color: genre.color,
    })),
  };
}

export async function getTopDiscs(
  params: TopDiscsParams = {},
  signal?: AbortSignal
): Promise<TopDiscsResponse> {
  const response = await api.get<TopDiscsResponse>("/discs/topDiscs", {
    params: buildTopDiscsRequestParams(params),
    ...(signal ? { signal } : {}),
  });
  return response.data;
}

export async function getTopDiscsOptions(
  params: TopDiscsOptionsParams = {},
  signal?: AbortSignal
): Promise<TopDiscsOptionsResponse> {
  const response = await api.get<TopDiscsOptionsResponse>("/discs/topDiscs/options", {
    params: buildTopDiscsOptionsRequestParams(params),
    ...(signal ? { signal } : {}),
  });
  return mapTopDiscsOptions(response.data);
}
