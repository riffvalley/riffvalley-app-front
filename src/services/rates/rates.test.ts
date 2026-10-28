import { beforeEach, describe, expect, it, vi } from "vitest";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("@services/api/api", () => ({ default: { get } }));

import {
  getRatesDashboardSummary,
  getRatesGeographyTop,
  getRatesGeographyWorld,
  getRatesArtistSummary,
  getRatesArtistLastfm,
  getRatesTopArtists,
  type RatesArtistLastfmResponseDto,
  type RatesDashboardSummaryDto,
  type RatesGeographyTopResponseDto,
  type RatesGeographyWorldResponseDto,
} from "./rates";

const responseBody: RatesDashboardSummaryDto = {
  period: {
    start: "2026-10-25T23:00:00.000Z",
    endExclusive: "2026-11-01T23:00:00.000Z",
    timezone: "Europe/Madrid",
  },
  metrics: {
    activeRates: 2,
    averageMusicalRate: null,
    distinctGenres: 1,
    bestRatedDisc: null,
    dominantGenre: { id: "genre-1", name: "Rock", activeRates: 2 },
    weekOverWeek: {
      currentRates: 2,
      previousRates: 1,
      difference: 1,
      percentageChange: 100,
    },
  },
  recentRates: [],
};

describe("getRatesDashboardSummary", () => {
  beforeEach(() => {
    get.mockReset().mockResolvedValue({ data: responseBody });
  });

  it("consumes the authenticated dashboard summary route and forwards AbortSignal", async () => {
    const controller = new AbortController();
    const result: RatesDashboardSummaryDto = await getRatesDashboardSummary(controller.signal);

    expect(get).toHaveBeenCalledOnce();
    expect(get).toHaveBeenCalledWith("/rates/dashboard-summary", { signal: controller.signal });
    expect(result).toEqual(responseBody);
  });
});


describe("getRatesGeographyTop", () => {
  const geographyResponse: RatesGeographyTopResponseDto = {
    countries: [
      { isoCode: "ES", name: "España", count: 12, percentage: 36.36 },
      { isoCode: "GB", name: "Reino Unido", count: 8, percentage: 24.24 },
    ],
  };

  beforeEach(() => {
    get.mockReset().mockResolvedValue({ data: geographyResponse });
  });

  it("consumes the typed top-geography endpoint and forwards an optional AbortSignal", async () => {
    const controller = new AbortController();
    const result: RatesGeographyTopResponseDto = await getRatesGeographyTop(controller.signal);

    expect(get).toHaveBeenCalledOnce();
    expect(get).toHaveBeenCalledWith("/rates/geography/top", { signal: controller.signal });
    expect(result).toEqual(geographyResponse);
  });

  it("allows the signal to be omitted", async () => {
    await getRatesGeographyTop();
    expect(get).toHaveBeenCalledWith("/rates/geography/top", { signal: undefined });
  });
});


describe("getRatesGeographyWorld", () => {
  const geographyResponse: RatesGeographyWorldResponseDto = {
    totalRatedDiscs: 15,
    mappedDiscs: 12,
    unmappedDiscs: 3,
    countryCount: 2,
    countries: [
      { isoCode: "ES", name: "España", count: 8, percentage: 66.67 },
      { isoCode: "GB", name: "Reino Unido", count: 4, percentage: 33.33 },
    ],
  };

  beforeEach(() => {
    get.mockReset().mockResolvedValue({ data: geographyResponse });
  });

  it("uses the exact typed world response and forwards AbortSignal", async () => {
    const controller = new AbortController();
    const result: RatesGeographyWorldResponseDto = await getRatesGeographyWorld(controller.signal);
    expect(get).toHaveBeenCalledOnce();
    expect(get).toHaveBeenCalledWith("/rates/geography/world", { signal: controller.signal });
    expect(result).toEqual(geographyResponse);
  });

  it("allows the signal to be omitted", async () => {
    await getRatesGeographyWorld();
    expect(get).toHaveBeenCalledWith("/rates/geography/world", { signal: undefined });
  });
});

describe("getRatesTopArtists", () => {
  const artistsResponse = {
    artists: [
      { id: "00000000-0000-4000-8000-000000000023", name: "Artista", image: null, ratingCount: 12, averageRate: 8.45 },
    ],
  };

  beforeEach(() => {
    get.mockReset().mockResolvedValue({ data: artistsResponse });
  });

  it("uses the typed artists ranking endpoint and forwards AbortSignal", async () => {
    const controller = new AbortController();
    const result = await getRatesTopArtists(controller.signal);

    expect(get).toHaveBeenCalledOnce();
    expect(get).toHaveBeenCalledWith("/rates/artists/top", {
      params: { period: "all" },
      signal: controller.signal,
    });
    expect(result).toEqual(artistsResponse);
  });

  it("defaults to the all-time period when options are omitted", async () => {
    await getRatesTopArtists();
    expect(get).toHaveBeenCalledWith("/rates/artists/top", {
      params: { period: "all" },
      signal: undefined,
    });
  });

  it.each(["month", "year", "all"] as const)("forwards the %s period without changing backend order", async (period) => {
    const orderedResponse = { artists: [artistsResponse.artists[0], { ...artistsResponse.artists[0], id: "another-id" }] };
    get.mockResolvedValueOnce({ data: orderedResponse });

    const result = await getRatesTopArtists(undefined, period);

    expect(get).toHaveBeenCalledWith("/rates/artists/top", {
      params: { period },
      signal: undefined,
    });
    expect(result.artists.map(({ id }) => id)).toEqual(orderedResponse.artists.map(({ id }) => id));
  });
});

