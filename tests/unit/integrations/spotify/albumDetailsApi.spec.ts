import { beforeEach, describe, expect, it, vi } from "vitest";
import { albumDetailsApi } from "../../../../src/integrations/spotify/infrastructure/albumDetailsApi";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/shared/infrastructure/http/client", () => ({ default: { get } }));

describe("album details API adapter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resolves the album through the backend and maps its details and tracks", async () => {
    get.mockResolvedValueOnce({ data: { spotifyId: "album/1" } }).mockResolvedValueOnce({ data: {
      name: "Disco", artistNames: ["Artista", "Colaborador"], coverUrl: "https://images.test/cover.jpg",
      releaseDate: "2026-09-30", totalTracks: 1, listenUrl: "https://open.spotify.com/album/album/1",
      tracks: [{ id: "track-1", name: "Canción", number: 8, durationMs: 61999, previewUrl: "https://preview.test/track.mp3" }],
    } });

    await expect(albumDetailsApi.findAlbum({ albumName: "Disco", artistName: "Artista" })).resolves.toEqual({
      status: "found",
      album: {
        name: "Disco", artistNames: ["Artista", "Colaborador"], coverUrl: "https://images.test/cover.jpg",
        releaseDate: "2026-09-30", totalTracks: 1, listenUrl: "https://open.spotify.com/album/album/1",
        tracks: [{ id: "track-1", name: "Canción", number: 8, durationMs: 61999, previewUrl: "https://preview.test/track.mp3" }],
      },
    });
    expect(get.mock.calls).toEqual([
      ["/discs/spotify/album", { params: { albumName: "Disco", artistName: "Artista" } }],
      ["/discs/spotify/album/album%2F1"],
    ]);
  });

  it("maps a backend 404 during album resolution to not-found", async () => {
    get.mockRejectedValueOnce({ response: { status: 404 } });

    await expect(albumDetailsApi.findAlbum({ albumName: "Ausente", artistName: "Artista" }))
      .resolves.toEqual({ status: "not-found" });
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("maps backend errors to failed", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    get.mockRejectedValueOnce({ response: { status: 502 } });

    await expect(albumDetailsApi.findAlbum({ albumName: "Disco", artistName: "Artista" }))
      .resolves.toEqual({ status: "failed" });
    log.mockRestore();
  });

  it("maps missing optional values to the existing nullable application fields", async () => {
    get.mockResolvedValueOnce({ data: { spotifyId: "album-1" } }).mockResolvedValueOnce({ data: {
      name: "Disco", artistNames: ["Artista"], totalTracks: 1,
      tracks: [{ id: "track-1", name: "Canción", number: 1, durationMs: 0 }],
    } });

    await expect(albumDetailsApi.findAlbum({ albumName: "Disco", artistName: "Artista" })).resolves.toEqual({
      status: "found",
      album: {
        name: "Disco", artistNames: ["Artista"], coverUrl: null, releaseDate: "", totalTracks: 1,
        listenUrl: null,
        tracks: [{ id: "track-1", name: "Canción", number: 1, durationMs: 0, previewUrl: null }],
      },
    });
  });
});
