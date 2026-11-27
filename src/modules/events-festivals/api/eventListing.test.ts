import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/services/api/api";
import { eventListingParams, EventListingProtocolError, getEventListing } from "./eventListing";

vi.mock("@/services/api/api", () => ({ default: { get: vi.fn() } }));

const event = {
  id: "event-1",
  type: "concert",
  name: null,
  startDate: "2026-11-15",
  endDate: null,
  venue: {
    name: "Sala",
    locality: {
      name: "Santander",
      administrativeRegion: { name: "Cantabria", country: { name: "España" } },
    },
  },
  lineup: [{ name: "Primero" }, { name: "Segundo" }],
};

describe("event listing API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends only the supported event type, dates and limit/offset parameters", async () => {
    expect(
      eventListingParams({
        type: "festival",
        limit: 20,
        offset: 40,
        dateFrom: "2026-11-01",
        dateTo: "2026-11-30",
      })
    ).toEqual({
      type: "festival",
      limit: 20,
      offset: 40,
      dateFrom: "2026-11-01",
      dateTo: "2026-11-30",
    });
    expect(eventListingParams({ type: "concert", limit: 20, offset: 0 })).toEqual({
      type: "concert",
      limit: 20,
      offset: 0,
    });
  });

  it("reads the existing endpoint and preserves the backend lineup order", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { totalItems: 1, totalPages: 1, currentPage: 1, limit: 20, data: [event] },
    });
    const result = await getEventListing({ type: "concert", limit: 20, offset: 0 });
    expect(api.get).toHaveBeenCalledWith("/events", {
      params: { type: "concert", limit: 20, offset: 0 },
      signal: undefined,
    });
    expect(result.data[0]?.lineup.map(({ name }) => name)).toEqual(["Primero", "Segundo"]);
  });

  it("rejects responses without the required display contract", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { totalItems: 1, totalPages: 1, currentPage: 1, limit: 20, data: [{ id: "x" }] },
    });
    await expect(getEventListing({ type: "concert", limit: 20, offset: 0 })).rejects.toBeInstanceOf(
      EventListingProtocolError
    );
  });
});
