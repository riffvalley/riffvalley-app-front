import { QueryClient } from "@tanstack/vue-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import api from "@services/api/api";
import {
  artistResolutionQueryOptions,
  ENTITY_RESOLUTION_STALE_TIME,
  entityResolutionQueryKeys,
  localityInspectionQueryOptions,
  tourResolutionQueryOptions,
  venueResolutionQueryOptions,
} from "./entityResolutionQueries";

vi.mock("@services/api/api", () => ({ default: { post: vi.fn() } }));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
}

const artistResult = {
  index: 0,
  name: "Artist A",
  status: "existing" as const,
  artist: { id: "artist-id", name: "Artist A" },
  candidates: [] as [],
};

describe("entity resolution query options", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("builds deterministic, entity-specific keys preserving order and duplicates", () => {
    expect(entityResolutionQueryKeys.artists(["A", "A", "B"])).toEqual(
      entityResolutionQueryKeys.artists(["A", "A", "B"])
    );
    expect(entityResolutionQueryKeys.artists(["A", "B"])).not.toEqual(
      entityResolutionQueryKeys.artists(["B", "A"])
    );
    expect(entityResolutionQueryKeys.artists(["A"])).not.toEqual(
      entityResolutionQueryKeys.tours(["A"])
    );

    const locality = { name: "Santiago", countryId: "country-a", province: "A Coruña" };
    expect(entityResolutionQueryKeys.localities([locality])).not.toEqual(
      entityResolutionQueryKeys.localities([{ ...locality, countryId: "country-b" }])
    );
    expect(entityResolutionQueryKeys.localities([locality])).not.toEqual(
      entityResolutionQueryKeys.localities([{ ...locality, administrativeRegionId: "region-a" }])
    );
    expect(entityResolutionQueryKeys.localities([locality])).not.toEqual(
      entityResolutionQueryKeys.localities([{ ...locality, province: "Pontevedra" }])
    );
    expect(entityResolutionQueryKeys.localities([locality, locality])).not.toEqual(
      entityResolutionQueryKeys.localities([locality])
    );
    expect(
      entityResolutionQueryKeys.localities([locality, { ...locality, province: "Pontevedra" }])
    ).not.toEqual(
      entityResolutionQueryKeys.localities([{ ...locality, province: "Pontevedra" }, locality])
    );
    expect(
      entityResolutionQueryKeys.venues([{ name: "Sala", localityId: "locality-a" }])
    ).not.toEqual(entityResolutionQueryKeys.venues([{ name: "Sala", localityId: "locality-b" }]));
    expect(
      entityResolutionQueryKeys.venues([
        { name: "Sala A", localityId: "locality-a" },
        { name: "Sala A", localityId: "locality-a" },
      ])
    ).not.toEqual(entityResolutionQueryKeys.venues([{ name: "Sala A", localityId: "locality-a" }]));
    expect(entityResolutionQueryKeys.tours(["Tour A", "Tour B"])).not.toEqual(
      entityResolutionQueryKeys.tours(["Tour B", "Tour A"])
    );
    expect(ENTITY_RESOLUTION_STALE_TIME).toBe(15_000);
  });

  it("shares an identical pending request and reuses its fresh cached result", async () => {
    const client = createQueryClient();
    let resolveRequest:
      ((response: { data: { results: (typeof artistResult)[] } }) => void) | undefined;
    vi.spyOn(api, "post").mockImplementation(
      () => new Promise((resolve) => (resolveRequest = resolve)) as never
    );
    const options = artistResolutionQueryOptions(["Artist A"]);

    const first = client.fetchQuery(options);
    const second = client.fetchQuery(options);
    expect(api.post).toHaveBeenCalledTimes(1);

    resolveRequest?.({ data: { results: [artistResult] } });
    await expect(Promise.all([first, second])).resolves.toEqual([[artistResult], [artistResult]]);
    await expect(client.fetchQuery(options)).resolves.toEqual([artistResult]);
    expect(api.post).toHaveBeenCalledTimes(1);
    client.clear();
  });

  it("passes the query signal to Axios and ignores a response arriving after cancellation", async () => {
    const client = createQueryClient();
    let requestSignal: { aborted?: boolean } | undefined;
    let resolveRequest:
      ((response: { data: { results: (typeof artistResult)[] } }) => void) | undefined;
    vi.spyOn(api, "post").mockImplementation((_url, _payload, config) => {
      requestSignal = config?.signal;
      return new Promise((resolve) => (resolveRequest = resolve)) as never;
    });
    const options = artistResolutionQueryOptions(["Artist A"]);
    const pending = client.fetchQuery(options);

    await vi.waitFor(() => expect(requestSignal).toBeInstanceOf(AbortSignal));
    await client.cancelQueries({ queryKey: options.queryKey, exact: true });
    expect(requestSignal?.aborted).toBe(true);

    resolveRequest?.({ data: { results: [artistResult] } });
    const cancellation = await pending.catch((error: unknown) => error);
    expect(cancellation).toMatchObject({ message: "CancelledError" });
    expect(client.getQueryData(options.queryKey)).toBeUndefined();
    client.clear();
  });

  it("uses each adapter and isolates invalidation to the matching key", async () => {
    const client = createQueryClient();
    const artistOptions = artistResolutionQueryOptions(["Artist A"]);
    const localityOptions = localityInspectionQueryOptions([
      { name: "Madrid", countryId: "country-id" },
    ]);
    const venueOptions = venueResolutionQueryOptions([{ name: "Sala", localityId: "locality-id" }]);
    const tourOptions = tourResolutionQueryOptions({ names: ["European Tour"] });

    vi.spyOn(api, "post")
      .mockResolvedValueOnce({ data: { results: [artistResult] } } as never)
      .mockResolvedValueOnce({
        data: {
          results: [
            {
              index: 0,
              input: { name: "Madrid", countryId: "country-id" },
              status: "new",
              candidates: [],
              requiresAdministrativeRegionId: true,
            },
          ],
        },
      } as never)
      .mockResolvedValueOnce({
        data: {
          results: [
            {
              index: 0,
              name: "Sala",
              localityId: "locality-id",
              venue: null,
              status: "new",
              candidates: [],
            },
          ],
        },
      } as never)
      .mockResolvedValueOnce({
        data: { results: [{ index: 0, name: "European Tour", status: "new", candidates: [] }] },
      } as never);

    await Promise.all([
      client.fetchQuery(artistOptions),
      client.fetchQuery(localityOptions),
      client.fetchQuery(venueOptions),
      client.fetchQuery(tourOptions),
    ]);
    expect(api.post).toHaveBeenCalledTimes(4);

    await client.invalidateQueries({ queryKey: artistOptions.queryKey, exact: true });
    expect(client.getQueryState(artistOptions.queryKey)?.isInvalidated).toBe(true);
    expect(client.getQueryState(localityOptions.queryKey)?.isInvalidated).toBe(false);
    expect(client.getQueryState(venueOptions.queryKey)?.isInvalidated).toBe(false);
    expect(client.getQueryState(tourOptions.queryKey)?.isInvalidated).toBe(false);
    client.clear();
  });

  it("does not retry a protocol error or expose it as a new entity", async () => {
    const client = createQueryClient();
    const options = artistResolutionQueryOptions(["Artist A"]);
    vi.spyOn(api, "post").mockResolvedValue({
      data: { results: [{ index: 0, name: "wrong" }] },
    } as never);

    await expect(client.fetchQuery(options)).rejects.toMatchObject({
      name: "IndexedBatchProtocolError",
      category: "protocol-error",
    });
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(client.getQueryData(options.queryKey)).toBeUndefined();
    client.clear();
  });
});