describe("getRatesArtistLastfm", () => {
  const artistId = "00000000-0000-4000-8000-000000000023";
  const lastfmResponse: RatesArtistLastfmResponseDto = {
    artistId,
    status: "available",
    biography: { summary: "Bio sin HTML", url: "https://www.last.fm/music/Artist/+wiki" },
    tags: [{ name: "Rock", url: "https://www.last.fm/tag/rock" }],
    similarArtists: [{
      name: "Similar",
      url: "https://www.last.fm/music/Similar",
      catalogArtistId: "00000000-0000-4000-8000-000000000024",
      catalogDiscCount: 2,
      catalogDiscs: [
        {
          id: "00000000-0000-4000-8000-000000000025", name: "First", image: null, releaseYear: 2020,
          releaseDate: "2020-01-01", link: null, ep: false, debut: false, genre: null,
          averageRate: null, averageCover: null, voteCount: 0, commentCount: 0,
          userRate: null, favoriteId: null, pendingId: null,
        },
        {
          id: "00000000-0000-4000-8000-000000000026", name: "Second", image: "https://images.example/second.jpg", releaseYear: null,
          releaseDate: null, link: null, ep: false, debut: false, genre: null,
          averageRate: null, averageCover: null, voteCount: 0, commentCount: 0,
          userRate: null, favoriteId: null, pendingId: null,
        },
      ],
    }],
    listeners: 12_400,
    playCount: 85_000,
    lastfmUrl: "https://www.last.fm/music/Artist",
  };

  beforeEach(() => {
    get.mockReset().mockResolvedValue({ data: lastfmResponse });
  });

  it("uses the Rates Last.fm DTO endpoint and forwards AbortSignal", async () => {
    const controller = new AbortController();
    const result = await getRatesArtistLastfm(artistId, controller.signal);

    expect(get).toHaveBeenCalledOnce();
    expect(get).toHaveBeenCalledWith(`/rates/artists/${artistId}/lastfm`, { signal: controller.signal });
    expect(result).toEqual(lastfmResponse);
  });

  it("allows the optional signal to be omitted", async () => {
    await getRatesArtistLastfm(artistId);
    expect(get).toHaveBeenCalledWith(`/rates/artists/${artistId}/lastfm`, { signal: undefined });
  });
});

describe("getRatesArtistSummary", () => {
  const artistSummary = {
    artist: {
      id: "00000000-0000-4000-8000-000000000023",
      name: "Artista",
      image: null,
      country: { id: "country-1", name: "España", isoCode: "ES" },
      genres: [{ id: "genre-1", name: "Rock" }],
    },
    stats: {
      ratedDiscCount: 1,
      averageRate: 0,
      highestRatedDisc: { id: "disc-1", name: "Álbum", rate: 0 },
      lowestRatedDisc: { id: "disc-1", name: "Álbum", rate: 0 },
      firstAvailableActivityAt: "2026-10-27T18:30:00.123456",
      lastAvailableActivityAt: "2026-10-27T18:30:00.123456",
    },
    discs: {
      data: [{
        id: "disc-1",
        name: "Álbum",
        image: null,
        releaseDate: null,
        rate: 0,
        cover: null,
        rateId: "rate-1",
        lastActivityAt: "2026-10-27T18:30:00.123456",
      }],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  };

  beforeEach(() => {
    get.mockReset().mockResolvedValue({ data: artistSummary });
  });

  it("requests the exact typed summary route with page, limit, and AbortSignal", async () => {
    const controller = new AbortController();
    const result = await getRatesArtistSummary(
      "00000000-0000-4000-8000-000000000023",
      { page: 2, limit: 10 },
      controller.signal,
    );

    expect(get).toHaveBeenCalledOnce();
    expect(get).toHaveBeenCalledWith(
      "/rates/artists/00000000-0000-4000-8000-000000000023/summary",
      { params: { page: 2, limit: 10 }, signal: controller.signal },
    );
    expect(result).toEqual(artistSummary);
  });

  it("supports omitted params and AbortSignal", async () => {
    await getRatesArtistSummary("00000000-0000-4000-8000-000000000023");
    expect(get).toHaveBeenCalledWith(
      "/rates/artists/00000000-0000-4000-8000-000000000023/summary",
      { params: undefined, signal: undefined },
    );
  });
});
