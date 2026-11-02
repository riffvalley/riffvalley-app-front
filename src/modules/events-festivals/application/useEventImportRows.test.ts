import { effectScope, type EffectScope } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ArtistResolutionResult } from "../api/artistResolution";
import { useEventImportRows } from "./useEventImportRows";

const { resolveArtistsBatchMock, searchVenueNamesMock } = vi.hoisted(() => ({
  resolveArtistsBatchMock: vi.fn(),
  searchVenueNamesMock: vi.fn(),
}));
vi.mock("../api/artistResolution", () => ({ resolveArtistsBatch: resolveArtistsBatchMock }));
vi.mock("@/modules/venues", () => ({ searchVenueNames: searchVenueNamesMock }));

function resultsFor(names: string[]): ArtistResolutionResult[] {
  return names.map((name) => ({
    name,
    artist: name.toLowerCase().includes("unknown")
      ? null
      : { id: `id-${name}`, name: `${name} Canonical` },
  }));
}

async function flushPromises() {
  for (let index = 0; index < 12; index += 1) await Promise.resolve();
}

function venue(name: string, id: string, city: string, province: string | null) {
  return {
    id,
    name,
    locality: {
      id: `locality-${id}`,
      name: city,
      province,
      administrativeRegion: {
        id: "region-1",
        name: "Región",
        country: { id: "country-1", name: "España" },
      },
    },
  };
}

