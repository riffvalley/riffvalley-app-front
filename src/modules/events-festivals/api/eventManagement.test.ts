import { afterEach, describe, expect, it, vi } from "vitest";
import api from "@/services/api/api";
import {
  deleteEvent,
  EventManagementProtocolError,
  getEditableEvent,
  updateEvent,
} from "./eventManagement";

vi.mock("@/services/api/api", () => ({
  default: { get: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const detail = {
  id: "event-1",
  type: "festival",
  name: "Festival",
  startDate: "2027-07-01",
  endDate: "2027-07-02",
  venueId: "venue-1",
  tourId: null,
  price: null,
  otherInfo: "",
  venue: {
    id: "venue-1",
    name: "Recinto",
    locality: {
      id: "locality-1",
      name: "Ciudad",
      province: null,
      administrativeRegion: {
        id: "region-1",
        name: "Región",
        country: { id: "country-1", name: "País" },
      },
    },
  },
  lineup: [
    { id: "event-artist-1", artistId: "artist-1", tourId: null, name: "Artista", position: 1 },
  ],
};

afterEach(() => vi.resetAllMocks());

describe("event management API", () => {
  it("loads and validates the full editable event with lineup order and relation IDs", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: detail } as never);
    const result = await getEditableEvent("event-1", new AbortController().signal);
    expect(api.get).toHaveBeenCalledWith("/events/event-1", { signal: expect.any(AbortSignal) });
    expect(result).toMatchObject({
      venueId: "venue-1",
      localityId: "locality-1",
      countryId: "country-1",
    });
    expect(result.lineup).toEqual([{ artistId: "artist-1", name: "Artista", tourId: null }]);
  });

  it("rejects incomplete event details before showing an unsafe partial form", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { ...detail, venue: null } } as never);
    await expect(getEditableEvent("event-1")).rejects.toBeInstanceOf(EventManagementProtocolError);
  });

  it("uses the verified PATCH and DELETE endpoints", async () => {
    vi.mocked(api.patch).mockResolvedValueOnce({ data: detail } as never);
    vi.mocked(api.delete).mockResolvedValueOnce({ data: { affected: 1 } } as never);
    const payload = {
      name: "Festival actualizado",
      startDate: "2027-07-01",
      endDate: "2027-07-03",
      venueId: "venue-1",
      localityId: "locality-1",
      tourId: null,
      price: null,
      otherInfo: null,
      lineup: [{ artistId: "artist-1", name: "Artista" }],
    };
    await updateEvent("event-1", payload);
    await deleteEvent("event-1");
    expect(api.patch).toHaveBeenCalledWith("/events/event-1", payload);
    expect(api.delete).toHaveBeenCalledWith("/events/event-1");
  });
});
