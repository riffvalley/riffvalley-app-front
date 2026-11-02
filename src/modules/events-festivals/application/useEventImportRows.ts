import { onScopeDispose, reactive, ref } from "vue";
import {
  resolveArtistsBatch,
  type ArtistResolutionResult,
  type ResolvedArtist,
} from "../api/artistResolution";
import { searchVenueNames, type VenueNameLookup } from "@/modules/venues";
import { lineupNameCacheKey, splitLineupNames } from "./lineupText";
import { formatCalendarDate, parseCalendarDate, type EventDateField } from "./eventDate";
import type { EventType } from "./eventType";

export interface LineupItem {
  key: string;
  name: string;
  artistId: string | null;
}

export interface EventImportRow {
  id: string;
  type: EventType;
  event: string;
  lineup: LineupItem[];
  startDate: string | null;
  startDateDraft: string;
  endDate: string | null;
  endDateDraft: string;
  venue: { name: string; venueId: string | null; localityId: string | null };
  price: string;
  otherInfo: string;
  city: string;
  province: string;
}

export type VenueResolutionStatus = "idle" | "resolving" | "ambiguous" | "error";

export type LineupDraftStatus = "idle" | "resolving" | "error";
export type LineupItemStatus = "resolving" | "error";

export interface LineupCellState {
  draft: string;
  draftStatus: LineupDraftStatus;
  itemStatus: Record<string, LineupItemStatus>;
}

const INITIAL_ROW_COUNT = 5;
const RESOLUTION_DEBOUNCE_MS = 450;
const ARTIST_BATCH_SIZE = 100;
const VENUE_RESOLUTION_DEBOUNCE_MS = 450;

export function normalizeVenueSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .trim()
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("und");
}

