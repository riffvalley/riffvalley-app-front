import { describe, expect, it } from "vitest";
import type { EventImportConflictPresentation } from "./eventImportConflicts";
import {
  createEventLineupExpansionPreparer,
  type ExpansionUuidFactory,
  type LineupExpansionPreparationInput,
} from "./eventLineupExpansionPreparation";
import type { ArtistResolutionResult } from "../api/artistResolution";
import type { EventImportRow, LineupCellState } from "./useEventImportRows";

const ids = {
  batch: "11111111-1111-4111-8111-111111111111",
  operationRow: "22222222-2222-4222-8222-222222222222",
  country: "33333333-3333-4333-8333-333333333333",
  event: "44444444-4444-4444-8444-444444444444",
  metallica: "55555555-5555-4555-8555-555555555555",
  gojira: "66666666-6666-4666-8666-666666666666",
};

function fixture(type: "concert" | "festival" | "tour" = "concert") {
  const conflict: EventImportConflictPresentation = {
    operationId: ids.batch,
    rowKey: "row-a",
    operationRowId: ids.operationRow,
    snapshotRevision: 4,
    countryId: ids.country,
    status: "current",
    code: type === "festival" ? "FESTIVAL_DUPLICATE" : "CONCERT_ARTIST_DATE_LOCALITY_CONFLICT",
    message: "Existing event conflict",
    severity: "blocking",
    kind: type === "festival" ? "duplicate" : "participation",
    snapshot: {
      rowId: ids.operationRow,
      type,
      ...(type === "concert" ? {} : { name: "Festival or tour" }),
      lineup: [
        { name: "Metallica", artistId: ids.metallica },
        { name: "Gojira", artistId: ids.gojira },
      ],
      startDate: "2027-05-15",
      ...(type === "festival" ? { endDate: "2027-05-16" } : {}),
      city: "Madrid",
      venue: "Sala",
      localityId: "77777777-7777-4777-8777-777777777777",
    },
    relatedRows: [],
    existingEventIds: [ids.event],
    candidateEventIds: [ids.event],
    eventReferences: [
      { eventId: ids.event, status: "identified" },
      { eventId: ids.event, status: "candidate" },
    ],
    matchingArtists: [{ artistId: ids.metallica, name: "Metallica" }],
    addableArtists: [{ artistId: ids.gojira, name: "Gojira" }],
  };
  const row: EventImportRow = {
    id: "row-a",
    type,
    event: type === "concert" ? "" : "Festival or tour",
    lineup: [
      { key: "artist-1", name: "Metallica", artistId: ids.metallica },
      { key: "artist-2", name: "Gojira", artistId: ids.gojira },
    ],
    startDate: "2027-05-15",
    startDateDraft: "15/05/2027",
    endDate: type === "festival" ? "2027-05-16" : null,
    endDateDraft: type === "festival" ? "16/05/2027" : "",
    venue: { name: "Sala", venueId: null, localityId: null },
    price: "",
    otherInfo: "",
    city: "Madrid",
    province: "",
    administrativeRegionId: null,
  };
  const resolution = (id: string, name: string): ArtistResolutionResult => ({
    index: 0,
    name,
    status: "existing",
    artist: { id, name },
    candidates: [],
  });
  const lineupState: LineupCellState = {
    draft: "",
    draftStatus: "idle",
    itemStatus: {},
    draftError: null,
    itemResolution: {
      "artist-1": resolution(ids.metallica, "Metallica"),
      "artist-2": resolution(ids.gojira, "Gojira"),
    },
  };
  const input: LineupExpansionPreparationInput = {
    conflict,
    currentRow: row,
    lineupState,
    currentRevision: 4,
  };
  return { conflict, row, lineupState, input };
}

function uuidSequence(...values: string[]): ExpansionUuidFactory {
  let index = 0;
  return () => values[index++] ?? "77777777-7777-4777-8777-777777777777";
}

