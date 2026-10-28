import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@services/api/api", () => ({ default: { get } }));

import {
  buildTopDiscsOptionsRequestParams,
  buildTopDiscsRequestParams,
  getTopDiscs,
  getTopDiscsOptions,
  mapTopDiscsOptions,
} from "./topDiscs";

describe("TopDiscs HTTP adapters", () => {
  beforeEach(() => {
    get.mockReset().mockResolvedValue({ data: { discs: [], countries: [], genres: [] } });
  });

  it("builds ranking params with copied dateRange and selected IDs", () => {
    const dateRange: [string, string] = ["2026-05-01", "2026-05-31"];
    const params = buildTopDiscsRequestParams({
      dateRange,
      countryId: "country-id",
      genreId: "genre-id",
    });

    expect(params).toEqual({
      dateRange: ["2026-05-01", "2026-05-31"],
      countryId: "country-id",
      genreId: "genre-id",
    });
    expect(params.dateRange).not.toBe(dateRange);
  });

  it("keeps the exact dateRange tuple and omits absent ranking filters", async () => {
    const dateRange: [string, string] = ["2026-05-15", "2026-05-21"];
    const response = {
      discs: [],
      totalDiscs: 0,
      totalVotes: 0,
      ratingDistribution: [],
      topUsersByRates: [],
      topUsersByCover: [],
    };
    get.mockResolvedValueOnce({ data: response });

    await expect(getTopDiscs({ dateRange })).resolves.toEqual(response);
    expect(get).toHaveBeenCalledWith("/discs/topDiscs", {
      params: { dateRange: ["2026-05-15", "2026-05-21"] },
    });
  });

  it("uses the current Axios array serialization for calendar dates", () => {
    const url = axios.getUri({
      url: "/discs/topDiscs/options",
      params: buildTopDiscsOptionsRequestParams({ dateRange: ["2026-05-15", "2026-05-21"] }),
    });

    expect(url).toBe("/discs/topDiscs/options?dateRange[]=2026-05-15&dateRange[]=2026-05-21");
  });

  it("omits all optional filters when no values are supplied", () => {
    expect(buildTopDiscsRequestParams()).toEqual({});
    expect(buildTopDiscsOptionsRequestParams()).toEqual({});
  });

  it("builds options params with dynamic filters and the legacy country value", () => {
    expect(
      buildTopDiscsOptionsRequestParams({
        dateRange: ["2026-01-01", "2026-01-31"],
        countryId: "country-id",
        genreId: "genre-id",
        country: "Spain",
      })
    ).toEqual({
      dateRange: ["2026-01-01", "2026-01-31"],
      countryId: "country-id",
      genreId: "genre-id",
      country: "Spain",
    });
  });

  it("maps countries and genres to their shared Catalog contracts", () => {
    expect(
      mapTopDiscsOptions({
        countries: [{ id: "country-id", name: "España", isoCode: "ES" }],
        genres: [{ id: "genre-id", name: "Rock", color: "#123456" }],
      })
    ).toEqual({
      countries: [{ id: "country-id", name: "España", isoCode: "ES" }],
      genres: [{ id: "genre-id", name: "Rock", color: "#123456" }],
    });
  });

  it("returns empty option lists unchanged", async () => {
    get.mockResolvedValueOnce({ data: { countries: [], genres: [] } });

    await expect(getTopDiscsOptions()).resolves.toEqual({ countries: [], genres: [] });
    expect(get).toHaveBeenCalledWith("/discs/topDiscs/options", { params: {} });
  });

  it("propagates HTTP failures without converting them into empty responses", async () => {
    const failure = new Error("request failed");
    get.mockRejectedValueOnce(failure);

    await expect(getTopDiscsOptions()).rejects.toBe(failure);
  });
});
