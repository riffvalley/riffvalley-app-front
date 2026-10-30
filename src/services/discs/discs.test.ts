import { beforeEach, describe, expect, it, vi } from "vitest";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@services/api/api.ts", () => ({ default: { get } }));

import {
  getDailyCoverFeatured,
  getDiscById,
  getDiscOptions,
  getDiscs,
  getRandomDiscs,
  getTopRatedOrFeaturedAndStats,
} from "./discs";

describe("Catalog disc request wrappers", () => {
  beforeEach(() => {
    get.mockReset().mockResolvedValue({ data: [] });
  });

  it("keeps the legacy random request shape when no optional parameters are used", async () => {
    await getRandomDiscs({ limit: 1 });

    expect(get).toHaveBeenCalledWith("/discs/random", { params: { limit: 1 } });
  });

  it("loads a catalog disc by id and forwards cancellation", async () => {
    const signal = new AbortController().signal;
    const disc = { id: "disc/1", name: "Disco", artist: { id: "artist-1", name: "Artista" } };
    get.mockResolvedValueOnce({ data: disc });

    await expect(getDiscById("disc/1", signal)).resolves.toEqual(disc);
    expect(get).toHaveBeenCalledWith("/discs/disc%2F1", { signal });
  });

  it.each(["easy", "normal", "hard"] as const)(
    "passes the %s difficulty and optional previous disc to the existing Catalog endpoint",
    async (difficulty) => {
      const signal = new AbortController().signal;
      await getRandomDiscs({ difficulty, limit: 1, previousDiscId: "previous-disc" }, { signal });

      expect(get).toHaveBeenCalledWith("/discs/random", {
        params: { difficulty, limit: 1, previousDiscId: "previous-disc" },
        signal,
      });
    }
  );

  it("requests community-unrated discs as an array and forwards cancellation", async () => {
    const signal = new AbortController().signal;
    const discs = [{ id: "disc-1" }, { id: "disc-2" }];
    get.mockResolvedValueOnce({ data: discs });

    await expect(
      getRandomDiscs({ unratedByCommunity: true, limit: 2 }, { signal })
    ).resolves.toEqual(discs);
    expect(get).toHaveBeenCalledWith("/discs/random", {
      params: { unratedByCommunity: true, limit: 2 },
      signal,
    });
  });

  it("preserves options requests and forwards an optional cancellation signal", async () => {
    const signal = new AbortController().signal;
    get.mockResolvedValueOnce({ data: [{ id: "genre-1", name: "Rock", color: "#123456" }] });

    await expect(getDiscOptions("genre", { country: "country-1" }, 3, { signal })).resolves.toEqual([
      { id: "genre-1", name: "Rock", color: "#123456" },
    ]);
    expect(get).toHaveBeenCalledWith("/discs/options", {
      params: { field: "genre", country: "country-1", limit: 3 },
      signal,
    });
  });

  it("passes the original voted=false filter and optional signal to the disc list", async () => {
    const signal = new AbortController().signal;
    await getDiscs(
      1,
      3,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      false,
      undefined,
      signal
    );

    expect(get).toHaveBeenCalledWith("/discs", {
      params: {
        limit: 1,
        offset: 3,
        query: undefined,
        dateRange: undefined,
        genre: undefined,
        country: undefined,
        orderBy: undefined,
        voted: false,
        votedType: undefined,
      },
      signal,
    });
  });

  it("uses the featured daily cover endpoint with the shared Catalog client and cancellation signal", async () => {
    const signal = new AbortController().signal;
    const response = {
      id: "8d286d5a-4436-4faf-a59a-eef95a94929a",
      name: "Álbum destacado",
      description: "Descripción del disco",
      image: "https://images.test/featured-cover.jpg",
      releaseDate: "2024-01-01",
      artist: { id: "43ac81d0-ad4a-4d1f-a0aa-fb9f81b55aad", name: "Artista", description: "", image: "" },
      verified: true,
      EP: false,
      averageCover: 8.2,
      coverVoteCount: 6,
      voteCount: 42,
      userRate: { id: "10718274-8f20-40f1-a2b2-0ac43b3f7b11", rate: "7.5", cover: null },
    };
    get.mockResolvedValueOnce({ data: response });

    await expect(getDailyCoverFeatured({ signal })).resolves.toEqual(response);
    expect(get).toHaveBeenCalledWith("/discs/daily-cover-featured", { signal });
  });

  it("returns null from the daily cover endpoint when there are no candidates", async () => {
    get.mockResolvedValueOnce({ data: null });

    await expect(getDailyCoverFeatured()).resolves.toBeNull();
    expect(get).toHaveBeenCalledWith("/discs/daily-cover-featured", {});
  });

  it("requests home rankings with the existing dateRange contract and optional cancellation", async () => {
    const signal = new AbortController().signal;
    const dateRange: [string, string] = ["2026-05-15", "2026-05-21"];
    const response = {
      discs: [{ id: "ranked-disc", voteCount: 1 }],
      totalDiscs: 1,
      totalVotes: 1,
      topUsersByRates: [],
      topUsersByCover: [],
      ratingDistribution: [],
    };
    get.mockResolvedValueOnce({ data: response });

    await expect(getTopRatedOrFeaturedAndStats(dateRange, undefined, undefined, undefined, undefined, signal))
      .resolves.toEqual(response);
    expect(get).toHaveBeenCalledWith("/discs/homeDiscs", {
      params: { dateRange },
      signal,
    });
  });

  it("keeps the existing home ranking call shape when no signal is supplied", async () => {
    const dateRange: [string, string] = ["2026-05-01", "2026-05-31"];

    await getTopRatedOrFeaturedAndStats(dateRange);

    expect(get).toHaveBeenCalledWith("/discs/homeDiscs", { params: { dateRange } });
  });
});
