import { describe, expect, it } from "vitest";
import { ENTITY_RESOLUTION_BATCH_LIMIT, orderIndexedResults } from "./entityResolutionContracts";
import {
  artistResolutionFixtures,
  localityResolutionFixtures,
  tourResolutionFixtures,
  venueResolutionFixtures,
} from "./__fixtures__/entityResolutionFixtures";

describe("CON-B04g HTTP contract fixtures", () => {
  it("captures backend status, candidate, and code distinctions", () => {
    expect(artistResolutionFixtures.map(({ status }) => status)).toEqual([
      "existing",
      "new",
      "ambiguous",
      "invalid",
      "existing",
    ]);
    expect(artistResolutionFixtures[1].artist).toBeNull();
    expect(artistResolutionFixtures[2]).toMatchObject({
      code: "ARTIST_AMBIGUOUS",
      artist: null,
      candidates: [{ id: expect.any(String) }, { id: expect.any(String) }],
    });
    expect(artistResolutionFixtures[3]).toMatchObject({
      status: "invalid",
      code: "ARTIST_NAME_INVALID",
      artist: null,
    });
    expect(localityResolutionFixtures[0]).toMatchObject({
      status: "existing",
      locality: { name: "Madrid" },
    });
    expect(localityResolutionFixtures[1]).toMatchObject({
      status: "new",
      requiresAdministrativeRegionId: true,
    });
    expect(localityResolutionFixtures[2]).toMatchObject({
      status: "ambiguous",
      code: "LOCALITY_AMBIGUOUS",
      candidates: [{ province: "A Coruña" }, { province: "Pontevedra" }],
    });
    expect(localityResolutionFixtures[3]).toMatchObject({
      input: { name: "San Sebastián" },
      locality: { name: "Donostia" },
    });
    expect(localityResolutionFixtures[4]).toMatchObject({
      status: "new",
      requiresAdministrativeRegionId: false,
    });
    expect(localityResolutionFixtures[5]).toMatchObject({
      input: { province: "Pontevedra" },
      status: "existing",
      locality: { province: "Pontevedra" },
    });
    expect(localityResolutionFixtures[6]).toMatchObject({
      status: "invalid",
      code: "LOCALITY_REGION_COUNTRY_MISMATCH",
    });
    expect(localityResolutionFixtures[7]).toMatchObject({
      status: "invalid",
      code: "LOCALITY_COUNTRY_NOT_FOUND",
    });
    expect(tourResolutionFixtures[0]).toMatchObject({
      status: "existing",
      code: "TOUR_CONFIRMATION_REQUIRED",
      entity: { id: expect.any(String) },
    });
    expect(tourResolutionFixtures[1]).toMatchObject({ status: "new" });
    expect(tourResolutionFixtures[3]).toMatchObject({
      status: "ambiguous",
      code: "TOUR_AMBIGUOUS",
      candidates: [{ id: expect.any(String) }, { id: expect.any(String) }],
    });
    expect(tourResolutionFixtures[4]).toMatchObject({
      status: "invalid",
      code: "TOUR_NAME_INVALID",
    });
    expect(venueResolutionFixtures[0]).toMatchObject({
      status: "existing",
      venue: { id: expect.any(String) },
    });
    expect(venueResolutionFixtures[1]).toMatchObject({ status: "new", venue: null });
    expect(venueResolutionFixtures[2]).toMatchObject({
      status: "ambiguous",
      code: "VENUE_AMBIGUOUS",
      venue: null,
    });
    expect(venueResolutionFixtures[0].localityId).not.toBe(venueResolutionFixtures[1].localityId);
  });

  it("allows out-of-order responses and retains duplicate input positions", () => {
    const results = orderIndexedResults(
      ["Architects", "Architects"],
      [{ ...artistResolutionFixtures[4], index: 1 }, artistResolutionFixtures[0]],
      (name, result) => name === result.name
    );

    expect(results.map(({ index, name }) => [index, name])).toEqual([
      [0, "Architects"],
      [1, "Architects"],
    ]);
  });

  it.each([
    { label: "duplicate indices", indexes: [0, 0], message: "índices duplicados" },
    { label: "out-of-range indices", indexes: [0, 2], message: "fuera de rango" },
    { label: "missing indices", indexes: [1], message: "un resultado por entrada" },
  ])("rejects malformed protocol responses with $label", ({ indexes, message }) => {
    const results = indexes.map((index) => ({ index }));
    expect(() => orderIndexedResults(["one", "two"], results, () => true)).toThrow(message);
  });

  it("rejects an index whose echoed input belongs to another position", () => {
    expect(() =>
      orderIndexedResults(
        ["Artist A"],
        [{ index: 0, name: "Artist B" }],
        (input, result) => input === result.name
      )
    ).toThrow("entrada asociada al índice");
  });

  it("records the shared inspector batch limit", () => {
    expect(ENTITY_RESOLUTION_BATCH_LIMIT).toBe(100);
  });
});
