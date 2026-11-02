import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@services/api/api";
import { inspectLocalitiesBatch, inspectToursBatch } from "./entityResolution";
import {
  localityResolutionFixtures,
  tourResolutionFixtures,
} from "./__fixtures__/entityResolutionFixtures";
import { resolveArtistsBatch } from "./artistResolution";
import { resolveVenueBatch } from "@/modules/venues/api/venueImport";

vi.mock("@services/api/api", () => ({ default: { post: vi.fn() } }));

describe("resolution inspector HTTP adapters", () => {
  beforeEach(() => vi.mocked(api.post).mockReset());

  it("posts locality context and preserves alias, ambiguous, invalid, and repeated positions", async () => {
    const localities = localityResolutionFixtures.map(({ input }) => ({ ...input }));
    const signal = new AbortController().signal;
    vi.mocked(api.post).mockResolvedValue({
      data: { results: [...localityResolutionFixtures].reverse() },
    });

    const response = await inspectLocalitiesBatch({ localities }, signal);

    expect(api.post).toHaveBeenCalledWith("/localities/inspect-batch", { localities }, { signal });
    expect(response.results.map(({ index }) => index)).toEqual(localities.map((_, index) => index));
    expect(response.results[0]).toMatchObject({ status: "existing", locality: { name: "Madrid" } });
    expect(response.results[2]).toMatchObject({ status: "ambiguous", code: "LOCALITY_AMBIGUOUS" });
    expect(response.results[3]).toMatchObject({
      input: { name: "San Sebastián" },
      locality: { name: "Donostia" },
    });
    expect(response.results[5]).toMatchObject({
      status: "existing",
      input: { province: "Pontevedra" },
    });
    expect(response.results[6]).toMatchObject({
      status: "invalid",
      code: "LOCALITY_REGION_COUNTRY_MISMATCH",
    });
  });

  it("posts tour names, retains normalized duplicates, and keeps confirmation distinct", async () => {
    const names = tourResolutionFixtures.map(({ name }) => name);
    const signal = new AbortController().signal;
    vi.mocked(api.post).mockResolvedValue({
      data: {
        results: [...tourResolutionFixtures].reverse(),
      },
    });

    const response = await inspectToursBatch({ names }, signal);

    expect(api.post).toHaveBeenCalledWith("/tours/resolve-batch", { names }, { signal });
    expect(response.results.map(({ index }) => index)).toEqual([0, 1, 2, 3, 4]);
    expect(response.results[0]).toMatchObject({
      status: "existing",
      code: "TOUR_CONFIRMATION_REQUIRED",
      entity: { id: expect.any(String) },
    });
    expect(response.results[1]).toMatchObject({ status: "new" });
    expect(response.results[2]?.name).toBe(names[2]);
    expect(response.results[3]).toMatchObject({ status: "ambiguous", code: "TOUR_AMBIGUOUS" });
    expect(response.results[4]).toMatchObject({ status: "invalid", code: "TOUR_NAME_INVALID" });
  });

  it("rejects malformed result structure and an echoed input mapped to the wrong index", async () => {
    const localities = localityResolutionFixtures.slice(0, 2).map(({ input }) => ({ ...input }));
    vi.mocked(api.post).mockResolvedValue({ data: { results: [{ index: 0, name: "Madrid" }] } });
    await expect(inspectLocalitiesBatch({ localities })).rejects.toMatchObject({
      name: "IndexedBatchProtocolError",
    });

    const names = ["Tour A"];
    vi.mocked(api.post).mockResolvedValue({
      data: {
        results: [{ index: 0, name: "Tour B", status: "new", candidates: [] }],
      },
    });
    await expect(inspectToursBatch({ names })).rejects.toMatchObject({
      name: "IndexedBatchProtocolError",
    });
  });

  it("rejects batches over 100 before issuing either request", async () => {
    const oversized = Array.from({ length: 101 }, (_, index) => `Name ${index}`);
    const localities = oversized.map((name) => ({
      name,
      countryId: "00000000-0000-4000-8000-000000000001",
    }));

    await expect(inspectLocalitiesBatch({ localities })).rejects.toThrow("como máximo 100");
    await expect(inspectToursBatch({ names: oversized })).rejects.toThrow("como máximo 100");
    expect(api.post).not.toHaveBeenCalled();
  });

  it("preserves network, HTTP, and cancellation failures", async () => {
    const failures: unknown[] = [
      new Error("network down"),
      Object.assign(new Error("server error"), { response: { status: 503 } }),
      new axios.CanceledError("cancelled"),
    ];

    const adapters = [
      () => resolveArtistsBatch(["Artist A"]),
      () =>
        inspectLocalitiesBatch({
          localities: [
            {
              name: "Madrid",
              countryId: "00000000-0000-4000-8000-000000000001",
            },
          ],
        }),
      () =>
        resolveVenueBatch([{ name: "Sala", localityId: "00000000-0000-4000-8000-000000000020" }]),
      () => inspectToursBatch({ names: ["Tour A"] }),
    ];

    for (const adapter of adapters) {
      for (const failure of failures) {
        vi.mocked(api.post).mockRejectedValueOnce(failure);
        const received = await adapter().then(
          () => undefined,
          (error: unknown) => error
        );
        expect(received).toBe(failure);
      }
    }
  });
});
