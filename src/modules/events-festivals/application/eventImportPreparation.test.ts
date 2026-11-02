import { describe, expect, it } from "vitest";
import type {
  EventGeographyState,
  EventImportRow,
  EventTourState,
  LineupCellState,
} from "./useEventImportRows";
import {
  createEventImportPreparer,
  EVENT_IMPORT_BATCH_LIMIT,
  type EventImportPreparationInput,
} from "./eventImportPreparation";

const COUNTRY_ID = "123e4567-e89b-42d3-a456-426614174000";
const REGION_ID = "123e4567-e89b-42d3-a456-426614174001";
const ARTIST_ID = "123e4567-e89b-42d3-a456-426614174002";
const TOUR_ID = "123e4567-e89b-42d3-a456-426614174003";
const LOCALITY_ID = "123e4567-e89b-42d3-a456-426614174004";
const UUIDS = Array.from(
  { length: 500 },
  (_, index) => `123e4567-e89b-42d3-a456-${String(index + 1).padStart(12, "0")}`
);

function row(id = "event-row-1", overrides: Partial<EventImportRow> = {}): EventImportRow {
  return {
    id,
    type: "concert",
    event: "",
    lineup: [],
    startDate: "2027-05-15",
    startDateDraft: "15/05/2027",
    endDate: null,
    endDateDraft: "",
    venue: { name: "", venueId: null, localityId: null },
    price: "",
    otherInfo: "",
    city: "Madrid",
    province: "",
    administrativeRegionId: null,
    ...overrides,
  };
}

function geography(status: EventGeographyState["localityStatus"] = "new"): EventGeographyState {
  return {
    localityStatus: status,
    localityCandidates: [],
    selectedLocality: null,
    localityResult:
      status === "new"
        ? {
            index: 0,
            input: { name: "Madrid", countryId: COUNTRY_ID },
            status: "new",
            requiresAdministrativeRegionId: false,
            candidates: [],
          }
        : null,
    localityError: null,
    venueStatus: "idle",
    venueCandidates: [],
    venueError: null,
  };
}

function tour(status: EventTourState["status"] = "idle", name = "European Tour"): EventTourState {
  return {
    status,
    result: status === "new" ? { index: 0, name, status: "new", candidates: [] } : null,
    selectedCandidateId: null,
    confirmedTourId: null,
    error: null,
  };
}

function input(
  rows: EventImportRow[],
  options: Partial<EventImportPreparationInput> = {}
): EventImportPreparationInput {
  return {
    rows,
    countryId: COUNTRY_ID,
    countryAvailable: true,
    lineupStates: {},
    geographyStates: Object.fromEntries(rows.map(({ id }) => [id, geography()])),
    tourStates: Object.fromEntries(rows.map(({ id }) => [id, tour()])),
    ...options,
  };
}

function createPreparer() {
  let index = 0;
  return createEventImportPreparer(() => UUIDS[index++]!);
}

