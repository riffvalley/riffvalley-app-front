import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadLegacyDiscCard } from "../../../src/app/bridges/artistManagementCommunity";

const { loadCommunityVotes } = vi.hoisted(() => ({ loadCommunityVotes: vi.fn() }));
vi.mock("@/app/dependencies/community", () => ({ loadCommunityVotes }));

const disc = {
  id: "disc-1", name: "Album", releaseDate: "2026-09-30", ep: false, debut: false,
  image: null, link: null, genre: null,
  communityRating: { rateCount: 1, averageRate: 7 },
};

describe("Artist management Community legacy bridge", () => {
  beforeEach(() => vi.clearAllMocks());

  it("opens the existing disc card with the signed-in user's rating", async () => {
    loadCommunityVotes.mockResolvedValue([
      { id: "rate-other", rate: 5, cover: 6, user: { id: "other" } },
      { id: "rate-1", rate: 8, cover: 9, user: { id: "user-1" } },
    ]);
    await expect(loadLegacyDiscCard(disc, "Artist", "user-1")).resolves.toEqual({
      ...disc, averageRate: 7, rateCount: 1, artistName: "Artist", userDiscRate: "rate-1", rate: 8, cover: 9,
    });
    expect(loadCommunityVotes).toHaveBeenCalledWith("user-1", "disc-1");
  });

  it("retains the existing unrated fallback when rating lookup fails", async () => {
    loadCommunityVotes.mockRejectedValue(new Error("rates down"));
    await expect(loadLegacyDiscCard(disc, "Artist", "user-1")).resolves.toEqual({
      ...disc, averageRate: 7, rateCount: 1, artistName: "Artist", userDiscRate: null, rate: null, cover: null,
    });
  });
});
