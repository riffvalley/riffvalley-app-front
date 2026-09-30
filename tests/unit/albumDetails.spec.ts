import { describe, expect, it, vi } from "vitest";
import { loadAlbumDetails, type Album, type AlbumDetailsPort } from "../../src/integrations/spotify/application/albumDetails";

const query = { albumName: "Disco", artistName: "Artista" };
const album: Album = {
  name: "Disco", artistNames: ["Artista"], coverUrl: null,
  releaseDate: "2026", totalTracks: 99, listenUrl: null,
  tracks: [{ id: "track", name: "Canción", number: 7, durationMs: 61999, previewUrl: null }],
};

describe("album details application", () => {
  it("uses returned tracks for duration, preserving provider count, order and partial dates", async () => {
    const findAlbum = vi.fn<AlbumDetailsPort["findAlbum"]>().mockResolvedValue({ status: "found", album });
    const result = await loadAlbumDetails({ findAlbum }, query);
    expect(findAlbum).toHaveBeenCalledWith(query);
    expect(result).toEqual({ status: "found", album: {
      name: "Disco", artistLabel: "Artista", coverUrl: null, releaseDate: "2026",
      totalTracks: 99, listenUrl: null, totalDurationLabel: "1m 1s",
      tracks: [{ ...album.tracks[0], durationLabel: "1:01" }],
    } });
    expect(album.tracks[0]).not.toHaveProperty("durationLabel");
    expect(album).toHaveProperty("artistNames");
  });

  it("accepts albums with no tracks", async () => {
    const result = await loadAlbumDetails({ findAlbum: async () => ({
      status: "found", album: { ...album, artistNames: [], tracks: [] },
    }) }, query);
    expect(result).toMatchObject({ status: "found", album: {
      artistLabel: "", totalDurationLabel: "0m 0s", tracks: [],
    } });
  });

  it.each(["not-found", "token-unavailable", "failed"] as const)("preserves %s without synthesizing an album", async (status) => {
    expect(await loadAlbumDetails({ findAlbum: async () => ({ status }) }, query)).toEqual({ status });
  });
});