function compatibleVenues(
  venues: VenueNameLookup[],
  city: string,
  province: string,
  name: string
): VenueNameLookup[] {
  const normalizedName = normalizeVenueSearch(name);
  const normalizedCity = normalizeVenueSearch(city);
  const normalizedProvince = normalizeVenueSearch(province);
  return venues.filter(
    (venue) =>
      normalizeVenueSearch(venue.name) === normalizedName &&
      (!normalizedCity || normalizeVenueSearch(venue.locality.name) === normalizedCity) &&
      (!normalizedProvince ||
        normalizeVenueSearch(venue.locality.province ?? "") === normalizedProvince)
  );
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

export function useEventImportRows() {
  let nextRowId = 1;
  let nextLineupItemKey = 1;
  let disposed = false;

  const lineupStates = reactive<Record<string, LineupCellState>>({});
  const rows = ref<EventImportRow[]>([]);
  const resolvedArtists = new Map<string, ResolvedArtist | null>();
  const draftTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const draftControllers = new Map<string, AbortController>();
  const draftVersions = new Map<string, number>();
  const itemTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const itemControllers = new Map<string, AbortController>();
  const itemVersions = new Map<string, number>();
  const venueStates = reactive<Record<string, VenueResolutionStatus>>({});
  const venueTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const venueVersions = new Map<string, number>();
  const venueSearches = new Map<string, Promise<VenueNameLookup[]>>();

  async function resolveNames(names: string[], signal: AbortSignal) {
    const uncachedNames: string[] = [];
    const seen = new Set<string>();

    for (const name of names) {
      const key = lineupNameCacheKey(name);
      if (!resolvedArtists.has(key) && !seen.has(key)) {
        seen.add(key);
        uncachedNames.push(name);
      }
    }

    for (const batch of chunks(uncachedNames, ARTIST_BATCH_SIZE)) {
      const results = await resolveArtistsBatch(batch, signal);
      results.forEach((result, index) => {
        const requestedName = batch[index];
        if (requestedName !== undefined) {
          resolvedArtists.set(lineupNameCacheKey(requestedName), result.artist);
        }
      });
    }

    return names.map((name): ArtistResolutionResult["artist"] => {
      const resolved = resolvedArtists.get(lineupNameCacheKey(name));
      return resolved ?? null;
    });
  }

  function createRow(): EventImportRow {
    const row: EventImportRow = {
      id: `event-row-${nextRowId++}`,
      type: "concert",
      event: "",
      lineup: [],
      startDate: null,
      startDateDraft: "",
      endDate: null,
      endDateDraft: "",
      venue: { name: "", venueId: null, localityId: null },
      price: "",
      otherInfo: "",
      city: "",
      province: "",
    };
    lineupStates[row.id] = { draft: "", draftStatus: "idle", itemStatus: {} };
    venueStates[row.id] = "idle";
    return row;
  }

  function createLineupItem(name: string, artist: ResolvedArtist | null): LineupItem {
    return {
      key: `lineup-item-${nextLineupItemKey++}`,
      name: artist?.name ?? name,
      artistId: artist?.id ?? null,
    };
  }

  rows.value = Array.from({ length: INITIAL_ROW_COUNT }, createRow);

  function nextVersion(versions: Map<string, number>, key: string) {
    const version = (versions.get(key) ?? 0) + 1;
    versions.set(key, version);
    return version;
  }

  function cancelDraftWork(rowId: string) {
    const timer = draftTimers.get(rowId);
    if (timer) clearTimeout(timer);
    draftTimers.delete(rowId);
    draftControllers.get(rowId)?.abort();
    draftControllers.delete(rowId);
    return nextVersion(draftVersions, rowId);
  }

  function cancelItemWork(itemKey: string) {
    const timer = itemTimers.get(itemKey);
    if (timer) clearTimeout(timer);
    itemTimers.delete(itemKey);
    itemControllers.get(itemKey)?.abort();
    itemControllers.delete(itemKey);
    return nextVersion(itemVersions, itemKey);
  }

  function isCurrentDraft(rowId: string, version: number) {
    return !disposed && draftVersions.get(rowId) === version && Boolean(lineupStates[rowId]);
  }

  function findRow(rowId: string) {
    return rows.value.find((row) => row.id === rowId);
  }

  function findItem(rowId: string, itemKey: string) {
    return findRow(rowId)?.lineup.find((item) => item.key === itemKey);
  }

  function cancelVenueWork(rowId: string) {
    const timer = venueTimers.get(rowId);
    if (timer) clearTimeout(timer);
    venueTimers.delete(rowId);
    venueStates[rowId] = "idle";
    return nextVersion(venueVersions, rowId);
  }

  function venueCandidates(name: string) {
    const key = normalizeVenueSearch(name);
    const existing = venueSearches.get(key);
    if (existing) return existing;
    const request = searchVenueNames(name.trim()).catch((error: unknown) => {
      venueSearches.delete(key);
      throw error;
    });
    venueSearches.set(key, request);
    return request;
  }

  async function resolveVenue(rowId: string, version: number) {
    const row = findRow(rowId);
    const name = row?.venue.name.trim() ?? "";
    if (!row || !name || disposed || venueVersions.get(rowId) !== version) return;
    venueStates[rowId] = "resolving";
    try {
      const candidates = await venueCandidates(name);
      const current = findRow(rowId);
      if (
        !current ||
        disposed ||
        venueVersions.get(rowId) !== version ||
        current.venue.name.trim() !== name
      )
        return;
      const matches = compatibleVenues(candidates, current.city, current.province, name);
      if (matches.length === 1) {
        const match = matches[0]!;
        current.venue = { name: match.name, venueId: match.id, localityId: match.locality.id };
        current.city = match.locality.name;
        current.province = match.locality.province ?? "";
        venueStates[rowId] = "idle";
      } else {
        venueStates[rowId] = matches.length > 1 ? "ambiguous" : "idle";
      }
    } catch {
      if (!disposed && venueVersions.get(rowId) === version) venueStates[rowId] = "error";
    }
  }

  function scheduleVenueResolution(rowId: string) {
    const row = findRow(rowId);
    if (!row) return;
    const version = cancelVenueWork(rowId);
    if (!row.venue.name.trim()) return;
    venueTimers.set(
      rowId,
      setTimeout(() => {
        venueTimers.delete(rowId);
        void resolveVenue(rowId, version);
      }, VENUE_RESOLUTION_DEBOUNCE_MS)
    );
  }

  function updateVenue(rowId: string, name: string) {
    const row = findRow(rowId);
    if (!row || row.venue.name === name) return;
    cancelVenueWork(rowId);
    row.venue = { name, venueId: null, localityId: null };
    scheduleVenueResolution(rowId);
  }

  function updateCity(rowId: string, city: string) {
    const row = findRow(rowId);
    if (!row || row.city === city) return;
    row.city = city;
    row.venue.venueId = null;
    row.venue.localityId = null;
    scheduleVenueResolution(rowId);
  }

  function updateProvince(rowId: string, province: string) {
    const row = findRow(rowId);
    if (!row || row.province === province) return;
    row.province = province;
    row.venue.venueId = null;
    row.venue.localityId = null;
    scheduleVenueResolution(rowId);
  }

  function commitVenue(rowId: string) {
    const row = findRow(rowId);
    if (!row?.venue.name.trim()) return;
    const timer = venueTimers.get(rowId);
    if (timer) clearTimeout(timer);
    venueTimers.delete(rowId);
    void resolveVenue(rowId, venueVersions.get(rowId) ?? 0);
  }

  function retryVenue(rowId: string) {
    if (!findRow(rowId)?.venue.name.trim()) return;
    const version = cancelVenueWork(rowId);
    void resolveVenue(rowId, version);
  }

  async function resolveDraft(rowId: string, version: number) {
    const state = lineupStates[rowId];
    const row = findRow(rowId);
    if (!state || !row || !isCurrentDraft(rowId, version)) return;

    const draft = state.draft;
    const names = splitLineupNames(draft);
    if (names.length === 0) {
      state.draft = "";
      state.draftStatus = "idle";
      return;
    }

    if (state.draftStatus === "resolving") return;

    const controller = new AbortController();
    draftControllers.set(rowId, controller);
    state.draftStatus = "resolving";

    try {
      const artists = await resolveNames(names, controller.signal);
      if (!isCurrentDraft(rowId, version) || state.draft !== draft || controller.signal.aborted) {
        return;
      }

      row.lineup.push(
        ...names.map((name, index) => createLineupItem(name, artists[index] ?? null))
      );
      state.draft = "";
      state.draftStatus = "idle";
    } catch {
      if (!isCurrentDraft(rowId, version) || controller.signal.aborted) return;
      state.draftStatus = "error";
    } finally {
      if (draftControllers.get(rowId) === controller) draftControllers.delete(rowId);
    }
  }

  async function resolveEditedItem(rowId: string, itemKey: string, version: number) {
    const state = lineupStates[rowId];
    const item = findItem(rowId, itemKey);
    if (!state || !item || disposed || itemVersions.get(itemKey) !== version) return;

    const name = item.name.trim();
    if (!name) return;

    const controller = new AbortController();
    itemControllers.set(itemKey, controller);
    state.itemStatus[itemKey] = "resolving";

    try {
      const [artist] = await resolveNames([name], controller.signal);
      const currentItem = findItem(rowId, itemKey);
      if (
        disposed ||
        controller.signal.aborted ||
        itemVersions.get(itemKey) !== version ||
        !currentItem ||
        currentItem.name.trim() !== name
      ) {
        return;
      }

      currentItem.name = artist?.name ?? name;
      currentItem.artistId = artist?.id ?? null;
      delete state.itemStatus[itemKey];
    } catch {
      if (disposed || controller.signal.aborted || itemVersions.get(itemKey) !== version) return;
      state.itemStatus[itemKey] = "error";
    } finally {
      if (itemControllers.get(itemKey) === controller) itemControllers.delete(itemKey);
    }
  }

  function addRow() {
    rows.value.push(createRow());
  }

  function updateEvent(rowId: string, event: string) {
    const row = findRow(rowId);
    if (row) row.event = event;
  }

  function updateType(rowId: string, type: EventType) {
    const row = findRow(rowId);
    if (row) row.type = type;
  }

  function updateTypeRange(startIndex: number, values: (EventType | null)[]) {
    while (rows.value.length < startIndex + values.length) addRow();
    values.forEach((type, rowOffset) => {
      if (type) updateType(rows.value[startIndex + rowOffset]!.id, type);
    });
  }

  function updateTextField(rowId: string, field: "price" | "otherInfo", value: string) {
    const row = findRow(rowId);
    if (row) row[field] = value;
  }

  function updateTextRange(
    startIndex: number,
    startField: "price" | "otherInfo",
    values: string[][]
  ) {
    while (rows.value.length < startIndex + values.length) addRow();
    values.forEach((cells, rowOffset) => {
      const row = rows.value[startIndex + rowOffset];
      if (!row) return;
      const fields =
        startField === "price" ? (["price", "otherInfo"] as const) : (["otherInfo"] as const);
      fields.forEach((field, columnOffset) => {
        const value = cells[columnOffset];
        if (value !== undefined) row[field] = value;
      });
    });
  }

  function updateDate(rowId: string, field: EventDateField, value: string) {
    const row = findRow(rowId);
    if (!row) return;
    const input = value.trim();
    if (!input) {
      row[`${field}Draft`] = "";
      row[field] = null;
      return;
    }
    const date = parseCalendarDate(input);
    row[`${field}Draft`] = date ? formatCalendarDate(date) : value;
    row[field] = date;
  }

  function updateDateRange(startIndex: number, startField: EventDateField, values: string[][]) {
    while (rows.value.length < startIndex + values.length) addRow();
    values.forEach((cells, rowOffset) => {
      const row = rows.value[startIndex + rowOffset];
      if (!row) return;
      const fields: EventDateField[] =
        startField === "startDate" ? ["startDate", "endDate"] : ["endDate"];
      fields.forEach((field, columnOffset) => {
        const value = cells[columnOffset];
        if (value !== undefined) updateDate(row.id, field, value);
      });
    });
  }

  function updateLineupDraft(rowId: string, draft: string) {
    const state = lineupStates[rowId];
    if (!state) return;

    const version = cancelDraftWork(rowId);
    state.draft = draft;
    state.draftStatus = "idle";
    if (!splitLineupNames(draft).length) return;

    draftTimers.set(
      rowId,
      setTimeout(() => {
        draftTimers.delete(rowId);
        void resolveDraft(rowId, version);
      }, RESOLUTION_DEBOUNCE_MS)
    );
  }

  function commitLineupDraft(rowId: string) {
    const state = lineupStates[rowId];
    if (!state || state.draftStatus === "resolving" || state.draftStatus === "error") return;
    const timer = draftTimers.get(rowId);
    if (timer) clearTimeout(timer);
    draftTimers.delete(rowId);
    void resolveDraft(rowId, draftVersions.get(rowId) ?? 0);
  }

  function retryLineupDraft(rowId: string) {
    const state = lineupStates[rowId];
    if (!state || !splitLineupNames(state.draft).length) return;
    state.draftStatus = "idle";
    const version = cancelDraftWork(rowId);
    void resolveDraft(rowId, version);
  }

  function updateLineupItemName(rowId: string, itemKey: string, name: string) {
    const item = findItem(rowId, itemKey);
    const state = lineupStates[rowId];
    if (!item || !state || item.name === name) return;

    item.name = name;
    item.artistId = null;
    delete state.itemStatus[itemKey];
    const version = cancelItemWork(itemKey);
    if (!name.trim()) return;

    itemTimers.set(
      itemKey,
      setTimeout(() => {
        itemTimers.delete(itemKey);
        void resolveEditedItem(rowId, itemKey, version);
      }, RESOLUTION_DEBOUNCE_MS)
    );
  }

  function commitLineupItemName(rowId: string, itemKey: string) {
    const item = findItem(rowId, itemKey);
    const state = lineupStates[rowId];
    if (!item || !state) return;

    const name = item.name.trim();
    if (!name) {
      removeLineupItem(rowId, itemKey);
      return;
    }
    if (name !== item.name) updateLineupItemName(rowId, itemKey, name);
    if (
      item.artistId ||
      state.itemStatus[itemKey] === "resolving" ||
      state.itemStatus[itemKey] === "error"
    )
      return;

    const timer = itemTimers.get(itemKey);
    if (timer) clearTimeout(timer);
    itemTimers.delete(itemKey);
    void resolveEditedItem(rowId, itemKey, itemVersions.get(itemKey) ?? 0);
  }

  function retryLineupItem(rowId: string, itemKey: string) {
    const item = findItem(rowId, itemKey);
    if (!item || !item.name.trim()) return;
    const state = lineupStates[rowId];
    if (state) delete state.itemStatus[itemKey];
    const version = cancelItemWork(itemKey);
    void resolveEditedItem(rowId, itemKey, version);
  }

  function removeLineupItem(rowId: string, itemKey: string) {
    const row = findRow(rowId);
    const state = lineupStates[rowId];
    if (!row || !state) return;
    cancelItemWork(itemKey);
    itemVersions.delete(itemKey);
    row.lineup = row.lineup.filter((item) => item.key !== itemKey);
    delete state.itemStatus[itemKey];
  }

  function removeRow(rowId: string) {
    const row = findRow(rowId);
    if (!row) return;
    cancelDraftWork(rowId);
    cancelVenueWork(rowId);
    draftVersions.delete(rowId);
    for (const item of row.lineup) cancelItemWork(item.key);
    for (const item of row.lineup) itemVersions.delete(item.key);
    rows.value = rows.value.filter((candidate) => candidate.id !== rowId);
    delete lineupStates[rowId];
    delete venueStates[rowId];
  }

  onScopeDispose(() => {
    disposed = true;
    for (const timer of draftTimers.values()) clearTimeout(timer);
    for (const timer of itemTimers.values()) clearTimeout(timer);
    for (const timer of venueTimers.values()) clearTimeout(timer);
    for (const controller of draftControllers.values()) controller.abort();
    for (const controller of itemControllers.values()) controller.abort();
    draftTimers.clear();
    itemTimers.clear();
    venueTimers.clear();
    draftControllers.clear();
    itemControllers.clear();
  });

  return {
    rows,
    lineupStates,
    venueStates,
    addRow,
    updateEvent,
    updateType,
    updateTypeRange,
    updateTextField,
    updateTextRange,
    updateDate,
    updateDateRange,
    updateVenue,
    updateCity,
    updateProvince,
    commitVenue,
    retryVenue,
    updateLineupDraft,
    commitLineupDraft,
    retryLineupDraft,
    updateLineupItemName,
    commitLineupItemName,
    retryLineupItem,
    removeLineupItem,
    removeRow,
  };
}
