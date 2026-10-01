import { describe, expect, it } from "vitest";
import { addCommunityRatingSummary } from "../../src/app/dependencies/communityArtistManagement";

describe("Community projection for Catalog artist management", () => {
  it("moves rating statistics into app composition and leaves the Catalog disc clean", () => {
    const item = addCommunityRatingSummary({
      id: "artist-1",
      name: "Artist",
      discs: [{
        id: "disc-1", name: "Album", releaseDate: "2026-01-01", ep: false, debut: false,
        image: null, link: null, genre: null, rateCount: "3", averageRate: "7.5",
      } as unknown as { id: string; name: string; releaseDate: string; ep: boolean; debut: boolean; image: null; link: null; genre: null }],
    });

    expect(item.discs[0]).toMatchObject({
      id: "disc-1", communityRating: { rateCount: 3, averageRate: 7.5 },
    });
    expect(item.discs[0]).not.toHaveProperty("rateCount");
    expect(item.discs[0]).not.toHaveProperty("averageRate");
  });
});
