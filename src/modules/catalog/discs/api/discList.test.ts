import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@services/api/api", () => ({ default: api }));

import {
  getDiscListOptions,
  getDiscListPage,
  getDiscListSuggestions,
  buildDiscListParams,
  buildDiscListOptionsParams,
} from "./discList";
import type { DiscListRequest } from "../types/discList";

const request: DiscListRequest = {
  mode: "all",
  query: "  metal  ",
  dateRange: ["2025-01-01T00:00:00.000Z", "2025-12-31T23:59:59.999Z"],
  genreIds: ["B", "a", "b", " "],
  countryId: "country-id",
  orderBy: "disc.releaseDate:ASC,artist.name:ASC",
  offset: 40,
  limit: 20,
};

beforeEach(() => api.get.mockReset().mockResolvedValue({ data: {} }));

describe("DiscList HTTP adapter", () => {
  it("sends the new list contract with offset, limit, date-only range, and normalized CSV genreIds", async () => {
    await getDiscListPage(request);
    expect(api.get).toHaveBeenCalledWith("/discs/list", {
      params: {
        mode: "all",
        query: "metal",
        dateRange: ["2025-01-01", "2025-12-31"],
        countryId: "country-id",
        genreIds: "a,b",
        sort: "releaseDateAsc",
        offset: 40,
        limit: 20,
      },
    });
  });

  it.each([
    ["all", "UNVOTED:rate", { eligibility: "unvotedRate" }],
    ["all", "UNVOTED:cover", { eligibility: "unvotedCover" }],
    ["rates", "rate.rate:DESC,disc.releaseDate:DESC", { sort: "myRateDesc" }],
    ["covers", "rate.cover:ASC,artist.name:ASC", { sort: "myCoverAsc" }],
    ["favorites", "disc.releaseDate:ASC,artist.name:ASC", { sort: "releaseDateAsc" }],
    ["comments", "disc.releaseDate:DESC,artist.name:ASC", { sort: "releaseDateDesc" }],
    ["pendientes", "disc.releaseDate:DESC,artist.name:ASC", { sort: "releaseDateDesc" }],
  ] as const)("translates legacy ordering for %s", (mode, orderBy, mapped) => {
    expect(buildDiscListParams({ ...request, mode, orderBy })).toMatchObject(mapped);
  });

  it("sends dynamic options without pagination or ordering and forwards AbortSignal", async () => {
    const signal = new AbortController().signal;
    const options = {
      mode: "favorites" as const,
      query: "",
      dateRange: null,
      countryId: "",
      genreIds: [],
    };
    await getDiscListOptions(options, signal);
    expect(api.get).toHaveBeenCalledWith("/discs/list/options", {
      params: { mode: "favorites" },
      signal,
    });
  });

  it("omits empty genre selections and keeps zero pagination values", () => {
    expect(buildDiscListParams({ ...request, genreIds: [], offset: 0 }).genreIds).toBeUndefined();
    expect(buildDiscListParams({ ...request, genreIds: [], offset: 0 })).toMatchObject({
      offset: 0,
      limit: 20,
    });
  });

  it.each(["all", "rates", "covers", "comments", "favorites", "pendientes"] as const)(
    "forwards an exact artist ID through %s list and contextual options",
    (mode) => {
      const artistId = "artist-exact-id";
      expect(buildDiscListParams({ ...request, mode, artistId })).toMatchObject({ mode, artistId });
      expect(
        buildDiscListOptionsParams({
          mode,
          query: "search",
          dateRange: null,
          countryId: "country-id",
          genreIds: ["genre-id"],
          artistId,
        })
      ).toMatchObject({ mode, artistId, query: "search" });
    }
  );

  it("loads the separate suggestion contract with its query and AbortSignal", async () => {
    const signal = new AbortController().signal;
    await getDiscListSuggestions("  MØL  ", signal);
    expect(api.get).toHaveBeenCalledWith("/discs/list/suggestions", {
      params: { query: "MØL" },
      signal,
    });
  });
});
