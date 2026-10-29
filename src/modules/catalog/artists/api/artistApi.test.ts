import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import api from "@services/api/api.ts";
import {
  fillArtistImages,
  previewArtistImageFill,
} from "./artistImageFill";
import { getArtistDetails } from "./artistDetails";
import { deleteArtist, deleteOrphanArtists, getArtistsManagement } from "./artistManagement";
import { postArtist, updateArtist } from "./artistMutations";
import * as publicArtists from "../index";

vi.mock("@services/api/api.ts", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

afterEach(() => vi.restoreAllMocks());

describe("public artist entry point", () => {
  it("exposes the Catalog modal and the external artist mutations", () => {
    expect(publicArtists.ArtistDetailsModal).toBeDefined();
    expect(publicArtists.postArtist).toBe(postArtist);
    expect(publicArtists.updateArtist).toBe(updateArtist);
  });
});

describe("getArtistsManagement", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.get).mockResolvedValue({ data: {} } as never);
  });

  it("sends the supported management filters without countryId", async () => {
    const params = {
      limit: 30,
      offset: 0,
      needsReview: true,
      query: "metal",
      genreId: "genre-id",
      countryId: "country-id",
    };

    await getArtistsManagement(
      params as Parameters<typeof getArtistsManagement>[0],
    );

    expect(api.get).toHaveBeenCalledWith("/artists/management", {
      params: {
        limit: 30,
        offset: 0,
        needsReview: true,
        query: "metal",
        genreId: "genre-id",
      },
    });
  });
});

describe("artist administration API", () => {
  beforeEach(() => {
    vi.mocked(api.delete).mockReset();
  });

  it("deletes an artist by its existing endpoint", async () => {
    await deleteArtist("artist-id");
    expect(api.delete).toHaveBeenCalledWith("/artists/artist-id");
  });

  it("returns the orphan deletion response unchanged", async () => {
    const response = { deleted: 2, artists: ["one", "two"] };
    vi.mocked(api.delete).mockResolvedValueOnce({ data: response } as never);
    await expect(deleteOrphanArtists()).resolves.toEqual(response);
    expect(api.delete).toHaveBeenCalledWith("/artists/orphans/all");
  });
});

describe("artist mutations used by DiscComponent", () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset();
    vi.mocked(api.patch).mockReset();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  it("posts the artist creation payload and returns the response", async () => {
    const artist = { id: "artist-id", name: "New Artist" };
    vi.mocked(api.post).mockResolvedValueOnce({ data: artist } as never);
    await expect(postArtist({ name: "New Artist" })).resolves.toEqual(artist);
    expect(api.post).toHaveBeenCalledWith("/artists", { name: "New Artist" });
  });

  it("patches the artist with the supplied fields", async () => {
    await updateArtist("artist-id", { countryId: "country-id" });
    expect(api.patch).toHaveBeenCalledWith("/artists/artist-id", { countryId: "country-id" });
  });
});

describe("getArtistDetails", () => {
  it("loads complete artist details using only the Catalog ID and forwards cancellation", async () => {
    const signal = new AbortController().signal;
    vi.mocked(api.get).mockResolvedValueOnce({ data: { id: "artist-id", discs: [] } } as never);
    await getArtistDetails("artist-id", signal);
    expect(api.get).toHaveBeenCalledWith("/artists/artist-id/details", { signal });
  });
});

describe("artist image fill API", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
  });

  it("loads the protected preview and forwards cancellation", async () => {
    const signal = new AbortController().signal;
    const data = { eligible: 11, batchSize: 10, estimatedBatches: 2, startCursor: "cursor-0" };
    vi.mocked(api.get).mockResolvedValueOnce({ data } as never);
    await expect(previewArtistImageFill(signal)).resolves.toEqual(data);
    expect(api.get).toHaveBeenCalledWith("/artists/images/fill/preview", { signal });
  });

  it("posts the exact backend batch limit and continuation cursor", async () => {
    const signal = new AbortController().signal;
    const data = { processed: 10, updated: 2, notFound: 3, ambiguous: 1, failed: 2, concurrentUpdates: 2, results: [], nextCursor: "cursor-1", hasMore: true };
    vi.mocked(api.post).mockResolvedValueOnce({ data } as never);
    await expect(fillArtistImages({ cursor: "cursor-0", batchSize: 10 }, signal)).resolves.toEqual(data);
    expect(api.post).toHaveBeenCalledWith("/artists/images/fill", { cursor: "cursor-0", batchSize: 10 }, { signal });
  });
});
