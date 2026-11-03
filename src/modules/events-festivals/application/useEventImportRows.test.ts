import { effectScope, type EffectScope } from "vue";
import { QueryClient } from "@tanstack/vue-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ArtistResolutionResult } from "../api/artistResolution";
import { entityResolutionQueryKeys } from "./entityResolutionQueries";
import { useEventImportRows } from "./useEventImportRows";

const {
  resolveArtistsBatchMock,
  searchVenueNamesMock,
  inspectLocalitiesMock,
  inspectToursMock,
  resolveVenuesMock,
} = vi.hoisted(() => ({
  resolveArtistsBatchMock: vi.fn(),
  searchVenueNamesMock: vi.fn(),
  inspectLocalitiesMock: vi.fn(),
  inspectToursMock: vi.fn(),
  resolveVenuesMock: vi.fn(),
}));
vi.mock("../api/artistResolution", () => ({ resolveArtistsBatch: resolveArtistsBatchMock }));
vi.mock("../api/entityResolution", () => ({
  inspectLocalitiesBatch: inspectLocalitiesMock,
  inspectToursBatch: inspectToursMock,
}));
vi.mock("@/modules/venues", () => ({ resolveVenueBatch: resolveVenuesMock }));

function resultsFor(names: string[]): ArtistResolutionResult[] {
  return names.map((name, index): ArtistResolutionResult => {
    if (name.toLowerCase().includes("unknown")) {
      return { index, name, status: "new", artist: null, candidates: [] };
    }
    return {
      index,
      name,
      status: "existing",
      artist: { id: `id-${name}`, name: `${name} Canonical` },
      candidates: [],
    };
  });
}

async function flushPromises() {
  for (let index = 0; index < 12; index += 1) await Promise.resolve();
}

