import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, getToken } = vi.hoisted(() => ({ get: vi.fn(), getToken: vi.fn() }));

vi.mock("axios", () => ({ default: { get } }));
vi.mock("@helpers/SpotifyFunctions.ts", () => ({ obtenerTokenSpotify: getToken }));

import { artistLinkApi } from "@/integrations/spotify/infrastructure/artistLinkApi";

describe("artistLinkApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getToken.mockResolvedValue("spotify-token");
  });

  it("devuelve el enlace del primer resultado de Spotify", async () => {
    get.mockResolvedValue({
      data: { artists: { items: [
        { external_urls: { spotify: "https://open.spotify.com/artist/first" } },
        { external_urls: { spotify: "https://open.spotify.com/artist/second" } },
      ] } },
    });

    await expect(artistLinkApi.findArtistLink("Nirvana")).resolves.toBe("https://open.spotify.com/artist/first");
    expect(get).toHaveBeenCalledWith("https://api.spotify.com/v1/search", expect.objectContaining({
      params: { q: "Nirvana", type: "artist", limit: 1 },
    }));
  });

  it("devuelve undefined si Spotify no encuentra artistas", async () => {
    get.mockResolvedValue({ data: { artists: { items: [] } } });
    await expect(artistLinkApi.findArtistLink("Desconocido")).resolves.toBeUndefined();
  });

  it("devuelve undefined si falla la búsqueda", async () => {
    get.mockRejectedValue(new Error("Spotify no disponible"));
    await expect(artistLinkApi.findArtistLink("Nirvana")).resolves.toBeUndefined();
  });
});
