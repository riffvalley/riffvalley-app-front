import { beforeEach, describe, expect, it, vi } from "vitest";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@services/api/api", () => ({ default: { get } }));

import { getCommunityDashboardStats } from "./dashboard";

describe("Community dashboard stats service", () => {
  beforeEach(() => get.mockReset());

  it("requests the stats endpoint with the selected year and forwards cancellation", async () => {
    const payload = {
      year: 2026,
      summary: { ratedDiscs: 9, releasedDiscs: 4, participatingUsers: 3, averageRating: null },
      ratingDistribution: [{ label: "0–5", min: 0, max: 5, minInclusive: true, maxInclusive: false, count: 2 }],
      currentStreaks: [{ user: { id: "u1", username: "Riffer" }, days: 4 }],
      topGenres: [{ id: "g1", name: "Rock", ratedDiscs: 3 }],
    };
    const controller = new AbortController();
    get.mockResolvedValue({ data: payload });

    await expect(getCommunityDashboardStats(2026, controller.signal)).resolves.toBe(payload);
    expect(get).toHaveBeenCalledWith("/community/dashboard/stats", {
      params: { year: 2026 },
      signal: controller.signal,
    });
  });
});
