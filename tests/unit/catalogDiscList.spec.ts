import { describe, expect, it, vi } from "vitest";
import { listDiscs } from "../../src/modules/catalog/discs/listing/application/listDiscs";
import type { DiscListPort, DiscListResult } from "../../src/modules/catalog/discs/listing/application/discListPort";

describe("Catalog disc listing", () => {
  it("preserves pagination and filter parameters and normalizes user scores", async () => {
    const result: DiscListResult = {
      totalItems: 1,
      totalPages: 1,
      currentPage: 1,
      limit: 20,
      data: [{
        id: "disc-1",
        name: "Album",
        releaseDate: "2026-01-01",
        image: null,
        userRate: { rate: "8.5", cover: "9", id: "rate-1" },
      }],
    };
    const getDiscs = vi.fn<DiscListPort["getDiscs"]>().mockResolvedValue(result);
    const params = {
      limit: 20,
      offset: 40,
      query: "album",
      dateRange: ["2026-01-01T00:00:00.000Z", "2026-12-31T23:59:59.999Z"] as [string, string],
      genre: "rock",
      country: "es",
      orderBy: "disc.releaseDate:DESC,artist.name:ASC",
      voted: false,
      votedType: "rate",
    };

    const listed = await listDiscs({ getDiscs }, params);

    expect(getDiscs).toHaveBeenCalledWith(params);
    expect(listed.totalItems).toBe(1);
    expect(listed.data[0].userRate).toMatchObject({ rate: 8.5, cover: 9 });
    expect(result.data[0].userRate).toMatchObject({ rate: "8.5", cover: "9" });
  });
});
