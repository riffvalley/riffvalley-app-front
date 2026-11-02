import { afterEach, describe, expect, it, vi } from "vitest";
import api from "@/services/api/api";
import { venueResolutionFixtures } from "@/modules/events-festivals/api/__fixtures__/entityResolutionFixtures";
import {
  getAdministrativeRegions,
  getVenueImportCountries,
  importVenueBatch,
  resolveVenueBatch,
  resolveVenueLocality,
} from "./venueImport";

describe("venue import API adapters", () => {
  afterEach(() => vi.restoreAllMocks());

  it("loads countries from the real paginated endpoint", async () => {
    const countries = [{ id: "country-es", name: "España", isoCode: "ES" }];
    const get = vi.spyOn(api, "get").mockResolvedValue({
      data: { data: countries, totalItems: 1, totalPages: 1, currentPage: 1, limit: 500 },
    } as never);
    const signal = new AbortController().signal;

    await expect(getVenueImportCountries(signal)).resolves.toEqual(countries);
    expect(get).toHaveBeenCalledWith("/countries", { params: { limit: 500, offset: 0 }, signal });
  });

  it("fetches every country page without assuming a fixed catalog size", async () => {
    const firstPage = Array.from({ length: 500 }, (_, index) => ({
      id: `country-${index}`,
      name: `País ${index}`,
      isoCode: null,
    }));
    const lastPage = [{ id: "country-last", name: "Último país", isoCode: "ZZ" }];
    const get = vi
      .spyOn(api, "get")
      .mockResolvedValueOnce({
        data: { data: firstPage, totalItems: 501, totalPages: 2, currentPage: 1, limit: 500 },
      } as never)
      .mockResolvedValueOnce({
        data: { data: lastPage, totalItems: 501, totalPages: 2, currentPage: 2, limit: 500 },
      } as never);

    await expect(getVenueImportCountries()).resolves.toHaveLength(501);
    expect(get).toHaveBeenNthCalledWith(2, "/countries", {
      params: { limit: 500, offset: 500 },
      signal: undefined,
    });
  });

  it("loads the paginated regions using the selected country ID", async () => {
    const regions = [{ id: "region-id", name: "Cantabria", countryId: "country-id" }];
    const get = vi.spyOn(api, "get").mockResolvedValue({
      data: { data: regions, totalItems: 1, limit: 100 },
    } as never);
    const signal = new AbortController().signal;

    await expect(getAdministrativeRegions("country-id", signal)).resolves.toEqual(regions);
    expect(get).toHaveBeenCalledWith("/administrative-regions", {
      params: { countryId: "country-id", limit: 100, offset: 0 },
      signal,
    });
  });

  it("loads all administrative regions when a country spans multiple pages", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      id: `region-${index}`,
      name: `Region ${index}`,
      countryId: "country-id",
    }));
    const lastPage = [{ id: "region-last", name: "Last region", countryId: "country-id" }];
    const get = vi
      .spyOn(api, "get")
      .mockResolvedValueOnce({ data: { data: firstPage, totalItems: 101, limit: 100 } } as never)
      .mockResolvedValueOnce({ data: { data: lastPage, totalItems: 101, limit: 100 } } as never);

    await expect(getAdministrativeRegions("country-id")).resolves.toHaveLength(101);
    expect(get).toHaveBeenNthCalledWith(2, "/administrative-regions", {
      params: { countryId: "country-id", limit: 100, offset: 100 },
      signal: undefined,
    });
  });

  it("sends the real locality resolve DTO and returns ambiguity as a normal response", async () => {
    const response = { locality: null, geocoding: { status: "ambiguous" } };
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: response } as never);
    const payload = {
      name: "Gerona",
      administrativeRegionId: "region-id",
      province: "Girona",
    };

    await expect(resolveVenueLocality(payload)).resolves.toEqual(response);
    expect(post).toHaveBeenCalledWith("/localities/resolve", payload, { signal: undefined });
  });

  it("sends batches using localityId and the rows' backend venue types", async () => {
    const response = {
      summary: { total: 1, created: 1, existing: 0, duplicates: 0, failed: 0 },
      results: [{ index: 0, name: "Sala", status: "created", venueId: "venue-id" }],
    };
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: response } as never);
    const payload = {
      localityId: "locality-id",
      venues: [{ name: "Sala", type: "concert_hall" as const }],
    };

    await expect(importVenueBatch(payload)).resolves.toEqual(response);
    expect(post).toHaveBeenCalledWith("/venues/import-batch", payload, { signal: undefined });
  });

  it("resolves exact venue names by locality, validates indexes, and retains ambiguity", async () => {
    const venues = venueResolutionFixtures.map(({ name, localityId }) => ({ name, localityId }));
    const response = { results: [...venueResolutionFixtures].reverse() };
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: response } as never);
    const signal = new AbortController().signal;

    await expect(resolveVenueBatch(venues, signal)).resolves.toEqual(venueResolutionFixtures);
    expect(post).toHaveBeenCalledWith("/venues/resolve-batch", { venues }, { signal });
    expect(venueResolutionFixtures[0]?.status).toBe("existing");
    expect(venueResolutionFixtures[1]).toMatchObject({ status: "new", venue: null });
    expect(venueResolutionFixtures[2]).toMatchObject({
      status: "ambiguous",
      code: "VENUE_AMBIGUOUS",
      venue: null,
    });
  });

  it("rejects empty physical venue names and oversized batches before the request", async () => {
    const post = vi.spyOn(api, "post");
    const venues = [{ name: "Sala", localityId: "locality-id" }];
    await expect(resolveVenueBatch([{ name: "  ", localityId: "locality-id" }])).rejects.toThrow(
      "nombre no vacío"
    );
    await expect(resolveVenueBatch(Array.from({ length: 101 }, () => venues[0]!))).rejects.toThrow(
      "como máximo 100"
    );
    expect(post).not.toHaveBeenCalled();
  });

  it("rejects malformed responses instead of treating them as new venues", async () => {
    vi.spyOn(api, "post").mockResolvedValue({
      data: { results: [{ index: 0, name: "Sala", localityId: "locality-id", status: "new" }] },
    } as never);
    await expect(
      resolveVenueBatch([{ name: "Sala", localityId: "locality-id" }])
    ).rejects.toMatchObject({
      name: "IndexedBatchProtocolError",
    });
  });

  it.each([new Error("offline"), { response: { status: 503 } }])(
    "preserves transport errors",
    async (failure) => {
      vi.spyOn(api, "post").mockRejectedValue(failure);
      await expect(
        resolveVenueBatch(
          [{ name: "Sala", localityId: "locality-id" }],
          new AbortController().signal
        )
      ).rejects.toBe(failure);
    }
  );
});
