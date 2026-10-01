import { beforeEach, describe, expect, it, vi } from "vitest";
import { artistManagementApi } from "../../src/modules/catalog/artists/infrastructure/artistManagementApi";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/shared/infrastructure/http/client", () => ({ default: { get } }));

describe("Catalog artist matching", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps the by-name endpoint and returns the image and associated discs consumed by the modal", async () => {
    const match = {
      id: "artist-1",
      name: "Matching Artist",
      image: "artist.jpg",
      discs: [{
        id: "disc-1", name: "Album", releaseDate: "2026-09-30", ep: false, debut: false,
        image: null, link: null, genre: null,
      }],
    };
    get.mockResolvedValue({ data: [match] });

    await expect(artistManagementApi.searchArtistsByName("Matching Artist")).resolves.toEqual([match]);
    expect(get).toHaveBeenCalledWith("/artists/search/by-name", {
      params: { name: "Matching Artist" },
    });
  });
});
