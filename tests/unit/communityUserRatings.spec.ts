import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchUserRatings } from "../../src/app/dependencies/community";

const { getRatesByUser } = vi.hoisted(() => ({ getRatesByUser: vi.fn() }));
vi.mock("@services/rates/rates", () => ({ getRatesByUser }));

describe("Community user ratings query", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRatesByUser.mockResolvedValue({ totalItems: 1, data: [] });
  });

  it("keeps search, date range, genre, country, ordering and page parameters", async () => {
    const params = {
      limit: 20,
      offset: 40,
      query: "album",
      dateRange: ["2026-01-01T00:00:00.000Z", "2026-01-31T23:59:59.999Z"] as [string, string],
      genre: "rock",
      country: "es",
      type: "cover" as const,
      orderBy: "rate.cover:DESC,artist.name:ASC",
    };

    await expect(fetchUserRatings(params)).resolves.toEqual({ totalItems: 1, data: [] });
    expect(getRatesByUser).toHaveBeenCalledWith(
      20, 40, "album", params.dateRange, "rock", "es", "cover", "rate.cover:DESC,artist.name:ASC",
    );
  });

  it("supports the unfiltered monthly vote query used by Editorial", async () => {
    await fetchUserRatings({ limit: 500, offset: 0, dateRange: ["from", "to"], type: "rate", orderBy: "rate.rate:DESC,artist.name:ASC" });
    expect(getRatesByUser).toHaveBeenCalledWith(
      500, 0, undefined, ["from", "to"], undefined, undefined, "rate", "rate.rate:DESC,artist.name:ASC",
    );
  });
});
