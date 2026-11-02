import { afterEach, describe, expect, it, vi } from "vitest";
import api from "@/services/api/api";
import {
  deleteVenueCatalog,
  getVenueCatalog,
  getVenueLocalityOptions,
  searchVenueNames,
  updateVenueCatalog,
} from "./venueCatalog";

const venue = {
  id: "venue-1",
  name: "Sala Norte",
  type: "concert_hall" as const,
  status: "active" as const,
  locality: {
    id: "locality-1",
    name: "Santander",
    administrativeRegion: {
      id: "region-1",
      name: "Cantabria",
      country: { id: "country-1", name: "España" },
    },
  },
};

describe("venue catalog API adapters", () => {
  afterEach(() => vi.restoreAllMocks());

  it("requests real backend pagination and filters using the supported query names", async () => {
    const get = vi.spyOn(api, "get").mockResolvedValue({
      data: { data: [venue], totalItems: 1, totalPages: 1, currentPage: 1, limit: 20 },
    } as never);
    const signal = new AbortController().signal;
    const request = {
      query: "  Norte ",
      countryId: "country-1",
      administrativeRegionId: "region-1",
      localityId: "locality-1",
      type: "concert_hall" as const,
      status: "active" as const,
      limit: 20,
      offset: 0,
    };

    await expect(getVenueCatalog(request, signal)).resolves.toMatchObject({
      data: [venue],
      totalItems: 1,
    });
    expect(get).toHaveBeenCalledWith("/venues", {
      params: {
        limit: 20,
        offset: 0,
        query: "Norte",
        countryId: "country-1",
        administrativeRegionId: "region-1",
        localityId: "locality-1",
        type: "concert_hall",
        status: "active",
      },
      signal,
    });
  });

  it("collects only unique locality options from server-filtered pages", async () => {
    const second = {
      ...venue,
      id: "venue-2",
      name: "Sala Sur",
      locality: { ...venue.locality, id: "locality-2", name: "Torrelavega" },
    };
    const get = vi
      .spyOn(api, "get")
      .mockResolvedValueOnce({
        data: { data: [venue, { ...venue, id: "venue-3" }], totalItems: 3, limit: 100 },
      } as never)
      .mockResolvedValueOnce({ data: { data: [second], totalItems: 3, limit: 100 } } as never);

    await expect(getVenueLocalityOptions("country-1", "region-1")).resolves.toEqual([
      { id: "locality-1", name: "Santander" },
      { id: "locality-2", name: "Torrelavega" },
    ]);
    expect(get).toHaveBeenNthCalledWith(1, "/venues", {
      params: expect.objectContaining({
        countryId: "country-1",
        administrativeRegionId: "region-1",
        limit: 100,
        offset: 0,
      }),
      signal: undefined,
    });
    expect(get).toHaveBeenNthCalledWith(2, "/venues", {
      params: expect.objectContaining({
        countryId: "country-1",
        administrativeRegionId: "region-1",
        limit: 100,
        offset: 2,
      }),
      signal: undefined,
    });
  });

  it("searches a name through paginated venue catalogue results with locality province", async () => {
    const first = { ...venue, locality: { ...venue.locality, province: "Cantabria" } };
    const get = vi
      .spyOn(api, "get")
      .mockResolvedValueOnce({
        data: { data: [first], totalItems: 2, totalPages: 2, currentPage: 1, limit: 100 },
      } as never)
      .mockResolvedValueOnce({
        data: {
          data: [{ ...first, id: "venue-2" }],
          totalItems: 2,
          totalPages: 2,
          currentPage: 2,
          limit: 100,
        },
      } as never);

    await expect(searchVenueNames("Sala Norte")).resolves.toHaveLength(2);
    expect(get).toHaveBeenNthCalledWith(1, "/venues", {
      params: { limit: 100, offset: 0, query: "Sala Norte" },
      signal: undefined,
    });
    expect(get).toHaveBeenNthCalledWith(2, "/venues", {
      params: { limit: 100, offset: 1, query: "Sala Norte" },
      signal: undefined,
    });
  });

  it("uses the real PATCH and DELETE resource routes", async () => {
    const patch = vi.spyOn(api, "patch").mockResolvedValue({ data: venue } as never);
    const remove = vi.spyOn(api, "delete").mockResolvedValue({ data: { affected: 1 } } as never);

    await updateVenueCatalog("venue-1", { name: "Sala Nueva", type: "arena", status: "closed" });
    await deleteVenueCatalog("venue-1");

    expect(patch).toHaveBeenCalledWith("/venues/venue-1", {
      name: "Sala Nueva",
      type: "arena",
      status: "closed",
    });
    expect(remove).toHaveBeenCalledWith("/venues/venue-1");
  });
});