describe("useEventImportRows lineup resolution", () => {
  let scope: EffectScope;
  let model: ReturnType<typeof useEventImportRows>;

  beforeEach(() => {
    vi.useFakeTimers();
    resolveArtistsBatchMock
      .mockReset()
      .mockImplementation(async (names: string[]) => resultsFor(names));
    searchVenueNamesMock.mockReset().mockResolvedValue([]);
    scope = effectScope();
    scope.run(() => {
      model = useEventImportRows();
    });
  });

  afterEach(() => {
    scope.stop();
    vi.useRealTimers();
  });

  it("defaults rows to concerts and updates Type without changing other row data", () => {
    const first = model.rows.value[0]!;
    const second = model.rows.value[1]!;
    first.event = "Concierto A";
    first.price = "20€";
    model.updateType(first.id, "festival");

    expect(first.type).toBe("festival");
    expect(second.type).toBe("concert");
    expect(first.event).toBe("Concierto A");
    expect(first.price).toBe("20€");

    model.addRow();
    expect(model.rows.value.at(-1)?.type).toBe("concert");
    model.removeRow(second.id);
    expect(model.rows.value).not.toContain(second);
    expect(first.type).toBe("festival");
  });

  it("debounces text, resolves found artists to IDs, and retains unknown names in order", async () => {
    const row = model.rows.value[0]!;
    model.updateEvent(row.id, "Resurrection Fest 2027");
    model.updateLineupDraft(row.id, "  Architects + Spiritbox + Banda Unknown  ");

    await vi.advanceTimersByTimeAsync(449);
    expect(resolveArtistsBatchMock).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);

    expect(resolveArtistsBatchMock).toHaveBeenCalledWith(
      ["Architects", "Spiritbox", "Banda Unknown"],
      expect.any(AbortSignal)
    );
    expect(row.event).toBe("Resurrection Fest 2027");
    expect(row.lineup).toEqual([
      { key: "lineup-item-1", name: "Architects Canonical", artistId: "id-Architects" },
      { key: "lineup-item-2", name: "Spiritbox Canonical", artistId: "id-Spiritbox" },
      { key: "lineup-item-3", name: "Banda Unknown", artistId: null },
    ]);
    expect(model.lineupStates[row.id]?.draft).toBe("");
  });

  it("splits requests into batches of at most 100 names", async () => {
    const row = model.rows.value[0]!;
    const names = Array.from({ length: 205 }, (_, index) => `Artist ${index}`);
    model.updateLineupDraft(row.id, names.join(" + "));
    model.commitLineupDraft(row.id);
    await flushPromises();

    expect(resolveArtistsBatchMock.mock.calls.map(([batch]) => (batch as string[]).length)).toEqual(
      [100, 100, 5]
    );
    expect(row.lineup).toHaveLength(205);
  });

  it("re-resolves an edited artist after immediately clearing its old ID", async () => {
    const row = model.rows.value[0]!;
    model.updateLineupDraft(row.id, "Architects");
    model.commitLineupDraft(row.id);
    await flushPromises();

    const item = row.lineup[0]!;
    expect(item.artistId).toBe("id-Architects");
    model.updateLineupItemName(row.id, item.key, " Spiritbox ");
    expect(item.artistId).toBeNull();
    model.commitLineupItemName(row.id, item.key);
    await flushPromises();

    expect(resolveArtistsBatchMock).toHaveBeenLastCalledWith(
      ["Spiritbox"],
      expect.any(AbortSignal)
    );
    expect(item).toMatchObject({ name: "Spiritbox Canonical", artistId: "id-Spiritbox" });
  });

  it("retries network errors without dropping the draft", async () => {
    const row = model.rows.value[0]!;
    resolveArtistsBatchMock
      .mockRejectedValueOnce(new Error("Network error"))
      .mockImplementationOnce(async (names: string[]) => resultsFor(names));
    model.updateLineupDraft(row.id, "Architects + Spiritbox");
    await vi.advanceTimersByTimeAsync(450);
    await flushPromises();

    expect(model.lineupStates[row.id]).toMatchObject({
      draft: "Architects + Spiritbox",
      draftStatus: "error",
    });
    expect(row.lineup).toEqual([]);

    model.retryLineupDraft(row.id);
    await flushPromises();
    expect(row.lineup.map(({ name }) => name)).toEqual([
      "Architects Canonical",
      "Spiritbox Canonical",
    ]);
    expect(model.lineupStates[row.id]?.draft).toBe("");
  });

  it("ignores an older response when the draft changes while it is pending", async () => {
    const row = model.rows.value[0]!;
    let resolveOld!: (results: ArtistResolutionResult[]) => void;
    resolveArtistsBatchMock
      .mockImplementationOnce(
        () => new Promise<ArtistResolutionResult[]>((resolve) => (resolveOld = resolve))
      )
      .mockImplementationOnce(async (names: string[]) => resultsFor(names));

    model.updateLineupDraft(row.id, "Old Band");
    model.commitLineupDraft(row.id);
    const oldSignal = resolveArtistsBatchMock.mock.calls[0]?.[1] as AbortSignal;
    model.updateLineupDraft(row.id, "New Band");
    expect(oldSignal.aborted).toBe(true);
    model.commitLineupDraft(row.id);
    await flushPromises();
    resolveOld(resultsFor(["Old Band"]));
    await flushPromises();

    expect(row.lineup).toEqual([
      { key: "lineup-item-1", name: "New Band Canonical", artistId: "id-New Band" },
    ]);
  });

  it("keeps rows independent and removes individual lineup items", async () => {
    const first = model.rows.value[0]!;
    const second = model.rows.value[1]!;
    model.updateLineupDraft(first.id, "Architects");
    model.updateLineupDraft(second.id, "Spiritbox");
    model.commitLineupDraft(first.id);
    model.commitLineupDraft(second.id);
    await flushPromises();

    expect(first.lineup[0]?.artistId).toBe("id-Architects");
    expect(second.lineup[0]?.artistId).toBe("id-Spiritbox");
    model.removeLineupItem(first.id, first.lineup[0]!.key);
    expect(first.lineup).toEqual([]);
    expect(second.lineup).toHaveLength(1);
  });

  it("aborts in-flight work when the editor scope is disposed", async () => {
    const row = model.rows.value[0]!;
    let resolvePending!: (results: ArtistResolutionResult[]) => void;
    resolveArtistsBatchMock.mockImplementationOnce(
      () => new Promise<ArtistResolutionResult[]>((resolve) => (resolvePending = resolve))
    );
    model.updateLineupDraft(row.id, "Architects");
    model.commitLineupDraft(row.id);
    const signal = resolveArtistsBatchMock.mock.calls[0]?.[1] as AbortSignal;

    scope.stop();
    expect(signal.aborted).toBe(true);
    resolvePending(resultsFor(["Architects"]));
    await flushPromises();
    expect(row.lineup).toEqual([]);
  });

  it("resolves a unique exact venue and fills canonical locality and province", async () => {
    searchVenueNamesMock.mockResolvedValue([
      venue("Sala Razzmatazz", "venue-1", "Barcelona", "Barcelona"),
    ]);
    const row = model.rows.value[0]!;
    model.updateVenue(row.id, "  sala   razzmatazz ");
    await vi.advanceTimersByTimeAsync(449);
    expect(searchVenueNamesMock).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await flushPromises();

    expect(searchVenueNamesMock).toHaveBeenCalledWith("sala   razzmatazz");
    expect(row.venue).toEqual({
      name: "Sala Razzmatazz",
      venueId: "venue-1",
      localityId: "locality-venue-1",
    });
    expect(row.city).toBe("Barcelona");
    expect(row.province).toBe("Barcelona");
  });

  it("leaves Province empty when Locality has no registered province", async () => {
    searchVenueNamesMock.mockResolvedValue([venue("Sala Norte", "venue-north", "Santander", null)]);
    const row = model.rows.value[0]!;
    model.updateVenue(row.id, "Sala Norte");
    model.commitVenue(row.id);
    await flushPromises();

    expect(row.city).toBe("Santander");
    expect(row.province).toBe("");
  });

  it("keeps unknown venue names editable and retries after a network error", async () => {
    searchVenueNamesMock
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce([venue("Sala desconocida Norte", "near-match", "Santander", null)]);
    const row = model.rows.value[0]!;
    model.updateVenue(row.id, "Sala desconocida");
    await vi.advanceTimersByTimeAsync(450);
    await flushPromises();
    expect(model.venueStates[row.id]).toBe("error");
    expect(row.venue).toMatchObject({ name: "Sala desconocida", venueId: null, localityId: null });

    model.retryVenue(row.id);
    await flushPromises();
    expect(model.venueStates[row.id]).toBe("idle");
    expect(row.venue.name).toBe("Sala desconocida");
    expect(row.venue.venueId).toBeNull();
  });

  it("keeps homonyms ambiguous, then resolves with the typed city", async () => {
    searchVenueNamesMock.mockResolvedValue([
      venue("Sala Apolo", "barcelona", "Barcelona", "Barcelona"),
      venue("Sala Apolo", "madrid", "Madrid", "Madrid"),
    ]);
    const row = model.rows.value[0]!;
    model.updateVenue(row.id, "Sala Apolo");
    await vi.advanceTimersByTimeAsync(450);
    await flushPromises();
    expect(model.venueStates[row.id]).toBe("ambiguous");
    expect(row.venue.venueId).toBeNull();

    model.updateCity(row.id, "Madrid");
    await vi.advanceTimersByTimeAsync(450);
    await flushPromises();
    expect(row.venue.venueId).toBe("madrid");
    expect(row.city).toBe("Madrid");
  });

  it("also uses Province as context when resolving homonyms", async () => {
    searchVenueNamesMock.mockResolvedValue([
      venue("Sala Centro", "leon", "León", "León"),
      venue("Sala Centro", "sevilla", "Sevilla", "Sevilla"),
    ]);
    const row = model.rows.value[0]!;
    model.updateProvince(row.id, "Sevilla");
    model.updateVenue(row.id, "Sala Centro");
    model.commitVenue(row.id);
    await flushPromises();

    expect(row.venue.venueId).toBe("sevilla");
    expect(row.city).toBe("Sevilla");
    expect(row.province).toBe("Sevilla");
  });

  it("invalidates a recognized venue on name or incompatible geography edits", async () => {
    searchVenueNamesMock.mockResolvedValue([
      venue("Sala Apolo", "venue-apolo", "Madrid", "Madrid"),
    ]);
    const row = model.rows.value[0]!;
    model.updateVenue(row.id, "Sala Apolo");
    model.commitVenue(row.id);
    await flushPromises();
    expect(row.venue.venueId).toBe("venue-apolo");

    model.updateVenue(row.id, "Sala Nueva");
    expect(row.venue.venueId).toBeNull();
    expect(row.venue.localityId).toBeNull();
    expect(row.city).toBe("Madrid");
    model.updateCity(row.id, "Sevilla");
    expect(row.venue.venueId).toBeNull();
    expect(row.venue.localityId).toBeNull();
    expect(row.city).toBe("Sevilla");
  });

  it("clearing Venue preserves manually entered city and province", () => {
    const row = model.rows.value[0]!;
    model.updateCity(row.id, "Bilbao");
    model.updateProvince(row.id, "Bizkaia");
    model.updateVenue(row.id, "Sala manual");
    model.updateVenue(row.id, "");

    expect(row.venue).toEqual({ name: "", venueId: null, localityId: null });
    expect(row.city).toBe("Bilbao");
    expect(row.province).toBe("Bizkaia");
  });

  it("deduplicates venue searches across rows and ignores obsolete responses", async () => {
    let resolveOld!: (matches: ReturnType<typeof venue>[]) => void;
    searchVenueNamesMock.mockImplementation((name: string) =>
      name === "Sala Uno"
        ? new Promise((resolve) => (resolveOld = resolve))
        : Promise.resolve([venue("Sala Dos", "dos", "Valencia", null)])
    );
    const first = model.rows.value[0]!;
    const second = model.rows.value[1]!;
    model.updateVenue(first.id, "Sala Uno");
    model.updateVenue(second.id, "Sala Uno");
    model.commitVenue(first.id);
    model.commitVenue(second.id);
    expect(searchVenueNamesMock).toHaveBeenCalledTimes(1);
    model.updateVenue(first.id, "Sala Dos");
    model.commitVenue(first.id);
    await flushPromises();
    resolveOld([venue("Sala Uno", "uno", "Valencia", null)]);
    await flushPromises();
    expect(first.venue.venueId).toBe("dos");
    expect(second.venue.venueId).toBe("uno");
    expect(first.venue.name).toBe("Sala Dos");
  });
});
