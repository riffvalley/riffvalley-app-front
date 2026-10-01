import { beforeEach, describe, expect, it, vi } from "vitest";
import { mostPopularTrackApi } from "../../../../src/integrations/spotify/infrastructure/mostPopularTrackApi";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/shared/infrastructure/http/client", () => ({ default: { get } }));

describe("most popular track API adapter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the track ID from the Riff Valley API", async () => {
    get.mockResolvedValueOnce({ data: { trackId: "track-123" } });

    await expect(mostPopularTrackApi.findMostPopularTrackId({ spotifyAlbumId: "album-123" }))
      .resolves.toBe("track-123");
    expect(get).toHaveBeenCalledWith("/spotify/albums/album-123/most-popular-track");
  });

  it("returns null when the backend has no popular track", async () => {
    get.mockResolvedValueOnce({ data: { trackId: null } });

    await expect(mostPopularTrackApi.findMostPopularTrackId({ spotifyAlbumId: "album-123" }))
      .resolves.toBeNull();
  });

  it("returns null when the backend request fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    get.mockRejectedValueOnce(new Error("backend unavailable"));

    await expect(mostPopularTrackApi.findMostPopularTrackId({ spotifyAlbumId: "album-123" }))
      .resolves.toBeNull();
    log.mockRestore();
  });
});