describe("useEventImportRows lineup resolution", () => {
  let scope: EffectScope;
  let model: ReturnType<typeof useEventImportRows>;
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.useFakeTimers();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    resolveArtistsBatchMock
      .mockReset()
      .mockImplementation(async (names: string[]) => resultsFor(names));
    searchVenueNamesMock.mockReset().mockResolvedValue([]);
    inspectLocalitiesMock.mockReset().mockImplementation(
      async ({
        localities,
      }: {
        localities: Array<{
          name: string;
          countryId: string;
          province?: string;
          administrativeRegionId?: string;
        }>;
      }) => ({
        results: localities.map((input, index) => ({
          index,
          input,
          status: "existing",
          locality: {
            id: `locality-${input.countryId}-${input.name}-${input.province ?? ""}`,
            name: input.name,
            province: input.province ?? null,
            country: { id: input.countryId, name: "España" },
            administrativeRegion: { id: "region-1", name: "Región" },
          },
          candidates: [],
        })),
      })
    );
    inspectToursMock.mockReset().mockImplementation(async ({ names }: { names: string[] }) => ({
      results: names.map((name, index) => ({
        index,
        name,
        status: "new",
        candidates: [],
      })),
    }));
    resolveVenuesMock
      .mockReset()
      .mockImplementation(async (inputs: Array<{ name: string; localityId: string }>) =>
        inputs.map((input, index) => ({
          index,
          ...input,
          status: "existing",
          venue: { id: `venue-${input.name}`, name: input.name },
          candidates: [{ id: `venue-${input.name}`, name: input.name }],
        }))
      );
    scope = effectScope();
    scope.run(() => {
      model = useEventImportRows(queryClient);
      model.invalidateGeographicAssociations("country-ES");
    });
  });

  afterEach(() => {
    scope.stop();
    queryClient.clear();
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

  it("sets the total row count while preserving retained rows and cleaning removed state", () => {
    const retainedIds = model.rows.value.slice(0, 3).map(({ id }) => id);
    const removedRow = model.rows.value[4]!;
    model.updateLineupDraft(removedRow.id, "Temporary Artist");

    expect(model.setRowCount(7)).toBe(true);
    expect(model.rows.value).toHaveLength(7);
    expect(model.rows.value.at(-1)?.type).toBe("concert");

    expect(model.setRowCount(3)).toBe(true);
    expect(model.rows.value.map(({ id }) => id)).toEqual(retainedIds);
    expect(model.lineupStates[removedRow.id]).toBeUndefined();
    expect(model.setRowCount(2.5)).toBe(false);
    expect(model.setRowCount(-1)).toBe(false);
    expect(model.rows.value).toHaveLength(3);
  });

  it("invalidates geographic associations and ignores a stale locality response", async () => {
    let resolveInspection!: (response: unknown) => void;
    inspectLocalitiesMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveInspection = resolve;
        })
    );
    const row = model.rows.value[0]!;
    row.event = "Festival";
    row.price = "25€";
    row.otherInfo = "Puertas 19:00";
    model.updateCity(row.id, "Madrid");
    model.updateProvince(row.id, "Comunidad de Madrid");
    await vi.advanceTimersByTimeAsync(900);
    model.invalidateGeographicAssociations("country-PT");
    resolveInspection({
      results: [
        {
          index: 0,
          input: { name: "Madrid", countryId: "country-ES" },
          status: "existing",
          locality: {
            id: "late",
            name: "Madrid",
            province: "Madrid",
            country: { id: "country-ES", name: "España" },
            administrativeRegion: { id: "region", name: "Región" },
          },
          candidates: [],
        },
      ],
    });
    await flushPromises();

    expect(row.venue).toMatchObject({ name: "", venueId: null, localityId: null });
    expect(row.city).toBe("Madrid");
    expect(row.province).toBe("Comunidad de Madrid");
    expect(row.event).toBe("Festival");
    expect(row.price).toBe("25€");
    expect(row.otherInfo).toBe("Puertas 19:00");
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
      { key: "lineup-item-1", name: "Architects", artistId: "id-Architects" },
      { key: "lineup-item-2", name: "Spiritbox", artistId: "id-Spiritbox" },
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
    expect(item).toMatchObject({ name: "Spiritbox", artistId: "id-Spiritbox" });
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
      draftError: "Network error",
    });
    expect(row.lineup).toEqual([]);

    model.retryLineupDraft(row.id);
    await flushPromises();
    expect(row.lineup.map(({ name }) => name)).toEqual(["Architects", "Spiritbox"]);
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
    model.updateLineupDraft(row.id, "New Band");
    model.commitLineupDraft(row.id);
    await flushPromises();
    resolveOld(resultsFor(["Old Band"]));
    await flushPromises();

    expect(row.lineup).toEqual([
      { key: "lineup-item-1", name: "New Band", artistId: "id-New Band" },
    ]);
  });

  it("shares an in-flight artist request across rows and a later debounce window", async () => {
    let resolveRequest!: (results: ArtistResolutionResult[]) => void;
    resolveArtistsBatchMock.mockImplementationOnce(
      () => new Promise<ArtistResolutionResult[]>((resolve) => (resolveRequest = resolve))
    );
    const rows = model.rows.value.slice(0, 20);
    rows.forEach((row) => model.updateLineupDraft(row.id, "Septicflesh"));
    await vi.advanceTimersByTimeAsync(450);
    expect(resolveArtistsBatchMock).toHaveBeenCalledTimes(1);
    expect(resolveArtistsBatchMock.mock.calls[0]?.[0]).toEqual(["Septicflesh"]);

    model.addRow();
    const laterRow = model.rows.value.at(-1)!;
    model.updateLineupDraft(laterRow.id, "Septicflesh");
    await vi.advanceTimersByTimeAsync(450);
    expect(resolveArtistsBatchMock).toHaveBeenCalledTimes(1);
    resolveRequest(resultsFor(["Septicflesh"]));
    await flushPromises();

    expect(rows.every((row) => row.lineup[0]?.artistId === "id-Septicflesh")).toBe(true);
    expect(laterRow.lineup[0]?.artistId).toBe("id-Septicflesh");
  });

  it("groups unique artists across rows and reuses fresh Query results", async () => {
    const first = model.rows.value[0]!;
    const second = model.rows.value[1]!;
    model.updateLineupDraft(first.id, "Septicflesh + Equilibrium");
    model.updateLineupDraft(second.id, "Septicflesh + Fleshgod Apocalypse");
    await vi.advanceTimersByTimeAsync(450);
    await flushPromises();

    expect(resolveArtistsBatchMock).toHaveBeenCalledTimes(1);
    expect(resolveArtistsBatchMock.mock.calls[0]?.[0]).toEqual([
      "Septicflesh",
      "Equilibrium",
      "Fleshgod Apocalypse",
    ]);
    expect(first.lineup.map(({ name }) => name)).toEqual(["Septicflesh", "Equilibrium"]);

    const third = model.rows.value[2]!;
    model.updateLineupDraft(third.id, "Septicflesh");
    await vi.advanceTimersByTimeAsync(450);
    await flushPromises();
    expect(resolveArtistsBatchMock).toHaveBeenCalledTimes(1);
  });

  it("queries again after the 15 second Query freshness window expires", async () => {
    const first = model.rows.value[0]!;
    model.updateLineupDraft(first.id, "Septicflesh");
    await vi.advanceTimersByTimeAsync(450);
    await flushPromises();
    expect(resolveArtistsBatchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(15_001);
    const second = model.rows.value[1]!;
    model.updateLineupDraft(second.id, "Septicflesh");
    await vi.advanceTimersByTimeAsync(450);
    await flushPromises();
    expect(resolveArtistsBatchMock).toHaveBeenCalledTimes(2);
  });

  it("does not resolve artists after unrelated row fields change", async () => {
    const row = model.rows.value[0]!;
    model.updateLineupDraft(row.id, "Septicflesh");
    await vi.advanceTimersByTimeAsync(450);
    await flushPromises();
    expect(resolveArtistsBatchMock).toHaveBeenCalledTimes(1);

    model.updateTextField(row.id, "price", "25 €");
    model.updateDate(row.id, "startDate", "12/06/2027");
    model.updateVenue(row.id, "Sala X");
    model.updateCity(row.id, "Madrid");
    model.updateProvince(row.id, "Madrid");
    model.updateEvent(row.id, "Festival");
    model.updateType(row.id, "festival");
    await vi.advanceTimersByTimeAsync(450);
    await flushPromises();

    expect(resolveArtistsBatchMock).toHaveBeenCalledTimes(1);
  });

  it("does not restore a removed row when its artist request completes", async () => {
    let resolveRequest!: (results: ArtistResolutionResult[]) => void;
    resolveArtistsBatchMock.mockImplementationOnce(
      () => new Promise<ArtistResolutionResult[]>((resolve) => (resolveRequest = resolve))
    );
    const row = model.rows.value[0]!;
    model.updateLineupDraft(row.id, "Septicflesh");
    model.commitLineupDraft(row.id);
    expect(resolveArtistsBatchMock).toHaveBeenCalledTimes(1);

    model.removeRow(row.id);
    resolveRequest(resultsFor(["Septicflesh"]));
    await flushPromises();
    expect(model.rows.value).not.toContain(row);
    expect(model.lineupStates[row.id]).toBeUndefined();
  });

  it("keeps a cancelled lookup retryable without treating it as a missing artist", async () => {
    let requestStarted!: () => void;
    const started = new Promise<void>((resolve) => (requestStarted = resolve));
    resolveArtistsBatchMock.mockImplementationOnce(
      async (_names: string[], signal: AbortSignal) => {
        requestStarted();
        return new Promise<ArtistResolutionResult[]>((_resolve, reject) => {
          signal.addEventListener(
            "abort",
            () => reject(new DOMException("Cancelled", "AbortError")),
            { once: true }
          );
        });
      }
    );
    const row = model.rows.value[0]!;
    model.updateLineupDraft(row.id, "Septicflesh");
    model.commitLineupDraft(row.id);
    await started;
    await queryClient.cancelQueries({
      queryKey: entityResolutionQueryKeys.artists(["Septicflesh"]),
      exact: true,
    });
    await flushPromises();

    expect(row.lineup).toEqual([]);
    expect(model.lineupStates[row.id]).toMatchObject({
      draft: "Septicflesh",
      draftStatus: "idle",
      draftError: null,
    });
  });

  it("retains explicit ambiguous and invalid statuses without assigning IDs", async () => {
    resolveArtistsBatchMock.mockImplementationOnce(async (names: string[]) => [
      {
        index: 0,
        name: names[0]!,
        status: "ambiguous",
        code: "ARTIST_AMBIGUOUS",
        artist: null,
        candidates: [
          { id: "candidate-a", name: "Candidate A" },
          { id: "candidate-b", name: "Candidate B" },
        ],
      },
      {
        index: 1,
        name: names[1]!,
        status: "invalid",
        code: "ARTIST_NAME_INVALID",
        artist: null,
        candidates: [],
      },
    ]);
    const row = model.rows.value[0]!;
    model.updateLineupDraft(row.id, "Ambiguous Artist + Invalid Artist");
    await vi.advanceTimersByTimeAsync(450);
    await flushPromises();

    expect(row.lineup).toEqual([
      { key: "lineup-item-1", name: "Ambiguous Artist", artistId: null },
      { key: "lineup-item-2", name: "Invalid Artist", artistId: null },
    ]);
    expect(model.lineupStates[row.id]?.itemResolution).toMatchObject({
      "lineup-item-1": {
        status: "ambiguous",
        candidates: [{ id: "candidate-a" }, { id: "candidate-b" }],
      },
      "lineup-item-2": { status: "invalid", code: "ARTIST_NAME_INVALID" },
    });
  });

  it("keeps an explicit Artist candidate with its appearance through formatting edits only", async () => {
    resolveArtistsBatchMock.mockResolvedValueOnce([
      {
        index: 0,
        name: "The Artist",
        status: "ambiguous",
        code: "ARTIST_AMBIGUOUS",
        artist: null,
        candidates: [
          { id: "artist-a", name: "The Artist" },
          { id: "artist-b", name: "The Artist" },
        ],
      },
    ]);
    const row = model.rows.value[0]!;
    model.updateLineupDraft(row.id, "The Artist");
    await vi.advanceTimersByTimeAsync(450);
    await flushPromises();
    const item = row.lineup[0]!;

    model.selectArtistCandidate(row.id, item.key, "artist-b");
    expect(item).toMatchObject({ name: "The Artist", artistId: "artist-b" });
    model.updateLineupItemName(row.id, item.key, " the   artist ");
    expect(item).toMatchObject({ name: " the   artist ", artistId: "artist-b" });
    expect(model.lineupStates[row.id]?.itemResolution[item.key]?.status).toBe("ambiguous");

    model.updateLineupItemName(row.id, item.key, "Different Artist");
    expect(item.artistId).toBeNull();
    expect(model.lineupStates[row.id]?.itemResolution[item.key]).toBeUndefined();
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

  it("ignores in-flight work when the editor scope is disposed", async () => {
    const row = model.rows.value[0]!;
    let resolvePending!: (results: ArtistResolutionResult[]) => void;
    resolveArtistsBatchMock.mockImplementationOnce(
      () => new Promise<ArtistResolutionResult[]>((resolve) => (resolvePending = resolve))
    );
    model.updateLineupDraft(row.id, "Architects");
    model.commitLineupDraft(row.id);
    scope.stop();
    resolvePending(resultsFor(["Architects"]));
    await flushPromises();
    expect(row.lineup).toEqual([]);
  });

  it("resolves Locality before the exact Venue inspector and preserves entered text", async () => {
    const row = model.rows.value[0]!;
    model.updateCity(row.id, "Barcelona");
    model.updateProvince(row.id, "Barcelona");
    model.updateVenue(row.id, "  Sala Razzmatazz  ");
    expect(resolveVenuesMock).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1350);
    await flushPromises();

    expect(inspectLocalitiesMock).toHaveBeenCalledTimes(1);
    expect(resolveVenuesMock).toHaveBeenCalledWith(
      [{ name: "  Sala Razzmatazz  ", localityId: expect.stringContaining("Barcelona") }],
      expect.anything()
    );
    expect(row.venue.name).toBe("  Sala Razzmatazz  ");
    expect(row.venue.venueId).toBe("venue-  Sala Razzmatazz  ");
    expect(row.city).toBe("Barcelona");
    expect(row.province).toBe("Barcelona");
    expect(searchVenueNamesMock).not.toHaveBeenCalled();
  });

  it("does not inspect a Venue when Locality is new or empty", async () => {
    inspectLocalitiesMock.mockResolvedValueOnce({
      results: [
        {
          index: 0,
          input: { name: "Newtown", countryId: "country-ES" },
          status: "new",
          requiresAdministrativeRegionId: true,
          candidates: [],
        },
      ],
    });
    const row = model.rows.value[0]!;
    model.updateCity(row.id, "Newtown");
    model.updateVenue(row.id, "Sala futura");
    await vi.advanceTimersByTimeAsync(900);
    await flushPromises();
    await vi.advanceTimersByTimeAsync(900);
    await flushPromises();
    await vi.advanceTimersByTimeAsync(450);
    await flushPromises();
    expect(model.geographyStates[row.id]?.localityStatus).toBe("new");
    expect(row.venue.localityId).toBeNull();
    expect(resolveVenuesMock).not.toHaveBeenCalled();
    model.updateVenue(row.id, "");
    expect(resolveVenuesMock).not.toHaveBeenCalled();
  });

  it("keeps new Locality pending for Venue until the required region is selected", async () => {
    inspectLocalitiesMock.mockResolvedValueOnce({
      results: [
        {
          index: 0,
          input: { name: "Newtown", countryId: "country-ES" },
          status: "new",
          requiresAdministrativeRegionId: true,
          candidates: [],
        },
      ],
    });
    const row = model.rows.value[0]!;
    model.updateCity(row.id, "Newtown");
    model.updateVenue(row.id, "Sala futura");
    await vi.advanceTimersByTimeAsync(900);
    await flushPromises();
    expect(row.venue.localityId).toBeNull();
    expect(resolveVenuesMock).not.toHaveBeenCalled();

    model.selectAdministrativeRegion(row.id, "region-galicia");
    await flushPromises();
    expect(row.administrativeRegionId).toBe("region-galicia");
    expect(inspectLocalitiesMock).toHaveBeenLastCalledWith(
      {
        localities: [
          { name: "Newtown", countryId: "country-ES", administrativeRegionId: "region-galicia" },
        ],
      },
      expect.anything()
    );
    expect(row.venue.localityId).toContain("Newtown");
  });

  it("keeps invalid locality and technical errors distinct, and retries technical failures", async () => {
    inspectLocalitiesMock.mockRejectedValueOnce(new Error("offline"));
    const row = model.rows.value[0]!;
    model.updateCity(row.id, "Madrid");
    await vi.advanceTimersByTimeAsync(900);
    await flushPromises();
    expect(model.geographyStates[row.id]?.localityStatus).toBe("error");
    expect(row.venue.localityId).toBeNull();
    model.retryLocality(row.id);
    await flushPromises();
    expect(model.geographyStates[row.id]?.localityStatus).toBe("existing");

    model.updateCity(row.id, "Unknown country");
    inspectLocalitiesMock.mockResolvedValueOnce({
      results: [
        {
          index: 0,
          input: { name: "Unknown country", countryId: "country-ES" },
          status: "invalid",
          code: "LOCALITY_COUNTRY_NOT_FOUND",
          candidates: [],
        },
      ],
    });
    await vi.advanceTimersByTimeAsync(900);
    await flushPromises();
    expect(model.geographyStates[row.id]?.localityStatus).toBe("invalid");
    expect(model.geographyStates[row.id]?.localityResult).toMatchObject({
      code: "LOCALITY_COUNTRY_NOT_FOUND",
    });
    expect(model.geographyStates[row.id]?.localityStatus).not.toBe("new");
  });

  it("preserves Venue new and ambiguous outcomes without assigning IDs", async () => {
    const row = model.rows.value[0]!;
    resolveVenuesMock.mockResolvedValueOnce([
      {
        index: 0,
        name: "Venue nuevo",
        localityId: "locality-country-ES-Bilbao-",
        status: "new",
        venue: null,
        candidates: [],
      },
    ]);
    model.updateCity(row.id, "Bilbao");
    model.updateVenue(row.id, "Venue nuevo");
    await vi.advanceTimersByTimeAsync(1350);
    await flushPromises();
    expect(model.geographyStates[row.id]?.venueStatus).toBe("new");
    expect(row.venue).toMatchObject({ name: "Venue nuevo", venueId: null });

    resolveVenuesMock.mockResolvedValueOnce([
      {
        index: 0,
        name: "Venue ambiguo",
        localityId: row.venue.localityId!,
        status: "ambiguous",
        code: "VENUE_AMBIGUOUS",
        venue: null,
        candidates: [
          { id: "v-a", name: "Venue ambiguo" },
          { id: "v-b", name: "Venue ambiguo" },
        ],
      },
    ]);
    model.updateVenue(row.id, "Venue ambiguo");
    await vi.advanceTimersByTimeAsync(450);
    await flushPromises();
    expect(model.geographyStates[row.id]?.venueCandidates).toHaveLength(2);
    expect(row.venue.venueId).toBeNull();
    model.selectVenueCandidate(row.id, "v-b");
    expect(row.venue).toMatchObject({ name: "Venue ambiguo", venueId: "v-b" });
    expect(model.geographyStates[row.id]?.selectedVenueCandidateId).toBe("v-b");
    model.selectVenueCandidate(row.id, "");
    expect(row.venue.venueId).toBeNull();
  });

  it("keeps Venue errors retryable without dropping the entered name", async () => {
    resolveVenuesMock.mockRejectedValueOnce(new Error("offline"));
    const row = model.rows.value[0]!;
    model.updateCity(row.id, "Logroño");
    model.updateVenue(row.id, "Sala retry");
    await vi.advanceTimersByTimeAsync(1350);
    await flushPromises();
    expect(model.geographyStates[row.id]?.venueStatus).toBe("error");
    expect(row.venue).toMatchObject({ name: "Sala retry", venueId: null });

    model.retryVenue(row.id);
    await flushPromises();
    expect(model.geographyStates[row.id]?.venueStatus).toBe("existing");
    expect(row.venue.name).toBe("Sala retry");
  });

  it("retains locality ambiguity candidates and only resolves Venue after explicit selection", async () => {
    const row = model.rows.value[0]!;
    inspectLocalitiesMock.mockResolvedValueOnce({
      results: [
        {
          index: 0,
          input: { name: "Santiago", countryId: "country-ES" },
          status: "ambiguous",
          code: "LOCALITY_AMBIGUOUS",
          candidates: [
            {
              id: "loc-a",
              name: "Santiago",
              province: "A Coruña",
              country: { id: "country-ES", name: "España" },
              administrativeRegion: { id: "galicia", name: "Galicia" },
            },
            {
              id: "loc-b",
              name: "Santiago",
              province: "Pontevedra",
              country: { id: "country-ES", name: "España" },
              administrativeRegion: { id: "galicia", name: "Galicia" },
            },
          ],
        },
      ],
    });
    model.updateCity(row.id, "Santiago");
    model.updateVenue(row.id, "Sala Uno");
    await vi.advanceTimersByTimeAsync(900);
    await flushPromises();
    expect(model.geographyStates[row.id]?.localityCandidates).toHaveLength(2);
    expect(resolveVenuesMock).not.toHaveBeenCalled();
    model.selectLocalityCandidate(row.id, "loc-b");
    await flushPromises();
    expect(row.venue.localityId).toBe("loc-b");
    expect(row.administrativeRegionId).toBe("galicia");
    expect(row.province).toBe("Pontevedra");
    expect(model.geographyStates[row.id]?.localityCandidates).toHaveLength(2);
    expect(model.geographyStates[row.id]?.selectedLocality?.id).toBe("loc-b");
    expect(resolveVenuesMock).toHaveBeenCalledTimes(1);
    model.selectLocalityCandidate(row.id, "loc-a");
    await flushPromises();
    expect(row.venue.localityId).toBe("loc-a");
    expect(row.province).toBe("A Coruña");
    expect(resolveVenuesMock).toHaveBeenCalledTimes(2);
    model.selectLocalityCandidate(row.id, "");
    expect(row.venue).toMatchObject({ name: "Sala Uno", venueId: null, localityId: null });
    expect(row.province).toBe("");
    expect(row.administrativeRegionId).toBeNull();
    expect(model.geographyStates[row.id]?.localityStatus).toBe("ambiguous");
  });

  it("invalidates only the geographic associations when City, Province or Country changes", async () => {
    const row = model.rows.value[0]!;
    row.event = "Festival";
    row.price = "25€";
    model.updateCity(row.id, "Madrid");
    await vi.advanceTimersByTimeAsync(900);
    await flushPromises();
    await vi.advanceTimersByTimeAsync(450);
    await flushPromises();
    model.updateVenue(row.id, "Sala Apolo");
    await vi.advanceTimersByTimeAsync(450);
    await flushPromises();
    expect(row.venue.venueId).toBeTruthy();
    model.updateProvince(row.id, "Comunidad de Madrid");
    expect(row.venue.localityId).toBeNull();
    expect(row.venue.name).toBe("Sala Apolo");
    model.invalidateGeographicAssociations("country-PT");
    expect(row.venue).toMatchObject({ name: "Sala Apolo", venueId: null, localityId: null });
    expect(row).toMatchObject({
      city: "Madrid",
      province: "Comunidad de Madrid",
      event: "Festival",
      price: "25€",
    });
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

  it("shares duplicate locality and Venue work across rows", async () => {
    const first = model.rows.value[0]!;
    const second = model.rows.value[1]!;
    model.updateCity(first.id, "Bilbao");
    model.updateCity(second.id, "Bilbao");
    model.updateVenue(first.id, "Sala Uno");
    model.updateVenue(second.id, "Sala Uno");
    await vi.advanceTimersByTimeAsync(1350);
    await flushPromises();
    expect(inspectLocalitiesMock).toHaveBeenCalledTimes(1);
    expect(inspectLocalitiesMock.mock.calls[0]?.[0].localities).toHaveLength(1);
    expect(resolveVenuesMock).toHaveBeenCalledTimes(1);
    expect(resolveVenuesMock.mock.calls[0]?.[0]).toHaveLength(1);
  });

  it("resolves 20 rows as three locality identities and one shared repeated Venue", async () => {
    model.setRowCount(20);
    model.rows.value.forEach((row, index) => {
      model.updateCity(row.id, index < 12 ? "Madrid" : index < 17 ? "Barcelona" : "Bilbao");
      model.updateProvince(row.id, index < 12 ? "Madrid" : index < 17 ? "Barcelona" : "Bizkaia");
      model.updateVenue(row.id, index < 8 ? "La Riviera" : `Venue ${index}`);
    });
    await vi.advanceTimersByTimeAsync(1800);
    await flushPromises();
    expect(inspectLocalitiesMock).toHaveBeenCalledTimes(1);
    expect(inspectLocalitiesMock.mock.calls[0]?.[0].localities).toHaveLength(3);
    expect(resolveVenuesMock.mock.calls[0]?.[0]).toHaveLength(13);
    expect(
      resolveVenuesMock.mock.calls[0]?.[0].filter(
        (item: { name: string }) => item.name === "La Riviera"
      )
    ).toHaveLength(1);
  });

  it("does not requery when edited text keeps the same normalized resolution identity", async () => {
    const row = model.rows.value[0]!;
    model.updateCity(row.id, "Madrid");
    model.updateProvince(row.id, "Madrid");
    model.updateVenue(row.id, "Sala X");
    await vi.advanceTimersByTimeAsync(1350);
    await flushPromises();
    expect(inspectLocalitiesMock).toHaveBeenCalledTimes(1);
    expect(resolveVenuesMock).toHaveBeenCalledTimes(1);
    const venueId = row.venue.venueId;

    model.updateCity(row.id, " madrid ");
    model.updateProvince(row.id, " MADRID ");
    model.updateVenue(row.id, " sala x ");
    model.invalidateGeographicAssociations("country-ES");
    await vi.advanceTimersByTimeAsync(1350);
    await flushPromises();

    expect(inspectLocalitiesMock).toHaveBeenCalledTimes(1);
    expect(resolveVenuesMock).toHaveBeenCalledTimes(1);
    expect(row).toMatchObject({ city: " madrid ", province: " MADRID " });
    expect(row.venue).toMatchObject({ name: " sala x ", venueId });
  });

  it("applies pending results after display-only edits with the same identity", async () => {
    let resolveLocality!: (response: unknown) => void;
    let resolveVenue!: (response: unknown) => void;
    let resolveTour!: (response: unknown) => void;
    inspectLocalitiesMock.mockImplementationOnce(
      () => new Promise((resolve) => (resolveLocality = resolve))
    );
    resolveVenuesMock.mockImplementationOnce(
      () => new Promise((resolve) => (resolveVenue = resolve))
    );
    inspectToursMock.mockImplementationOnce(
      () => new Promise((resolve) => (resolveTour = resolve))
    );
    const row = model.rows.value[0]!;
    model.updateType(row.id, "tour");
    model.updateEvent(row.id, "Gira 2027");
    model.updateCity(row.id, "Madrid");
    model.updateProvince(row.id, "Madrid");
    model.updateVenue(row.id, "Sala X");
    await vi.advanceTimersByTimeAsync(900);
    await flushPromises();

    model.updateEvent(row.id, " gira   2027 ");
    model.updateCity(row.id, " madrid ");
    model.updateProvince(row.id, " MADRID ");
    resolveTour({
      results: [{ index: 0, name: "Gira 2027", status: "new", candidates: [] }],
    });
    resolveLocality({
      results: [
        {
          index: 0,
          input: { name: "Madrid", countryId: "country-ES", province: "Madrid" },
          status: "existing",
          locality: {
            id: "locality-madrid",
            name: "Madrid",
            province: "Madrid",
            country: { id: "country-ES", name: "España" },
            administrativeRegion: { id: "region-1", name: "Región" },
          },
          candidates: [],
        },
      ],
    });
    await flushPromises();
    expect(model.geographyStates[row.id]?.localityStatus).toBe("existing");
    expect(model.tourStates[row.id]?.status).toBe("new");
    expect(row.venue.localityId).toBe("locality-madrid");

    await vi.advanceTimersByTimeAsync(450);
    await flushPromises();
    model.updateVenue(row.id, " sala x ");
    resolveVenue([
      {
        index: 0,
        name: "Sala X",
        localityId: "locality-madrid",
        status: "existing",
        venue: { id: "venue-sala-x", name: "Sala X" },
        candidates: [{ id: "venue-sala-x", name: "Sala X" }],
      },
    ]);
    await flushPromises();

    expect(row.venue).toMatchObject({
      name: " sala x ",
      localityId: "locality-madrid",
      venueId: "venue-sala-x",
    });
  });

  it("keeps Artist IDs and a confirmed Tour across a country change", async () => {
    inspectToursMock.mockImplementationOnce(async ({ names }: { names: string[] }) => ({
      results: names.map((name, index) => ({
        index,
        name,
        status: "existing",
        code: "TOUR_CONFIRMATION_REQUIRED",
        entity: { id: "tour-1", name: "Gira compartida" },
        candidates: [],
      })),
    }));
    const row = model.rows.value[0]!;
    model.updateLineupDraft(row.id, "Septicflesh");
    model.updateType(row.id, "tour");
    model.updateEvent(row.id, "Gira compartida");
    model.updateCity(row.id, "Madrid");
    await vi.advanceTimersByTimeAsync(900);
    await flushPromises();
    model.confirmTour(row.id);
    const artistId = row.lineup[0]?.artistId;
    expect(model.tourStates[row.id]?.confirmedTourId).toBe("tour-1");

    model.invalidateGeographicAssociations("country-PT");
    await vi.advanceTimersByTimeAsync(900);
    await flushPromises();

    expect(row.city).toBe("Madrid");
    expect(row.lineup[0]?.artistId).toBe(artistId);
    expect(model.tourStates[row.id]?.confirmedTourId).toBe("tour-1");
    expect(resolveArtistsBatchMock).toHaveBeenCalledTimes(1);
    expect(inspectToursMock).toHaveBeenCalledTimes(1);
    expect(inspectLocalitiesMock).toHaveBeenCalledTimes(2);

    model.invalidateGeographicAssociations("country-ES");
    await vi.advanceTimersByTimeAsync(900);
    await flushPromises();
    expect(row.venue.localityId).toBe("locality-country-ES-Madrid-");
    expect(inspectLocalitiesMock).toHaveBeenCalledTimes(2);
  });

  it("shares Tour identity and confirmation, while a type change makes it inapplicable", async () => {
    inspectToursMock.mockImplementationOnce(async ({ names }: { names: string[] }) => ({
      results: names.map((name, index) => ({
        index,
        name,
        status: "existing",
        code: "TOUR_CONFIRMATION_REQUIRED",
        entity: { id: "tour-1", name: "Gira compartida" },
        candidates: [],
      })),
    }));
    const [first, second] = model.rows.value;
    if (!first || !second) throw new Error("Faltan filas de prueba");
    model.updateType(first.id, "tour");
    model.updateType(second.id, "tour");
    model.updateEvent(first.id, "Gira compartida");
    model.updateEvent(second.id, " gira   compartida ");
    await vi.advanceTimersByTimeAsync(450);
    await flushPromises();

    expect(inspectToursMock).toHaveBeenCalledTimes(1);
    model.confirmTour(first.id);
    expect(model.tourStates[second.id]?.confirmedTourId).toBe("tour-1");

    model.updateType(first.id, "festival");
    expect(model.tourStates[first.id]?.confirmedTourId).toBeNull();
    model.updateType(first.id, "tour");
    await vi.advanceTimersByTimeAsync(450);
    await flushPromises();
    expect(model.tourStates[first.id]?.confirmedTourId).toBe("tour-1");
    expect(inspectToursMock).toHaveBeenCalledTimes(1);
  });

  it("requires explicit selection and confirmation for an ambiguous Tour", async () => {
    inspectToursMock.mockImplementationOnce(async ({ names }: { names: string[] }) => ({
      results: names.map((name, index) => ({
        index,
        name,
        status: "ambiguous",
        code: "TOUR_AMBIGUOUS",
        candidates: [
          { id: "tour-a", name: "Tour A" },
          { id: "tour-b", name: "Tour B" },
        ],
      })),
    }));
    const [first, second] = model.rows.value;
    if (!first || !second) throw new Error("Faltan filas de prueba");
    model.updateType(first.id, "tour");
    model.updateType(second.id, "tour");
    model.updateEvent(first.id, "Common Tour");
    model.updateEvent(second.id, " common   tour ");
    await vi.advanceTimersByTimeAsync(450);
    await flushPromises();

    expect(model.tourStates[first.id]?.selectedCandidateId).toBeNull();
    model.selectTourCandidate(first.id, "tour-b");
    expect(model.tourStates[first.id]?.confirmedTourId).toBeNull();
    model.confirmTour(first.id);
    expect(model.tourStates[first.id]?.confirmedTourId).toBe("tour-b");
    expect(model.tourStates[second.id]).toMatchObject({
      selectedCandidateId: "tour-b",
      confirmedTourId: "tour-b",
    });

    model.selectTourCandidate(first.id, "tour-a");
    expect(model.tourStates[first.id]?.confirmedTourId).toBeNull();
    expect(model.tourStates[second.id]?.confirmedTourId).toBeNull();
  });

  it("resolves ten rows of one Tour with one real request", async () => {
    model.setRowCount(10);
    model.rows.value.forEach((row) => {
      model.updateType(row.id, "tour");
      model.updateEvent(row.id, "Gira común 2027");
    });
    await vi.advanceTimersByTimeAsync(450);
    await flushPromises();

    expect(inspectToursMock).toHaveBeenCalledTimes(1);
    expect(inspectToursMock.mock.calls[0]?.[0].names).toEqual(["Gira común 2027"]);
    expect(model.rows.value.every((row) => model.tourStates[row.id]?.status === "new")).toBe(true);
  });

  it("does not restore a Tour confirmation when its only row stops being a Tour", async () => {
    inspectToursMock.mockImplementationOnce(async ({ names }: { names: string[] }) => ({
      results: names.map((name, index) => ({
        index,
        name,
        status: "existing",
        code: "TOUR_CONFIRMATION_REQUIRED",
        entity: { id: "tour-only", name },
        candidates: [],
      })),
    }));
    const row = model.rows.value[0]!;
    model.updateType(row.id, "tour");
    model.updateEvent(row.id, "Única gira");
    await vi.advanceTimersByTimeAsync(450);
    await flushPromises();
    model.confirmTour(row.id);
    expect(model.tourStates[row.id]?.confirmedTourId).toBe("tour-only");

    model.updateType(row.id, "concert");
    model.updateType(row.id, "tour");
    await flushPromises();

    expect(model.tourStates[row.id]?.status).toBe("existing");
    expect(model.tourStates[row.id]?.confirmedTourId).toBeNull();
    expect(inspectToursMock).toHaveBeenCalledTimes(1);
  });

  it("ignores a late Tour response after Type changes", async () => {
    let resolveTour!: (response: unknown) => void;
    inspectToursMock.mockImplementationOnce(
      () => new Promise((resolve) => (resolveTour = resolve))
    );
    const row = model.rows.value[0]!;
    model.updateType(row.id, "tour");
    model.updateEvent(row.id, "Gira tardía");
    await vi.advanceTimersByTimeAsync(450);
    model.updateType(row.id, "festival");
    resolveTour({
      results: [
        {
          index: 0,
          name: "Gira tardía",
          status: "existing",
          code: "TOUR_CONFIRMATION_REQUIRED",
          entity: { id: "tour-late", name: "Gira tardía" },
          candidates: [],
        },
      ],
    });
    await flushPromises();

    expect(row.type).toBe("festival");
    expect(model.tourStates[row.id]?.confirmedTourId).toBeNull();
    expect(model.tourStates[row.id]?.result).toBeNull();
  });
});
