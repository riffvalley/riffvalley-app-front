import api from "@services/api/api";

export interface CommunityDashboardRankingsResponse {
  year: number;
  topUsersByRates: Array<{
    user: { id: string; username: string };
    rateCount: number;
  }>;
  topUsersByCover: Array<{
    user: { id: string; username: string };
    totalCover: number;
  }>;
}

export interface CommunityDashboardStatsResponse {
  year: number;
  summary: {
    ratedDiscs: number;
    releasedDiscs: number;
    participatingUsers: number;
    averageRating: number | null;
  };
  ratingDistribution: Array<{
    label: string;
    min: number;
    max: number;
    minInclusive: boolean;
    maxInclusive: boolean;
    count: number;
  }>;
  currentStreaks: Array<{
    user: { id: string; username: string };
    days: number;
  }>;
  topGenres: Array<{ id: string; name: string; ratedDiscs: number }>;
}

export async function getCommunityDashboardRankings(
  year: number,
  signal?: AbortSignal,
): Promise<CommunityDashboardRankingsResponse> {
  const response = await api.get<CommunityDashboardRankingsResponse>(
    "/community/dashboard/rankings",
    {
      params: { year },
      ...(signal ? { signal } : {}),
    },
  );
  return response.data;
}

export async function getCommunityDashboardStats(
  year: number,
  signal?: AbortSignal,
): Promise<CommunityDashboardStatsResponse> {
  const response = await api.get<CommunityDashboardStatsResponse>(
    "/community/dashboard/stats",
    {
      params: { year },
      ...(signal ? { signal } : {}),
    },
  );
  return response.data;
}