describe("event import preparation", () => {
  it("builds documented DTO fields and freezes an independent date-only snapshot", () => {
    const current = row("row-key-a", {
      type: "festival",
      event: "  Festival  ",
      lineup: [
        { key: "artist-a", name: "Septicflesh", artistId: ARTIST_ID },
        { key: "artist-b", name: "Band New", artistId: null },
      ],
      endDate: "2027-05-16",
      venue: {
        name: "La Riviera",
        venueId: "123e4567-e89b-42d3-a456-426614174005",
        localityId: LOCALITY_ID,
      },
      price: " 20 € ",
      otherInfo: "Ages 18+",
      administrativeRegionId: REGION_ID,
    });
    const lineup: LineupCellState = {
      draft: "",
      draftStatus: "idle",
      itemStatus: {},
      draftError: null,
      itemResolution: {
        "artist-a": {
          index: 0,
          name: "Septicflesh",
          status: "existing",
          artist: { id: ARTIST_ID, name: "Septicflesh" },
          candidates: [],
        },
        "artist-b": { index: 1, name: "Band New", status: "new", artist: null, candidates: [] },
      },
    };
    const existingGeography = geography("existing");
    const locality = {
      id: LOCALITY_ID,
      name: "Madrid",
      province: null,
      country: { id: COUNTRY_ID, name: "Spain" },
      administrativeRegion: { id: REGION_ID, name: "Madrid" },
    };
    existingGeography.localityResult = {
      index: 0,
      input: { name: "Madrid", countryId: COUNTRY_ID },
      status: "existing",
      locality,
      candidates: [],
    };
    existingGeography.selectedLocality = locality;
    existingGeography.venueStatus = "existing";
    const preparer = createPreparer();
    const prepared = preparer.prepare(
      input([current], {
        lineupStates: { [current.id]: lineup },
        geographyStates: { [current.id]: existingGeography },
      })
    );

    expect(prepared.pendingRows).toEqual([]);
    expect(prepared.payload).toEqual({
      batchId: UUIDS[1],
      countryId: COUNTRY_ID,
      rows: [
        {
          rowId: UUIDS[0],
          type: "festival",
          name: "  Festival  ",
          lineup: [{ name: "Septicflesh", artistId: ARTIST_ID }, { name: "Band New" }],
          startDate: "2027-05-15",
          endDate: "2027-05-16",
          venue: "La Riviera",
          city: "Madrid",
          administrativeRegionId: REGION_ID,
          price: " 20 € ",
          otherInfo: "Ages 18+",
        },
      ],
    });
    expect(JSON.stringify(prepared.payload)).not.toMatch(/rowKey|revision|venueId|localityId/u);
    expect(Object.isFrozen(prepared.snapshot)).toBe(true);
    expect(Object.isFrozen(prepared.payload?.rows[0]?.lineup)).toBe(true);
    current.lineup[0]!.name = "Changed";
    current.lineup.reverse();
    expect(prepared.snapshot?.payload.rows[0]?.lineup?.[0]?.name).toBe("Septicflesh");
    expect(
      preparer.isCurrent(
        prepared.snapshot!,
        "row-key-a",
        input([current], {
          lineupStates: { [current.id]: lineup },
          geographyStates: { [current.id]: existingGeography },
        })
      )
    ).toBe(false);
  });

  it("keeps identities for an identical retry and changes row and batch ids after payload edits", () => {
    const preparer = createPreparer();
    const current = row();
    const first = preparer.prepare(input([current]));
    const retry = preparer.prepare(input([current]));
    expect(retry.payload).toBe(first.payload);
    expect(retry.snapshot?.batchId).toBe(first.snapshot?.batchId);
    expect(retry.eligibleRows[0]?.operationRowId).toBe(first.eligibleRows[0]?.operationRowId);

    current.price = "10";
    const corrected = preparer.prepare(input([current]));
    expect(corrected.eligibleRows[0]?.operationRowId).not.toBe(
      first.eligibleRows[0]?.operationRowId
    );
    expect(corrected.snapshot?.batchId).not.toBe(first.snapshot?.batchId);
    expect(corrected.eligibleRows[0]?.revision).toBe(2);
  });

  it("keeps operation identity for display-only updates and changes batch context with country", () => {
    const preparer = createPreparer();
    const current = row();
    const first = preparer.prepare(input([current]));
    current.startDateDraft = "15/05/2027";
    current.endDateDraft = "";
    current.event = " ";
    current.venue.name = " ";
    current.province = " ";
    current.price = " ";
    current.otherInfo = " ";
    const displayOnly = preparer.prepare(input([current]));
    expect(displayOnly.eligibleRows[0]?.operationRowId).toBe(first.eligibleRows[0]?.operationRowId);
    expect(displayOnly.snapshot?.batchId).toBe(first.snapshot?.batchId);

    const otherCountry = "123e4567-e89b-42d3-a456-426614174099";
    const changedCountry = preparer.prepare(
      input([current], {
        countryId: otherCountry,
        geographyStates: {
          [current.id]: {
            ...geography(),
            localityResult: {
              index: 0,
              input: { name: "Madrid", countryId: otherCountry },
              status: "new",
              requiresAdministrativeRegionId: false,
              candidates: [],
            },
          },
        },
      })
    );
    expect(changedCountry.eligibleRows[0]?.operationRowId).not.toBe(
      first.eligibleRows[0]?.operationRowId
    );
    expect(changedCountry.snapshot?.batchId).not.toBe(first.snapshot?.batchId);
  });

  it("requires explicit tour confirmation and emits no fake tour UUID for a new tour", () => {
    const preparer = createPreparer();
    const current = row("tour-row", { type: "tour", event: "European Tour" });
    const unconfirmed = preparer.prepare(
      input([current], {
        tourStates: {
          [current.id]: {
            ...tour("existing"),
            result: {
              index: 0,
              name: "European Tour",
              status: "existing",
              code: "TOUR_CONFIRMATION_REQUIRED",
              entity: { id: TOUR_ID, name: "European Tour" },
              candidates: [],
            },
            selectedCandidateId: TOUR_ID,
          },
        },
      })
    );
    expect(unconfirmed.payload).toBeNull();
    expect(unconfirmed.pendingRows[0]?.reasons).toContain("tour-confirmation-required");

    const confirmedState: EventTourState = {
      ...tour("existing"),
      result: {
        index: 0,
        name: "European Tour",
        status: "existing",
        code: "TOUR_CONFIRMATION_REQUIRED",
        entity: { id: TOUR_ID, name: "European Tour" },
        candidates: [],
      },
      selectedCandidateId: TOUR_ID,
      confirmedTourId: TOUR_ID,
    };
    const confirmed = preparer.prepare(
      input([current], { tourStates: { [current.id]: confirmedState } })
    );
    expect(confirmed.payload?.rows[0]?.tourId).toBe(TOUR_ID);

    const newTour = row("new-tour-row", { type: "tour", event: "New European Tour" });
    const newPrepared = preparer.prepare(
      input([newTour], { tourStates: { [newTour.id]: tour("new", newTour.event) } })
    );
    expect(newPrepared.pendingRows).toEqual([]);
    expect(newPrepared.payload?.rows[0]).not.toHaveProperty("tourId");
  });

  it("returns row-specific pending reasons without blocking valid rows", () => {
    const preparer = createPreparer();
    const ready = row("ready");
    const bad = row("bad", { city: "", startDate: null });
    const result = preparer.prepare(input([ready, bad]));
    expect(result.payload?.rows).toHaveLength(1);
    expect(result.pendingRows).toEqual([
      { rowKey: "bad", revision: 1, reasons: ["start-date-invalid", "city-required"] },
    ]);
    expect(result.correlation.ready).toBe(result.eligibleRows[0]?.operationRowId);
  });

  it("prepares seven of ten rows and reports incomplete country and invalid dates", () => {
    const preparer = createPreparer();
    const rows = Array.from({ length: 10 }, (_, index) => row(`partial-${index}`));
    rows[7]!.startDate = "2027-02-29";
    rows[8]!.endDate = "2027-05-14";
    rows[9]!.city = "";
    const prepared = preparer.prepare(input(rows));
    expect(prepared.eligibleRows).toHaveLength(7);
    expect(prepared.pendingRows).toHaveLength(3);
    expect(prepared.pendingRows.map(({ reasons }) => reasons[0])).toEqual([
      "start-date-invalid",
      "end-date-before-start-date",
      "city-required",
    ]);

    const noCountry = preparer.prepare(
      input([rows[0]!], { countryAvailable: false, countryId: "" })
    );
    expect(noCountry.payload).toBeNull();
    expect(noCountry.pendingRows[0]?.reasons).toContain("country-unavailable");
  });

  it("blocks ambiguous or technically failed artist and geography lookups", () => {
    const preparer = createPreparer();
    const current = row("blocked", {
      lineup: [{ key: "artist", name: "Ambiguous", artistId: null }],
      venue: { name: "Venue", venueId: null, localityId: null },
    });
    const state: LineupCellState = {
      draft: "",
      draftStatus: "idle",
      itemStatus: {},
      draftError: null,
      itemResolution: {
        artist: {
          index: 0,
          name: "Ambiguous",
          status: "ambiguous",
          code: "ARTIST_AMBIGUOUS",
          artist: null,
          candidates: [{ id: ARTIST_ID, name: "Ambiguous" }],
        },
      },
    };
    const result = preparer.prepare(
      input([current], {
        lineupStates: { [current.id]: state },
        geographyStates: { [current.id]: { ...geography("error"), localityError: "network" } },
      })
    );
    expect(result.payload).toBeNull();
    expect(result.pendingRows[0]?.reasons).toEqual(
      expect.arrayContaining(["locality-resolution-error", "artist-ambiguous:artist"])
    );
  });

  it("keeps ambiguous entities and technical artist failures pending", () => {
    const preparer = createPreparer();
    const current = row("ambiguous", {
      lineup: [{ key: "artist", name: "Unknown", artistId: null }],
      venue: { name: "Ambiguous venue", venueId: null, localityId: LOCALITY_ID },
    });
    const artistState: LineupCellState = {
      draft: "",
      draftStatus: "idle",
      itemStatus: { artist: "error" },
      draftError: null,
      itemResolution: { artist: { status: "error", message: "offline" } },
    };
    const geo = geography("ambiguous");
    geo.localityResult = {
      index: 0,
      input: { name: "Madrid", countryId: COUNTRY_ID },
      status: "ambiguous",
      code: "LOCALITY_AMBIGUOUS",
      candidates: [
        {
          id: LOCALITY_ID,
          name: "Madrid",
          province: "Madrid",
          country: { id: COUNTRY_ID, name: "Spain" },
          administrativeRegion: { id: REGION_ID, name: "Madrid" },
        },
      ],
    };
    geo.venueStatus = "ambiguous";
    const result = preparer.prepare(
      input([current], {
        lineupStates: { [current.id]: artistState },
        geographyStates: { [current.id]: geo },
      })
    );
    expect(result.pendingRows[0]?.reasons).toEqual(
      expect.arrayContaining([
        "locality-ambiguous",
        "venue-ambiguous",
        "artist-resolution-error:artist",
      ])
    );
  });

  it("allows an explicitly confirmed ambiguous tour candidate", () => {
    const preparer = createPreparer();
    const current = row("tour-ambiguous", { type: "tour", event: "European Tour" });
    const candidateId = "123e4567-e89b-42d3-a456-426614174006";
    const state: EventTourState = {
      status: "ambiguous",
      result: {
        index: 0,
        name: "European Tour",
        status: "ambiguous",
        code: "TOUR_AMBIGUOUS",
        candidates: [{ id: candidateId, name: "European Tour" }],
      },
      selectedCandidateId: candidateId,
      confirmedTourId: candidateId,
      error: null,
    };
    const prepared = preparer.prepare(input([current], { tourStates: { [current.id]: state } }));
    expect(prepared.payload?.rows[0]?.tourId).toBe(candidateId);
  });

  it("requires a region for a new locality when requested and limits each snapshot to 100 rows", () => {
    const preparer = createPreparer();
    const requiringRegion = row("region", { administrativeRegionId: null });
    const regionGeography = geography();
    regionGeography.localityResult = {
      index: 0,
      input: { name: "Madrid", countryId: COUNTRY_ID },
      status: "new",
      requiresAdministrativeRegionId: true,
      candidates: [],
    };
    const blocked = preparer.prepare(
      input([requiringRegion], { geographyStates: { region: regionGeography } })
    );
    expect(blocked.pendingRows[0]?.reasons).toContain("administrative-region-required");

    const rows = Array.from({ length: EVENT_IMPORT_BATCH_LIMIT + 1 }, (_, index) =>
      row(`row-${index}`)
    );
    const overLimit = preparer.prepare(input(rows));
    expect(overLimit.payload?.rows).toHaveLength(EVENT_IMPORT_BATCH_LIMIT);
    expect(overLimit.pendingRows).toHaveLength(1);
    expect(overLimit.pendingRows[0]?.reasons).toEqual(["batch-limit-exceeded"]);
  });

  it("retains a new Venue name and omits an empty generic Venue", () => {
    const preparer = createPreparer();
    const current = row("new-venue", {
      venue: { name: "Sala Nueva", venueId: null, localityId: LOCALITY_ID },
    });
    const geo = geography("existing");
    const locality = {
      id: LOCALITY_ID,
      name: "Madrid",
      province: null,
      country: { id: COUNTRY_ID, name: "Spain" },
      administrativeRegion: { id: REGION_ID, name: "Madrid" },
    };
    geo.localityResult = {
      index: 0,
      input: { name: "Madrid", countryId: COUNTRY_ID },
      status: "existing",
      locality,
      candidates: [],
    };
    geo.selectedLocality = locality;
    geo.venueStatus = "new";
    const prepared = preparer.prepare(input([current], { geographyStates: { [current.id]: geo } }));
    expect(prepared.payload?.rows[0]?.venue).toBe("Sala Nueva");
    expect(prepared.payload?.rows[0]).not.toHaveProperty("venueId");
    expect(prepared.payload?.rows[0]).not.toHaveProperty("localityId");

    current.venue.name = "";
    const genericVenue = preparer.prepare(
      input([current], { geographyStates: { [current.id]: geo } })
    );
    expect(genericVenue.payload?.rows[0]).not.toHaveProperty("venue");
  });

  it("treats deleted and reordered rows by rowKey, never by visual index", () => {
    const preparer = createPreparer();
    const first = row("stable-a");
    const second = row("stable-b");
    const before = input([first, second]);
    const snapshot = preparer.prepare(before).snapshot!;
    const reordered = input([second, first]);
    expect(preparer.isCurrent(snapshot, "stable-a", reordered)).toBe(true);
    expect(preparer.isCurrent(snapshot, "stable-b", input([first]))).toBe(false);
  });
});
