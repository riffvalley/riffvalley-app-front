import { QueryClient } from "@tanstack/vue-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEventGeographyResolution } from "./useEventGeographyResolution";

const { inspectLocalitiesMock, resolveVenuesMock } = vi.hoisted(() => ({
  inspectLocalitiesMock: vi.fn(),
  resolveVenuesMock: vi.fn(),
}));
vi.mock("../api/entityResolution", () => ({ inspectLocalitiesBatch: inspectLocalitiesMock }));
vi.mock("@/modules/venues", () => ({ resolveVenueBatch: resolveVenuesMock }));

function localityResults(localities: Array<{ name: string; countryId: string }>) {
  return {
    results: localities.map((input, index) => ({
      index,
      input,
      status: "new",
      requiresAdministrativeRegionId: false,
      candidates: [],
    })),
  };
}

describe("useEventGeographyResolution", () => {
  let queryClient: QueryClient;
  beforeEach(() => {
    vi.useFakeTimers();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    inspectLocalitiesMock
      .mockReset()
      .mockImplementation(async ({ localities }) => localityResults(localities));
    resolveVenuesMock.mockReset().mockImplementation(async (venues) =>
      venues.map((input, index) => ({
        index,
        ...input,
        status: "new",
        venue: null,
        candidates: [],
      }))
    );
  });
  afterEach(() => {
    queryClient.clear();
    vi.useRealTimers();
  });

  it("shares simultaneous equivalent locality and Venue requests and reuses fresh QueryCache data", async () => {
    const resolution = useEventGeographyResolution(queryClient);
    const locality = { name: "Madrid", countryId: "country-es", province: "Madrid" };
    const first = resolution.resolveLocalities([locality]);
    const second = resolution.resolveLocalities([{ ...locality, name: " madrid " }]);
    await vi.advanceTimersByTimeAsync(450);
    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
    expect(inspectLocalitiesMock).toHaveBeenCalledTimes(1);
    expect(inspectLocalitiesMock.mock.calls[0]?.[0].localities).toHaveLength(1);
    await resolution.resolveLocalities([locality]);
    expect(inspectLocalitiesMock).toHaveBeenCalledTimes(1);

    const venue = { name: "La Riviera", localityId: "locality-madrid" };
    const firstVenue = resolution.resolveVenues([venue]);
    const secondVenue = resolution.resolveVenues([{ ...venue }]);
    await vi.advanceTimersByTimeAsync(450);
    await expect(Promise.all([firstVenue, secondVenue])).resolves.toHaveLength(2);
    expect(resolveVenuesMock).toHaveBeenCalledTimes(1);
    expect(resolveVenuesMock.mock.calls[0]?.[0]).toEqual([venue]);
    await resolution.resolveVenues([venue]);
    expect(resolveVenuesMock).toHaveBeenCalledTimes(1);
    resolution.dispose();
  });

  it("splits more than 100 unique localities into bounded requests", async () => {
    const resolution = useEventGeographyResolution(queryClient);
    const inputs = Array.from({ length: 205 }, (_, index) => ({
      name: `Locality ${index}`,
      countryId: "country-es",
    }));
    const result = resolution.resolveLocalities(inputs);
    await vi.advanceTimersByTimeAsync(450);
    await expect(result).resolves.toHaveLength(205);
    expect(inspectLocalitiesMock.mock.calls.map(([request]) => request.localities.length)).toEqual([
      100, 100, 5,
    ]);
    resolution.dispose();
  });

  it("keeps Venue identity scoped to locality", async () => {
    const resolution = useEventGeographyResolution(queryClient);
    const result = resolution.resolveVenues([
      { name: "Sala Sol", localityId: "locality-a" },
      { name: "Sala Sol", localityId: "locality-b" },
    ]);
    await vi.advanceTimersByTimeAsync(450);
    await expect(result).resolves.toHaveLength(2);
    expect(resolveVenuesMock).toHaveBeenCalledTimes(1);
    expect(resolveVenuesMock.mock.calls[0]?.[0]).toHaveLength(2);
    resolution.dispose();
  });
});
