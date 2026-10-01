import { beforeEach, describe, expect, it, vi } from "vitest";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/shared/infrastructure/http/client", () => ({ default: { get } }));

import { artistLinkApi } from "@/integrations/spotify/infrastructure/artistLinkApi";

describe("artistLinkApi", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps listenUrl from the Riff Valley artist profile", async () => {
    get.mockResolvedValueOnce({ data: {
      spotifyId: "artist-1",
      name: "Nirvana",
      listenUrl: "https://open.spotify.com/artist/artist-1",
    } });

    await expect(artistLinkApi.findArtistLink("Nirvana"))
      .resolves.toBe("https://open.spotify.com/artist/artist-1");
    expect(get).toHaveBeenCalledWith("/spotify/artists/search", {
      params: { artistName: "Nirvana" },
    });
  });

  it("returns undefined when the backend has no matching artist", async () => {
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    get.mockResolvedValueOnce({ data: null });

    await expect(artistLinkApi.findArtistLink("Desconocido")).resolves.toBeUndefined();

    log.mockRestore();
  });

  it("returns undefined when the backend search fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    get.mockRejectedValueOnce(new Error("backend unavailable"));

    await expect(artistLinkApi.findArtistLink("Nirvana")).resolves.toBeUndefined();

    log.mockRestore();
  });
});
