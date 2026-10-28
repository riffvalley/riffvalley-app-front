import { QueryClient } from "@tanstack/vue-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCommunityDashboardStats } = vi.hoisted(() => ({ getCommunityDashboardStats: vi.fn() }));
vi.mock("@services/community/dashboard", () => ({ getCommunityDashboardStats }));

import {
  communityDashboardStatsGcTime,
  communityDashboardStatsQueryKeyForSession,
  communityDashboardStatsStaleTime,
  prefetchCommunityDashboardStats,
} from "./communityDashboardStats";

const stats = (year: number) => ({
  year,
  summary: { ratedDiscs: 5, releasedDiscs: 4, participatingUsers: 2, averageRating: 7 },
  ratingDistribution: [],
  currentStreaks: [],
  topGenres: [],
});

describe("Community dashboard stats query", () => {
  let client: QueryClient;

  beforeEach(() => {
    getCommunityDashboardStats.mockReset().mockImplementation(async (year: number) => stats(year));
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  });

  it("keys by resource, year, user, role, and session generation", () => {
    const base = communityDashboardStatsQueryKeyForSession(2026, "user-a", "user", 1);
    expect(base).toEqual(["community", "dashboard-stats", 2026, "user-a", "user", 1]);
    expect(communityDashboardStatsQueryKeyForSession(2025, "user-a", "user", 1)).not.toEqual(base);
    expect(communityDashboardStatsQueryKeyForSession(2026, "user-b", "user", 1)).not.toEqual(base);
    expect(communityDashboardStatsQueryKeyForSession(2026, "user-a", "user", 2)).not.toEqual(base);
  });

  it("uses the requested year, deduplicates valid cache entries, and isolates sessions", async () => {
    await prefetchCommunityDashboardStats(client, 2026, { userId: "user-a", role: "user", generation: 1 });
    await prefetchCommunityDashboardStats(client, 2026, { userId: "user-a", role: "user", generation: 1 });
    await prefetchCommunityDashboardStats(client, 2025, { userId: "user-a", role: "user", generation: 1 });
    await prefetchCommunityDashboardStats(client, 2026, { userId: "user-b", role: "user", generation: 1 });

    expect(getCommunityDashboardStats.mock.calls.map(([year]) => year)).toEqual([2026, 2025, 2026]);
    expect(client.getQueryData(communityDashboardStatsQueryKeyForSession(2026, "user-a", "user", 1))).toEqual(stats(2026));
    expect(client.getQueryData(communityDashboardStatsQueryKeyForSession(2026, "user-b", "user", 1))).toEqual(stats(2026));
    expect(communityDashboardStatsStaleTime).toBe(60_000);
    expect(communityDashboardStatsGcTime).toBe(5 * 60_000);
  });
});
