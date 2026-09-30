import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadLegacyDiscCard } from "../../src/app/bridges/artistManagementCommunity";

const { getDiscRates } = vi.hoisted(() => ({ getDiscRates: vi.fn() }));
vi.mock("@services/rates/rates", () => ({ getDiscRates }));

const disc = {
  id: "disc-1", name: "Album", releaseDate: "2026-09-30", ep: false, debut: false,
  image: null, link: null, genre: null, rateCount: 1, averageRate: 7,
};

describe("Artist management Community legacy bridge", () => {
  beforeEach(() => vi.clearAllMocks());

  it("opens the existing disc card with the signed-in user's rating", async () => {
    getDiscRates.mockResolvedValue([{ id: "rate-1", rate: "8", cover: "9", user: { id: "user-1" } }]);
    await expect(loadLegacyDiscCard(disc, "Artist", "user-1")).resolves.toEqual({
      ...disc, artistName: "Artist", userDiscRate: "rate-1", rate: 8, cover: 9,
    });
    expect(getDiscRates).toHaveBeenCalledWith("disc-1");
  });

  it("retains the existing unrated fallback when rating lookup fails", async () => {
    getDiscRates.mockRejectedValue(new Error("rates down"));
    await expect(loadLegacyDiscCard(disc, "Artist", "user-1")).resolves.toEqual({
      ...disc, artistName: "Artist", userDiscRate: null, rate: null, cover: null,
    });
  });
});
