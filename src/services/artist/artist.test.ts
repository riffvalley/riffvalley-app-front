import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@services/api/api.ts";
import { getArtistsManagement } from "./artist";

vi.mock("@services/api/api.ts", () => ({
  default: {
    get: vi.fn(),
  },
}));

describe("getArtistsManagement", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.get).mockResolvedValue({ data: {} } as never);
  });

  it("sends the supported management filters without countryId", async () => {
    const params = {
      limit: 30,
      offset: 0,
      needsReview: true,
      query: "metal",
      genreId: "genre-id",
      countryId: "country-id",
    };

    await getArtistsManagement(
      params as Parameters<typeof getArtistsManagement>[0],
    );

    expect(api.get).toHaveBeenCalledWith("/artists/management", {
      params: {
        limit: 30,
        offset: 0,
        needsReview: true,
        query: "metal",
        genreId: "genre-id",
      },
    });
  });
});