describe("event lineup expansion preparation", () => {
  it("builds the CON-B04e DTO with route destination separated from the payload", () => {
    const data = fixture();
    const prepared = createEventLineupExpansionPreparer(uuidSequence(ids.gojira)).prepare(
      data.input
    );
    expect(prepared.state).toBe("ready");
    if (prepared.state !== "ready") return;
    expect(prepared.snapshot.eventId).toBe(ids.event);
    expect(prepared.snapshot.operation).toEqual({ batchId: ids.batch, rowId: ids.gojira });
    expect(prepared.snapshot.payload).toEqual({
      batchId: ids.batch,
      rowId: ids.gojira,
      sourceRow: {
        rowId: ids.gojira,
        type: "concert",
        lineup: [
          { name: "Metallica", artistId: ids.metallica },
          { name: "Gojira", artistId: ids.gojira },
        ],
        startDate: "2027-05-15",
        city: "Madrid",
        venue: "Sala",
        countryId: ids.country,
      },
      artists: [{ name: "Gojira", artistId: ids.gojira }],
    });
    expect(prepared.snapshot.payload.sourceRow.rowId).toBe(prepared.snapshot.payload.rowId);
    expect(prepared.snapshot.payload).not.toHaveProperty("eventId");
    expect(prepared.snapshot.payload.sourceRow).not.toHaveProperty("localityId");
    expect(prepared.snapshot.payload.sourceRow).not.toHaveProperty("venueId");
  });

  it("keeps the same expansion identity on an identical retry and freezes the snapshot", () => {
    const data = fixture();
    const preparer = createEventLineupExpansionPreparer(uuidSequence(ids.gojira));
    const first = preparer.prepare(data.input);
    const retry = preparer.prepare(data.input);
    expect(first.state).toBe("ready");
    expect(retry.state).toBe("ready");
    if (first.state !== "ready" || retry.state !== "ready") return;
    expect(first.snapshot).toBe(retry.snapshot);
    if (first.state !== "ready") return;
    expect(Object.isFrozen(first.snapshot)).toBe(true);
    expect(Object.isFrozen(first.snapshot.payload.sourceRow.lineup)).toBe(true);
    expect(() => (first.snapshot.payload.artists as unknown[]).push({ name: "other" })).toThrow();
  });

  it("changes identity when event or artist semantics change", () => {
    const data = fixture();
    const preparer = createEventLineupExpansionPreparer(
      uuidSequence(ids.gojira, ids.metallica, ids.operationRow)
    );
    const first = preparer.prepare(data.input);
    const changedEvent = {
      ...data.input,
      conflict: {
        ...data.conflict,
        existingEventIds: [ids.metallica],
        candidateEventIds: [ids.metallica],
      },
    };
    const second = preparer.prepare(changedEvent);
    expect(first.state).toBe("ready");
    expect(second.state).toBe("ready");
    if (first.state === "ready" && second.state === "ready")
      expect(second.snapshot.operation.rowId).not.toBe(first.snapshot.operation.rowId);
  });

  it("does not pick among destinations and rejects missing or invalid UUIDs", () => {
    const data = fixture();
    const prep = createEventLineupExpansionPreparer(uuidSequence(ids.gojira));
    expect(
      prep.prepare({
        ...data.input,
        conflict: { ...data.conflict, existingEventIds: [ids.event, ids.metallica] },
      })
    ).toMatchObject({ state: "pending", pendingReasons: ["event-target-ambiguous"] });
    expect(
      prep.prepare({
        ...data.input,
        conflict: {
          ...data.conflict,
          existingEventIds: [],
          candidateEventIds: [ids.event, ids.metallica],
        },
      })
    ).toMatchObject({ state: "pending", pendingReasons: ["event-target-ambiguous"] });
    expect(
      prep.prepare({
        ...data.input,
        conflict: {
          ...data.conflict,
          existingEventIds: [],
          candidateEventIds: [ids.event, ids.metallica],
        },
        selectedEventId: ids.metallica,
      })
    ).toMatchObject({ state: "ready" });
    expect(
      prep.prepare({
        ...data.input,
        conflict: { ...data.conflict, existingEventIds: [], candidateEventIds: [] },
      })
    ).toMatchObject({ state: "pending", pendingReasons: ["event-target-missing"] });
    expect(
      prep.prepare({
        ...data.input,
        conflict: { ...data.conflict, existingEventIds: ["not-a-uuid"] },
      })
    ).toMatchObject({ state: "pending", pendingReasons: ["event-target-invalid"] });
  });

  it("keeps stale, discarded, created, and uncertain creation results from authorizing expansion", () => {
    const data = fixture();
    const prep = createEventLineupExpansionPreparer(uuidSequence(ids.gojira));
    expect(
      prep.prepare({ ...data.input, conflict: { ...data.conflict, status: "historical" } }).state
    ).toBe("obsolete");
    expect(prep.prepare({ ...data.input, currentRow: undefined })).toMatchObject({
      state: "pending",
      pendingReasons: ["row-discarded"],
    });
    expect(prep.prepare({ ...data.input, rowCreated: true })).toMatchObject({
      state: "pending",
      pendingReasons: ["row-created"],
    });
    expect(prep.prepare({ ...data.input, creationUncertain: true })).toMatchObject({
      state: "pending",
      pendingReasons: ["creation-operation-uncertain"],
    });
    expect(prep.prepare({ ...data.input, currentRevision: 5 })).toMatchObject({
      state: "pending",
      pendingReasons: ["source-row-changed"],
    });
  });

  it("blocks unresolved or text-only artist identities and retains the editor order", () => {
    const data = fixture();
    const prep = createEventLineupExpansionPreparer(uuidSequence(ids.gojira));
    const ambiguous = {
      ...data.lineupState,
      itemResolution: {
        ...data.lineupState.itemResolution,
        "artist-2": {
          index: 1,
          name: "Gojira",
          status: "ambiguous" as const,
          code: "ARTIST_AMBIGUOUS" as const,
          artist: null,
          candidates: [{ id: ids.gojira, name: "Gojira" }] as [{ id: string; name: string }],
        },
      },
    };
    const unresolvedSnapshot = data.conflict.snapshot.lineup?.map((artist) => ({ ...artist }));
    if (!unresolvedSnapshot) throw new Error("fixture lineup missing");
    delete unresolvedSnapshot[1]!.artistId;
    expect(
      prep.prepare({
        ...data.input,
        lineupState: ambiguous,
        conflict: {
          ...data.conflict,
          snapshot: { ...data.conflict.snapshot, lineup: unresolvedSnapshot },
        },
      })
    ).toMatchObject({ state: "pending", pendingReasons: ["artist-ambiguous"] });
    const uncertain = { ...data.conflict, addableArtists: [{ artistId: null, name: "Gojira" }] };
    expect(prep.prepare({ ...data.input, conflict: uncertain })).toMatchObject({
      state: "pending",
      pendingReasons: ["artist-identity-uncertain"],
    });
    const reversed = {
      ...data.input,
      currentRow: { ...data.row, lineup: [...data.row.lineup].reverse() },
    };
    expect(prep.prepare(reversed)).toMatchObject({
      state: "pending",
      pendingReasons: ["source-row-changed"],
    });
  });

  it("keeps a new artist name-only when backend revalidation can resolve it", () => {
    const data = fixture();
    const sourceLineup = data.conflict.snapshot.lineup?.map((artist) => ({ ...artist }));
    if (!sourceLineup) throw new Error("fixture lineup missing");
    delete sourceLineup[1]!.artistId;
    const row = {
      ...data.row,
      lineup: data.row.lineup.map((item, index) =>
        index === 1 ? { ...item, artistId: null } : item
      ),
    };
    const state: LineupCellState = {
      ...data.lineupState,
      itemResolution: {
        ...data.lineupState.itemResolution,
        "artist-2": { index: 1, name: "Gojira", status: "new", artist: null, candidates: [] },
      },
    };
    const prepared = createEventLineupExpansionPreparer(uuidSequence(ids.operationRow)).prepare({
      ...data.input,
      currentRow: row,
      lineupState: state,
      conflict: {
        ...data.conflict,
        snapshot: { ...data.conflict.snapshot, lineup: sourceLineup },
        addableArtists: [{ artistId: null, name: "Gojira" }],
      },
    });
    expect(prepared.state).toBe("ready");
    if (prepared.state === "ready") {
      expect(prepared.snapshot.payload.sourceRow.lineup?.[1]).toEqual({ name: "Gojira" });
      expect(prepared.snapshot.payload.artists).toEqual([{ name: "Gojira" }]);
    }
    expect(
      createEventLineupExpansionPreparer(uuidSequence(ids.operationRow)).prepare({
        ...data.input,
        currentRow: row,
        lineupState: state,
        conflict: {
          ...data.conflict,
          snapshot: { ...data.conflict.snapshot, lineup: sourceLineup },
          addableArtists: [{ artistId: ids.gojira, name: "Gojira" }],
        },
      })
    ).toMatchObject({ state: "pending", pendingReasons: ["artist-identity-uncertain"] });
  });

  it("carries a deliberately selected existing Artist identity in the expansion request", () => {
    const data = fixture();
    const sourceLineup = data.conflict.snapshot.lineup?.map((artist) => ({ ...artist }));
    if (!sourceLineup) throw new Error("fixture lineup missing");
    delete sourceLineup[1]!.artistId;
    const row = {
      ...data.row,
      lineup: data.row.lineup.map((item, index) =>
        index === 1 ? { ...item, artistId: null } : item
      ),
    };
    const state: LineupCellState = {
      ...data.lineupState,
      itemResolution: {
        ...data.lineupState.itemResolution,
        "artist-2": {
          index: 1,
          name: "Gojira",
          status: "existing",
          artist: { id: ids.gojira, name: "Gojira" },
          candidates: [],
        },
      },
    };
    const prepared = createEventLineupExpansionPreparer(uuidSequence(ids.operationRow)).prepare({
      ...data.input,
      currentRow: row,
      lineupState: state,
      conflict: {
        ...data.conflict,
        snapshot: { ...data.conflict.snapshot, lineup: sourceLineup },
      },
    });
    expect(prepared.state).toBe("ready");
    if (prepared.state === "ready") {
      expect(prepared.snapshot.payload.sourceRow.lineup?.[1]).toEqual({ name: "Gojira" });
      expect(prepared.snapshot.payload.artists).toEqual([{ name: "Gojira", artistId: ids.gojira }]);
    }
  });

  it("does not create empty proposals and supports festival and tour rows as a single event", () => {
    const data = fixture();
    const prep = createEventLineupExpansionPreparer(uuidSequence(ids.gojira, ids.metallica));
    expect(
      prep.prepare({ ...data.input, conflict: { ...data.conflict, addableArtists: [] } }).state
    ).toBe("inapplicable");
    expect(
      prep.prepare({
        ...data.input,
        conflict: { ...data.conflict, code: "CONCERT_FESTIVAL_PARTICIPATION_CONFLICT" },
      })
    ).toMatchObject({ state: "pending", pendingReasons: ["conflict-not-expandable"] });
    for (const type of ["festival", "tour"] as const) {
      const value = fixture(type);
      expect(prep.prepare(value.input).state).toBe("ready");
    }
  });
});
