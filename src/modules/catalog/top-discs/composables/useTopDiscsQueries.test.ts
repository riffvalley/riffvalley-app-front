import { QueryClient } from "@tanstack/vue-query";
import { describe, expect, it } from "vitest";
import {
  normalizeTopDiscsOptionsParams,
  normalizeTopDiscsParams,
  topDiscsOptionsQueryKey,
  topDiscsOptionsQueryKeyFor,
  topDiscsQueryKey,
  topDiscsQueryKeyForSession,
} from "./useTopDiscsQueries";

describe("TopDiscs query keys", () => {
  it("copies date ranges while normalizing ranking filters", () => {
    const dateRange: [string, string] = ["2026-05-01", "2026-05-31"];
    const normalized = normalizeTopDiscsParams({ dateRange, countryId: "country-id" });

    expect(normalized).toEqual({ dateRange, countryId: "country-id" });
    expect(normalized.dateRange).not.toBe(dateRange);
  });

  it("normalizes option filters without keeping absent values", () => {
    expect(normalizeTopDiscsOptionsParams({ genreId: "genre-id" })).toEqual({
      genreId: "genre-id",
    });
    expect(normalizeTopDiscsOptionsParams()).toEqual({});
  });

  it("creates different ranking keys for different filters and sessions", () => {
    const first = topDiscsQueryKeyForSession({ countryId: "country-a" }, "user-1", 2);
    const otherFilter = topDiscsQueryKeyForSession({ countryId: "country-b" }, "user-1", 2);
    const otherSession = topDiscsQueryKeyForSession({ countryId: "country-a" }, "user-2", 3);

    expect(first).not.toEqual(otherFilter);
    expect(first).not.toEqual(otherSession);
    expect(first.slice(0, 2)).toEqual(topDiscsQueryKey);
  });

  it("creates different option keys for different filters", () => {
    const first = topDiscsOptionsQueryKeyFor({ dateRange: ["2026-01-01", "2026-01-31"] });
    const other = topDiscsOptionsQueryKeyFor({ dateRange: ["2026-02-01", "2026-02-28"] });

    expect(first).not.toEqual(other);
    expect(first.slice(0, 2)).toEqual(topDiscsOptionsQueryKey);
  });

  it("keeps ranking and option cache entries independent", () => {
    const client = new QueryClient();
    const rankingKey = topDiscsQueryKeyForSession({}, "user-1", 1);
    const optionsKey = topDiscsOptionsQueryKeyFor({});
    const ranking = { discs: [] };
    const options = { countries: [], genres: [] };

    client.setQueryData(rankingKey, ranking);
    client.setQueryData(optionsKey, options);

    expect(client.getQueryData(rankingKey)).toBe(ranking);
    expect(client.getQueryData(optionsKey)).toBe(options);
    expect(client.getQueryCache().findAll({ queryKey: topDiscsQueryKey })).toHaveLength(1);
    expect(client.getQueryCache().findAll({ queryKey: topDiscsOptionsQueryKey })).toHaveLength(1);
    client.clear();
  });
});
