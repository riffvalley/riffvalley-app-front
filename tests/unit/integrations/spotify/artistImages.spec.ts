import { beforeEach, describe, expect, it, vi } from "vitest";
import { artistImagesApi } from "../../../../src/integrations/spotify/infrastructure/artistImagesApi";
import { searchArtistImages } from "../../../../src/integrations/spotify";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/shared/infrastructure/http/client", () => ({ default: { get } }));

describe("artist image API adapter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps several artists and their candidate images, keeping artist names and homonyms distinct", async () => {
    get.mockResolvedValueOnce({ data: [
      { spotifyId: "artist-1", name: "Banda" },
      { spotifyId: "artist-2", name: "Banda" },
      { spotifyId: "artist-3", name: "Otra banda" },
    ] })
      .mockResolvedValueOnce({ data: [{ url: "band-a-1.jpg" }, { url: "band-a-2.jpg" }] })
      .mockResolvedValueOnce({ data: [{ url: "band-b-1.jpg" }, { url: "band-b-2.jpg" }] })
      .mockResolvedValueOnce({ data: [{ url: "other-1.jpg" }] });

    await expect(searchArtistImages(artistImagesApi, { name: "Banda", limit: 5 })).resolves.toEqual([
      { name: "Banda", image: "band-a-1.jpg" },
      { name: "Banda", image: "band-b-1.jpg" },
      { name: "Otra banda", image: "other-1.jpg" },
      { name: "Banda", image: "band-a-2.jpg" },
      { name: "Banda", image: "band-b-2.jpg" },
    ]);
    expect(get.mock.calls).toEqual([
      ["/spotify/artists/search/multiple", { params: { artistName: "Banda" } }],
      ["/spotify/artists/artist-1/images"],
      ["/spotify/artists/artist-2/images"],
      ["/spotify/artists/artist-3/images"],
    ]);
  });

  it("supports a single artist and returns its available images up to the requested limit", async () => {
    get.mockResolvedValueOnce({ data: [{ spotifyId: "artist-1", name: "Banda" }] })
      .mockResolvedValueOnce({ data: { images: ["one.jpg", { imageUrl: "two.jpg" }] } });

    await expect(artistImagesApi.searchArtistImages({ name: "Banda", limit: 5 })).resolves.toEqual([
      { name: "Banda", image: "one.jpg" },
      { name: "Banda", image: "two.jpg" },
    ]);
  });

  it("returns an empty list when the search has no candidates", async () => {
    get.mockResolvedValueOnce({ data: [] });

    await expect(artistImagesApi.searchArtistImages({ name: "Ausente", limit: 5 })).resolves.toEqual([]);
    expect(get).toHaveBeenCalledOnce();
  });

  it("returns an empty list when candidates have no usable image URLs", async () => {
    get.mockResolvedValueOnce({ data: [{ spotifyId: "artist-1", name: "Sin foto" }] })
      .mockResolvedValueOnce({ data: [{}, { url: null }, { imageUrl: "" }] });

    await expect(artistImagesApi.searchArtistImages({ name: "Sin foto", limit: 5 })).resolves.toEqual([]);
  });

  it("skips incomplete artist and image fields without changing the neutral option shape", async () => {
    get.mockResolvedValueOnce({ data: [
      { name: "Sin ID" },
      { spotifyId: "artist-2" },
      { spotifyId: "artist-3", name: "Banda" },
    ] }).mockResolvedValueOnce({ data: [{ imageUrl: "band.jpg" }] });

    await expect(artistImagesApi.searchArtistImages({ name: "Banda", limit: 5 })).resolves.toEqual([
      { name: "Banda", image: "band.jpg" },
    ]);
    expect(get).toHaveBeenCalledTimes(2);
    expect(get).toHaveBeenNthCalledWith(2, "/spotify/artists/artist-3/images");
  });

  it("propagates backend failures", async () => {
    get.mockRejectedValueOnce(new Error("backend unavailable"));

    await expect(artistImagesApi.searchArtistImages({ name: "Banda", limit: 1 }))
      .rejects.toThrow("backend unavailable");
  });

  it("reuses a session without requesting a Spotify token", async () => {
    get.mockResolvedValue({ data: [{ spotifyId: "artist-1", name: "Banda" }] });
    const search = await artistImagesApi.createSearchSession();

    await search({ name: "Banda", limit: 1 });
    await search({ name: "Otra banda", limit: 1 });

    expect(get).toHaveBeenCalledTimes(4);
    expect(get).toHaveBeenNthCalledWith(1, "/spotify/artists/search/multiple", {
      params: { artistName: "Banda" },
    });
    expect(get).toHaveBeenNthCalledWith(3, "/spotify/artists/search/multiple", {
      params: { artistName: "Otra banda" },
    });
  });
});
