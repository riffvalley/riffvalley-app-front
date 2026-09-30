import { beforeEach, describe, expect, it, vi } from "vitest";
import { artistImagesApi } from "../../src/integrations/spotify/infrastructure/artistImagesApi";
import { searchArtistImages } from "../../src/integrations/spotify";

const { get, token } = vi.hoisted(() => ({ get: vi.fn(), token: vi.fn() }));
vi.mock("axios", () => ({ default: { get } }));
vi.mock("@helpers/SpotifyFunctions.ts", () => ({ obtenerTokenSpotify: token }));

describe("Spotify artist image integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    token.mockResolvedValue("spotify-token");
  });

  it.each([1, 5] as const)("searches at the requested %i result limit and prefers 640 px images", async (limit) => {
    get.mockResolvedValue({ data: { artists: { items: [
      { name: "Banda", images: [{ url: "small.jpg", width: 300 }, { url: "large.jpg", width: 640 }] },
      { name: "Sin foto", images: [] },
      { name: "Otra banda", images: [{ url: "fallback.jpg", width: 300 }] },
    ] } } });

    await expect(searchArtistImages(artistImagesApi, { name: "Banda", limit })).resolves.toEqual([
      { name: "Banda", image: "large.jpg" },
      { name: "Otra banda", image: "fallback.jpg" },
    ]);
    expect(get).toHaveBeenCalledWith("https://api.spotify.com/v1/search", {
      headers: { Authorization: "Bearer spotify-token" },
      params: { q: "Banda", type: "artist", limit },
    });
  });

  it("returns no options when the search has no image and reports token/provider failures", async () => {
    get.mockResolvedValue({ data: { artists: { items: [{ name: "Sin foto", images: [] }] } } });
    await expect(artistImagesApi.searchArtistImages({ name: "Sin foto", limit: 5 })).resolves.toEqual([]);

    token.mockResolvedValueOnce(null);
    await expect(artistImagesApi.searchArtistImages({ name: "Banda", limit: 1 })).rejects.toThrow("Spotify token unavailable");
    expect(get).toHaveBeenCalledTimes(1);

    get.mockRejectedValue(new Error("provider down"));
    await expect(artistImagesApi.searchArtistImages({ name: "Banda", limit: 1 })).rejects.toThrow("provider down");
  });

  it("uses one Spotify token for every lookup in a search session", async () => {
    get.mockResolvedValue({ data: { artists: { items: [{ name: "Banda", images: [{ url: "band.jpg" }] }] } } });
    const search = await artistImagesApi.createSearchSession();

    await search({ name: "Banda", limit: 1 });
    await search({ name: "Otra banda", limit: 1 });

    expect(token).toHaveBeenCalledOnce();
    expect(get).toHaveBeenCalledTimes(2);
    expect(get).toHaveBeenNthCalledWith(2, "https://api.spotify.com/v1/search", {
      headers: { Authorization: "Bearer spotify-token" },
      params: { q: "Otra banda", type: "artist", limit: 1 },
    });
  });
});
