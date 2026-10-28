import type { TopDiscsFilterParams, TopDiscsParams } from "../types/topDiscs";

export function normalizeTopDiscsFilterParams(
  params: TopDiscsFilterParams = {}
): TopDiscsFilterParams {
  return {
    ...(params.dateRange ? { dateRange: [params.dateRange[0], params.dateRange[1]] } : {}),
    ...(params.countryId ? { countryId: params.countryId } : {}),
    ...(params.genreId ? { genreId: params.genreId } : {}),
    ...(params.country ? { country: params.country } : {}),
  };
}

export function normalizeTopDiscsParams(params: TopDiscsParams = {}): TopDiscsParams {
  return {
    ...normalizeTopDiscsFilterParams(params),
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
