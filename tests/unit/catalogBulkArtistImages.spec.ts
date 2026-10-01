import { afterEach, describe, expect, it, vi } from "vitest";
import type { ArtistManagementItem, ArtistManagementResponse } from "../../src/modules/catalog/artists/domain/artistManagement";
import { fillMissingArtistImages } from "../../src/modules/catalog/artists/images/application/fillMissingArtistImages";
import type { ArtistManagementPort, ArtistUpdatePort } from "../../src/modules/catalog/artists/application/artistManagementPort";
import type { ArtistImageSearchSessionPort } from "../../src/modules/catalog/artists/images/application/fillMissingArtistImages";

function artist(id: string, image: string | null = null): ArtistManagementItem {
  return {
    id, name: `Artist ${id}`, description: null, image, country: null,
    discs: [], nationalReleases: [], spotifyPlaylists: [],
  };
}

function page(data: ArtistManagementItem[], totalItems: number): ArtistManagementResponse {
  return { totalItems, totalPages: Math.ceil(totalItems / 200), currentPage: 1, limit: 200, orphanCount: 0, data };
}

function ports(getArtistsManagement: ArtistManagementPort["getArtistsManagement"], search: (name: string) => Promise<string | null>) {
  const updateArtist = vi.fn<ArtistUpdatePort["updateArtist"]>().mockResolvedValue(undefined);
  const imageSearch: ArtistImageSearchSessionPort = {
    createSearchSession: vi.fn().mockResolvedValue(search),
  };
  return {
    artists: { getArtistsManagement, updateArtist },
    updateArtist,
    imageSearch,
  };
}

afterEach(() => vi.useRealTimers());

describe("Catalog bulk artist image filling", () => {
  it("returns an empty result without opening a Spotify session", async () => {
    const getArtistsManagement = vi.fn().mockResolvedValue(page([], 0));
    const search = vi.fn();
    const { artists, imageSearch, updateArtist } = ports(getArtistsManagement, search);
    const onProgress = vi.fn();

    await expect(fillMissingArtistImages(artists, imageSearch, { onProgress })).resolves.toEqual({
      processed: 0, total: 0, updated: 0,
    });

    expect(getArtistsManagement).toHaveBeenCalledWith({ limit: 200, offset: 0 });
    expect(imageSearch.createSearchSession).not.toHaveBeenCalled();
    expect(updateArtist).not.toHaveBeenCalled();
    expect(onProgress).toHaveBeenLastCalledWith({ processed: 0, total: 0 });
  });

  it("collects multiple pages of 200 and reports each sequential result with the legacy pause", async () => {
    vi.useFakeTimers();
    const timeout = vi.spyOn(globalThis, "setTimeout");
    const firstPage = Array.from({ length: 200 }, (_, index) => artist(`p1-${index}`, "already.jpg"));
    firstPage[0] = artist("one");
    const secondPage = [artist("two"), artist("already", "has-image.jpg")];
    const getArtistsManagement = vi.fn()
      .mockResolvedValueOnce(page(firstPage, 202))
      .mockResolvedValueOnce(page(secondPage, 202));
    const searchOrder: string[] = [];
    const search = vi.fn(async (name: string) => {
      searchOrder.push(name);
      return `${name}.jpg`;
    });
    const { artists, imageSearch, updateArtist } = ports(getArtistsManagement, search);
    const progress = vi.fn();
    const updatedRows = vi.fn();

    const resultPromise = fillMissingArtistImages(artists, imageSearch, {
      onProgress: progress,
      onArtistUpdated: updatedRows,
    });
    await vi.advanceTimersByTimeAsync(300);
    const result = await resultPromise;

    expect(getArtistsManagement).toHaveBeenNthCalledWith(1, { limit: 200, offset: 0 });
    expect(getArtistsManagement).toHaveBeenNthCalledWith(2, { limit: 200, offset: 200 });
    expect(imageSearch.createSearchSession).toHaveBeenCalledOnce();
    expect(searchOrder).toEqual(["Artist one", "Artist two"]);
    expect(updateArtist.mock.invocationCallOrder[0]).toBeLessThan(search.mock.invocationCallOrder[1]);
    expect(updateArtist).toHaveBeenNthCalledWith(1, "one", { image: "Artist one.jpg" });
    expect(progress.mock.calls.map(([value]) => value)).toEqual([
      { processed: 0, total: 2 },
      { processed: 1, total: 2 },
      { processed: 2, total: 2 },
    ]);
    expect(updatedRows).toHaveBeenNthCalledWith(1, "one", "Artist one.jpg");
    expect(timeout.mock.calls.map(([, delay]) => delay)).toEqual([150, 150]);
    expect(result).toEqual({ processed: 2, total: 2, updated: 2 });
  });

  it("continues after individual lookup and update failures while advancing visible progress", async () => {
    vi.useFakeTimers();
    const getArtistsManagement = vi.fn().mockResolvedValue(page([artist("one"), artist("two"), artist("three")], 3));
    const search = vi.fn(async (name: string) => {
      if (name === "Artist one") throw new Error("Spotify failed");
      return `${name}.jpg`;
    });
    const { artists, imageSearch, updateArtist } = ports(getArtistsManagement, search);
    updateArtist.mockRejectedValueOnce(new Error("PATCH failed"));
    const progress = vi.fn();

    const resultPromise = fillMissingArtistImages(artists, imageSearch, { onProgress: progress });
    await vi.advanceTimersByTimeAsync(450);

    await expect(resultPromise).resolves.toEqual({ processed: 3, total: 3, updated: 1 });
    expect(search).toHaveBeenCalledTimes(3);
    expect(updateArtist).toHaveBeenCalledTimes(2);
    expect(progress).toHaveBeenLastCalledWith({ processed: 3, total: 3 });
  });

  it("propagates page-listing and session-creation failures as general errors", async () => {
    const listingError = new Error("Catalog unavailable");
    const failedListing = ports(vi.fn().mockRejectedValue(listingError), vi.fn());
    await expect(fillMissingArtistImages(failedListing.artists, failedListing.imageSearch)).rejects.toBe(listingError);

    const sessionError = new Error("Spotify token unavailable");
    const failedSession = ports(vi.fn().mockResolvedValue(page([artist("one")], 1)), vi.fn());
    vi.mocked(failedSession.imageSearch.createSearchSession).mockRejectedValue(sessionError);
    await expect(fillMissingArtistImages(failedSession.artists, failedSession.imageSearch)).rejects.toBe(sessionError);
  });
});
