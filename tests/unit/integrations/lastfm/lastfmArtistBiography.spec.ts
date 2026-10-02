import { beforeEach, describe, expect, it, vi } from "vitest";
import { artistBiographyApi } from "../../../../src/integrations/lastfm/infrastructure/artistBiographyApi";
import { loadArtistBiography } from "../../../../src/integrations/lastfm";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("axios", () => ({ default: { get } }));

describe("Last.fm artist biography integration", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads biography and tags through the existing artist.getinfo endpoint", async () => {
    const artist = { bio: { summary: "Bio HTML" }, tags: { tag: [{ name: "rock" }] } };
    get.mockResolvedValue({ data: { artist } });

    await expect(loadArtistBiography(artistBiographyApi, "Banda")).resolves.toEqual(artist);
    expect(get).toHaveBeenCalledWith("https://ws.audioscrobbler.com/2.0/", {
      params: {
        method: "artist.getinfo",
        artist: "Banda",
        api_key: "288147ee12920ea60b59f72f491ebada",
        format: "json",
      },
    });
  });

  it("preserves optional biography fields and contains provider errors", async () => {
    get.mockResolvedValueOnce({ data: { artist: { tags: { tag: [{ name: "rock" }] } } } });
    await expect(artistBiographyApi.fetchArtistBiography("Banda"))
      .resolves.toEqual({ tags: { tag: [{ name: "rock" }] } });
    get.mockResolvedValueOnce({ data: {} });
    await expect(artistBiographyApi.fetchArtistBiography("Banda")).resolves.toBeNull();

    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    get.mockRejectedValue(new Error("provider down"));
    await expect(artistBiographyApi.fetchArtistBiography("Banda")).resolves.toBeNull();
    expect(log).toHaveBeenCalledWith("Error al obtener datos de Last.fm:", expect.any(Error));
    log.mockRestore();
  });
});
