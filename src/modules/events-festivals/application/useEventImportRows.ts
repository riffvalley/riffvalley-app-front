import type { QueryClient } from "@tanstack/vue-query";
import { onScopeDispose, reactive, ref } from "vue";
import type { ArtistResolutionResult } from "../api/artistResolution";
import type { VenueResolutionResult } from "@/modules/venues";
import type {
  LocalityInspectionResult,
  LocalityResolutionCandidate,
  TourResolutionResult,
  EntityCandidate,
} from "../api/entityResolutionContracts";
import { splitLineupNames } from "./lineupText";
import { useEventEntityResolution } from "./useEventEntityResolution";
import {
  localityIdentity,
  useEventGeographyResolution,
  venueIdentity,
} from "./useEventGeographyResolution";
import { tourResolutionKey, useEventTourResolution } from "./useEventTourResolution";
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
  administrativeRegionId: string | null;
}

export type LocalityResolutionStatus =
  "idle" | "resolving" | "existing" | "new" | "ambiguous" | "invalid" | "error";
export type VenueResolutionStatus =
  "idle" | "resolving" | "existing" | "new" | "ambiguous" | "error";
export interface EventGeographyState {
  localityStatus: LocalityResolutionStatus;
  localityCandidates: LocalityResolutionCandidate[];
  selectedLocality: LocalityResolutionCandidate | null;
  localityResult: LocalityInspectionResult | null;
  localityError: string | null;
  venueStatus: VenueResolutionStatus;
  venueCandidates: VenueResolutionResult["candidates"];
  venueError: string | null;
}

export interface EventTourState {
  status: "idle" | "resolving" | "existing" | "new" | "ambiguous" | "invalid" | "error";
  result: TourResolutionResult | null;
  selectedCandidateId: string | null;
  confirmedTourId: string | null;
  error: string | null;
}

export type LineupDraftStatus = "idle" | "resolving" | "error";
export type LineupItemStatus = "resolving" | "error";

export interface LineupCellState {
  draft: string;
  draftStatus: LineupDraftStatus;
  itemStatus: Record<string, LineupItemStatus>;
  draftError: string | null;
  itemResolution: Record<string, ArtistResolutionResult | { status: "error"; message: string }>;
}

const INITIAL_ROW_COUNT = 5;
const emptyGeographyState = (): EventGeographyState => ({
  localityStatus: "idle",
  localityCandidates: [],
  selectedLocality: null,
  localityResult: null,
  localityError: null,
  venueStatus: "idle",
  venueCandidates: [],
  venueError: null,
});

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isResolutionCancelled(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (("name" in error && (error.name === "AbortError" || error.name === "CancelledError")) ||
      ("message" in error && error.message === "CancelledError"))
  );
}

export function useEventImportRows(queryClient: QueryClient) {
  let nextRowId = 1;
  let nextLineupItemKey = 1;
  let disposed = false;

  const lineupStates = reactive<Record<string, LineupCellState>>({});
  const rows = ref<EventImportRow[]>([]);
  const artistResolution = useEventEntityResolution(queryClient);
  const geographyResolution = useEventGeographyResolution(queryClient);
  const tourResolution = useEventTourResolution(queryClient);
  const draftVersions = new Map<string, number>();
  const itemVersions = new Map<string, number>();
  const geographyStates = reactive<Record<string, EventGeographyState>>({});
  const tourStates = reactive<Record<string, EventTourState>>({});
  const tourVersions = new Map<string, number>();
  const confirmedTours = new Map<string, string>();
  const venueVersions = new Map<string, number>();
  const localityVersions = new Map<string, number>();
  const localityTimers = new Map<string, ReturnType<typeof setTimeout>>();
  let countryId = "";

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
      administrativeRegionId: null,
    };
    lineupStates[row.id] = {
      draft: "",
      draftStatus: "idle",
      itemStatus: {},
      draftError: null,
      itemResolution: {},
    };
    geographyStates[row.id] = emptyGeographyState();
    tourStates[row.id] = emptyTourState();
    return row;
  }

  function createLineupItem(name: string, result: ArtistResolutionResult): LineupItem {
    return {
      key: `lineup-item-${nextLineupItemKey++}`,
      name,
      artistId: result.status === "existing" ? result.artist.id : null,
    };
  }

  rows.value = Array.from({ length: INITIAL_ROW_COUNT }, createRow);

  function emptyTourState(): EventTourState {
    return {
      status: "idle",
      result: null,
      selectedCandidateId: null,
      confirmedTourId: null,
      error: null,
    };
  }

  function nextVersion(versions: Map<string, number>, key: string) {
    const version = (versions.get(key) ?? 0) + 1;
    versions.set(key, version);
    return version;
  }

  function cancelDraftWork(rowId: string) {
    return nextVersion(draftVersions, rowId);
  }

  function cancelItemWork(itemKey: string) {
    return nextVersion(itemVersions, itemKey);
  }

  function isCurrentDraft(rowId: string, version: number) {
    return !disposed && draftVersions.get(rowId) === version && Boolean(lineupStates[rowId]);
  }

  function findRow(rowId: string) {
    return rows.value.find((row) => row.id === rowId);
  }

  function cancelTourWork(rowId: string) {
    const version = nextVersion(tourVersions, rowId);
    const state = tourStates[rowId];
    if (state) Object.assign(state, emptyTourState());
    return version;
  }

  async function resolveTour(rowId: string, version: number, immediate = false) {
    const row = findRow(rowId);
    const state = tourStates[rowId];
    const requestedName = row?.event ?? "";
    if (!row || row.type !== "tour" || !requestedName.trim() || !state || disposed) return;
    state.status = "resolving";
    state.error = null;
    try {
      const [result] = await tourResolution.resolve([requestedName], immediate);
      const current = findRow(rowId);
      if (
        !current ||
        current.type !== "tour" ||
        tourResolutionKey(current.event) !== tourResolutionKey(requestedName) ||
        tourVersions.get(rowId) !== version ||
        disposed
      )
        return;
      if (!result) return;
      state.result = result;
      state.status = result.status;
      state.selectedCandidateId = result.status === "existing" ? result.entity.id : null;
      const confirmedId = confirmedTours.get(tourResolutionKey(requestedName));
      const candidates =
        result.status === "existing"
          ? [result.entity]
          : result.status === "ambiguous"
            ? result.candidates
            : [];
      state.confirmedTourId = candidates.some((candidate) => candidate.id === confirmedId)
        ? (confirmedId ?? null)
        : null;
    } catch (error) {
      if (
        !disposed &&
        tourVersions.get(rowId) === version &&
        findRow(rowId)?.type === "tour" &&
        tourResolutionKey(findRow(rowId)?.event ?? "") === tourResolutionKey(requestedName)
      ) {
        state.status = "error";
        state.error = errorMessage(error);
      }
    }
  }

  function scheduleTourResolution(rowId: string, immediate = false) {
    const row = findRow(rowId);
    if (!row || row.type !== "tour" || !row.event.trim()) return;
    const version = cancelTourWork(rowId);
    const state = tourStates[rowId];
    if (state) state.status = "resolving";
    void resolveTour(rowId, version, immediate);
  }

  function findItem(rowId: string, itemKey: string) {
    return findRow(rowId)?.lineup.find((item) => item.key === itemKey);
  }

  function cancelVenueWork(rowId: string) {
    const state = geographyStates[rowId];
    if (state) {
      state.venueStatus = "idle";
      state.venueCandidates = [];
      state.venueError = null;
    }
    return nextVersion(venueVersions, rowId);
  }

  async function resolveVenue(rowId: string, version: number, immediate = false) {
    const row = findRow(rowId);
    const state = geographyStates[rowId];
    const requestedName = row?.venue.name ?? "";
    const localityId = row?.venue.localityId;
    if (
      !row ||
      !state ||
      !requestedName.trim() ||
      !localityId ||
      disposed ||
      venueVersions.get(rowId) !== version
    )
      return;
    state.venueStatus = "resolving";
    state.venueError = null;
    try {
      const [result] = await geographyResolution.resolveVenues(
        [{ name: requestedName, localityId }],
        immediate
      );
      const current = findRow(rowId);
      if (
        !current ||
        disposed ||
        venueVersions.get(rowId) !== version ||
        venueIdentity({ name: current.venue.name, localityId: current.venue.localityId ?? "" }) !==
          venueIdentity({ name: requestedName, localityId: localityId ?? "" }) ||
        current.venue.localityId !== localityId ||
        countryId !== state.localityResult?.input.countryId
      )
        return;
      if (!result) return;
      state.venueStatus = result.status;
      state.venueCandidates = result.candidates;
      current.venue.venueId = result.status === "existing" ? result.venue.id : null;
    } catch (error) {
      if (!disposed && venueVersions.get(rowId) === version) {
        state.venueStatus = "error";
        state.venueError = errorMessage(error);
      }
    }
  }

  async function resolveLocality(rowId: string, version: number, immediate = false) {
    const row = findRow(rowId);
    const state = geographyStates[rowId];
    if (
      !row ||
      !state ||
      !countryId ||
      !row.city.trim() ||
      disposed ||
      localityVersions.get(rowId) !== version
    )
      return;
    const input = {
      name: row.city,
      countryId,
      ...(row.administrativeRegionId ? { administrativeRegionId: row.administrativeRegionId } : {}),
      ...(row.province.trim() ? { province: row.province } : {}),
    };
    state.localityStatus = "resolving";
    state.localityResult = null;
    state.localityCandidates = [];
    state.localityError = null;
    try {
      const [result] = await geographyResolution.resolveLocalities([input], immediate);
      const current = findRow(rowId);
      if (
        !current ||
        disposed ||
        localityVersions.get(rowId) !== version ||
        localityIdentity({
          name: current.city,
          countryId,
          ...(current.administrativeRegionId
            ? { administrativeRegionId: current.administrativeRegionId }
            : {}),
          ...(current.province.trim() ? { province: current.province } : {}),
        }) !== localityIdentity(input) ||
        countryId !== input.countryId
      )
        return;
      if (!result) return;
      state.localityResult = result;
      state.localityStatus = result.status;
      if (result.status === "ambiguous") state.localityCandidates = result.candidates;
      if (result.status === "existing") {
        state.selectedLocality = result.locality;
        current.venue.localityId = result.locality.id;
        if (current.venue.name.trim()) {
          const venueVersion = nextVersion(venueVersions, rowId);
          void resolveVenue(rowId, venueVersion);
        }
      } else {
        current.venue.localityId = null;
        current.venue.venueId = null;
        cancelVenueWork(rowId);
      }
    } catch (error) {
      if (!disposed && localityVersions.get(rowId) === version) {
        state.localityStatus = "error";
        state.localityError = errorMessage(error);
      }
    }
  }

  function scheduleLocalityResolution(rowId: string, immediate = false) {
    const row = findRow(rowId);
    if (!row) return;
    const timer = localityTimers.get(rowId);
    if (timer) clearTimeout(timer);
    localityTimers.delete(rowId);
    cancelVenueWork(rowId);
    const version = nextVersion(localityVersions, rowId);
    const state = geographyStates[rowId];
    if (state) {
      state.localityStatus = "idle";
      state.localityCandidates = [];
      state.selectedLocality = null;
      state.localityResult = null;
      state.localityError = null;
    }
    row.venue.venueId = null;
    row.venue.localityId = null;
    if (!countryId || !row.city.trim()) return;
    if (immediate) {
      void resolveLocality(rowId, version, true);
    } else {
      localityTimers.set(
        rowId,
        setTimeout(() => {
          localityTimers.delete(rowId);
          void resolveLocality(rowId, version);
        }, 450)
      );
    }
  }

  function updateVenue(rowId: string, name: string) {
    const row = findRow(rowId);
    if (!row || row.venue.name === name) return;
    const previousIdentity = row.venue.localityId
      ? venueIdentity({ name: row.venue.name, localityId: row.venue.localityId })
      : null;
    const nextIdentity = row.venue.localityId
      ? venueIdentity({ name, localityId: row.venue.localityId })
      : null;
    if (previousIdentity && previousIdentity === nextIdentity) {
      row.venue.name = name;
      return;
    }
    cancelVenueWork(rowId);
    row.venue.name = name;
    row.venue.venueId = null;
    const state = geographyStates[rowId];
    if (state) {
      state.venueStatus = "idle";
      state.venueCandidates = [];
      state.venueError = null;
    }
    if (row.venue.localityId && name.trim()) {
      const version = venueVersions.get(rowId)!;
      void resolveVenue(rowId, version);
    }
  }

  function updateCity(rowId: string, city: string) {
    const row = findRow(rowId);
    if (!row || row.city === city) return;
    const previousIdentity = localityIdentity({
      name: row.city,
      countryId,
      ...(row.administrativeRegionId ? { administrativeRegionId: row.administrativeRegionId } : {}),
      ...(row.province.trim() ? { province: row.province } : {}),
    });
    row.city = city;
    const nextIdentity = localityIdentity({
      name: city,
      countryId,
      ...(row.administrativeRegionId ? { administrativeRegionId: row.administrativeRegionId } : {}),
      ...(row.province.trim() ? { province: row.province } : {}),
    });
    if (previousIdentity === nextIdentity) return;
    scheduleLocalityResolution(rowId);
  }

  function updateProvince(rowId: string, province: string) {
    const row = findRow(rowId);
    if (!row || row.province === province) return;
    const previousIdentity = localityIdentity({
      name: row.city,
      countryId,
      ...(row.administrativeRegionId ? { administrativeRegionId: row.administrativeRegionId } : {}),
      ...(row.province.trim() ? { province: row.province } : {}),
    });
    row.province = province;
    const nextIdentity = localityIdentity({
      name: row.city,
      countryId,
      ...(row.administrativeRegionId ? { administrativeRegionId: row.administrativeRegionId } : {}),
      ...(province.trim() ? { province } : {}),
    });
    if (previousIdentity === nextIdentity) return;
    scheduleLocalityResolution(rowId);
  }

  function commitVenue(rowId: string) {
    const row = findRow(rowId);
    if (!row?.venue.name.trim() || !row.venue.localityId) return;
    void resolveVenue(rowId, venueVersions.get(rowId) ?? 0, true);
  }

  function retryVenue(rowId: string) {
    if (!findRow(rowId)?.venue.name.trim() || !findRow(rowId)?.venue.localityId) return;
    const version = cancelVenueWork(rowId);
    void resolveVenue(rowId, version, true);
  }

  function retryLocality(rowId: string) {
    if (!findRow(rowId)?.city.trim()) return;
    scheduleLocalityResolution(rowId, true);
  }

  function invalidateGeographicAssociations(nextCountryId = countryId) {
    const countryChanged = countryId !== nextCountryId;
    if (!countryChanged) return;
    countryId = nextCountryId;
    for (const row of rows.value) {
      if (countryChanged) row.administrativeRegionId = null;
      scheduleLocalityResolution(row.id);
    }
  }

  function selectAdministrativeRegion(rowId: string, regionId: string) {
    const row = findRow(rowId);
    if (!row) return;
    if (row.administrativeRegionId === (regionId || null)) return;
    row.administrativeRegionId = regionId || null;
    scheduleLocalityResolution(rowId, true);
  }

  function selectLocalityCandidate(rowId: string, localityId: string) {
    const row = findRow(rowId);
    const state = geographyStates[rowId];
    const candidate = state?.localityCandidates.find(({ id }) => id === localityId);
    if (!row || !state || !candidate) return;
    const version = cancelVenueWork(rowId);
    row.venue.localityId = candidate.id;
    row.venue.venueId = null;
    state.localityStatus = "existing";
    state.selectedLocality = candidate;
    state.localityCandidates = [];
    if (state.localityResult?.status === "ambiguous") {
      state.localityResult = {
        index: state.localityResult.index,
        input: state.localityResult.input,
        status: "existing",
        locality: candidate,
        candidates: [],
      };
    }
    if (row.venue.name.trim()) void resolveVenue(rowId, version, true);
  }

  async function resolveDraft(rowId: string, version: number, immediate = false) {
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

    state.draftStatus = "resolving";
    state.draftError = null;

    try {
      const results = await artistResolution.resolve(names, immediate);
      if (!isCurrentDraft(rowId, version) || state.draft !== draft || artistResolution.isDisposed) {
        return;
      }

      row.lineup.push(...names.map((name, index) => createLineupItem(name, results[index]!)));
      row.lineup.slice(-names.length).forEach((item, index) => {
        state.itemResolution[item.key] = results[index]!;
      });
      state.draft = "";
      state.draftStatus = "idle";
    } catch (error: unknown) {
      if (!isCurrentDraft(rowId, version)) return;
      if (isResolutionCancelled(error)) {
        state.draftStatus = "idle";
        return;
      }
      state.draftStatus = "error";
      state.draftError = errorMessage(error);
    }
  }

  async function resolveEditedItem(
    rowId: string,
    itemKey: string,
    version: number,
    immediate = false
  ) {
    const state = lineupStates[rowId];
    const item = findItem(rowId, itemKey);
    if (!state || !item || disposed || itemVersions.get(itemKey) !== version) return;

    const name = item.name.trim();
    if (!name) return;

    state.itemStatus[itemKey] = "resolving";

    try {
      const [result] = await artistResolution.resolve([name], immediate);
      const currentItem = findItem(rowId, itemKey);
      if (
        disposed ||
        artistResolution.isDisposed ||
        itemVersions.get(itemKey) !== version ||
        !currentItem ||
        currentItem.name.trim() !== name
      ) {
        return;
      }

      currentItem.artistId = result?.status === "existing" ? result.artist.id : null;
      state.itemResolution[itemKey] = result!;
      delete state.itemStatus[itemKey];
    } catch (error: unknown) {
      if (disposed || itemVersions.get(itemKey) !== version) return;
      if (isResolutionCancelled(error)) {
        delete state.itemStatus[itemKey];
        return;
      }
      state.itemStatus[itemKey] = "error";
      state.itemResolution[itemKey] = { status: "error", message: errorMessage(error) };
    }
  }

  function addRow() {
    rows.value.push(createRow());
  }

  function updateEvent(rowId: string, event: string) {
    const row = findRow(rowId);
    if (!row || row.event === event) return;
    const previousIdentity = row.type === "tour" ? tourResolutionKey(row.event) : null;
    row.event = event;
    const nextIdentity = row.type === "tour" ? tourResolutionKey(event) : null;
    if (previousIdentity && previousIdentity === nextIdentity) return;
    cancelTourWork(rowId);
    if (previousIdentity) removeUnusedTourConfirmation(previousIdentity);
    if (row.type === "tour" && event.trim()) scheduleTourResolution(rowId);
  }

  function updateType(rowId: string, type: EventType) {
    const row = findRow(rowId);
    if (!row || row.type === type) return;
    const previousIdentity = row.type === "tour" ? tourResolutionKey(row.event) : null;
    cancelTourWork(rowId);
    row.type = type;
    if (previousIdentity) removeUnusedTourConfirmation(previousIdentity);
    if (type === "tour" && row.event.trim()) scheduleTourResolution(rowId);
  }

  function removeUnusedTourConfirmation(identity: string) {
    if (!rows.value.some((row) => row.type === "tour" && tourResolutionKey(row.event) === identity))
      confirmedTours.delete(identity);
  }

  function retryTour(rowId: string) {
    const row = findRow(rowId);
    if (row?.type === "tour" && row.event.trim()) scheduleTourResolution(rowId, true);
  }

  function selectTourCandidate(rowId: string, candidateId: string) {
    const state = tourStates[rowId];
    if (
      !state ||
      state.status !== "ambiguous" ||
      !state.result ||
      state.result.status !== "ambiguous"
    )
      return;
    if (state.result.candidates.some((candidate) => candidate.id === candidateId))
      state.selectedCandidateId = candidateId;
  }

  function confirmTour(rowId: string) {
    const row = findRow(rowId);
    const source = tourStates[rowId];
    if (!row || row.type !== "tour" || !source?.result) return;
    const result = source.result;
    const candidates: readonly EntityCandidate[] =
      result.status === "existing"
        ? [result.entity]
        : result.status === "ambiguous"
          ? result.candidates
          : [];
    const selected = candidates.find((candidate) => candidate.id === source.selectedCandidateId);
    if (!selected) return;
    const identity = tourResolutionKey(row.event);
    confirmedTours.set(identity, selected.id);
    for (const candidateRow of rows.value) {
      if (candidateRow.type !== "tour" || tourResolutionKey(candidateRow.event) !== identity)
        continue;
      const state = tourStates[candidateRow.id];
      if (!state?.result || state.result.status !== result.status) continue;
      if (state.result.status === "existing" && state.result.entity.id !== selected.id) continue;
      if (
        state.result.status === "ambiguous" &&
        !state.result.candidates.some((candidate) => candidate.id === selected.id)
      )
        continue;
      state.selectedCandidateId = selected.id;
      state.confirmedTourId = selected.id;
    }
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
    state.draftError = null;
    if (!splitLineupNames(draft).length) return;
    void resolveDraft(rowId, version);
  }

  function commitLineupDraft(rowId: string) {
    const state = lineupStates[rowId];
    if (!state || state.draftStatus === "error") return;
    if (state.draftStatus === "resolving") {
      artistResolution.flush();
      return;
    }
    void resolveDraft(rowId, draftVersions.get(rowId) ?? 0);
  }

  function retryLineupDraft(rowId: string) {
    const state = lineupStates[rowId];
    if (!state || !splitLineupNames(state.draft).length) return;
    state.draftStatus = "idle";
    state.draftError = null;
    const version = cancelDraftWork(rowId);
    void resolveDraft(rowId, version, true);
  }

  function updateLineupItemName(rowId: string, itemKey: string, name: string) {
    const item = findItem(rowId, itemKey);
    const state = lineupStates[rowId];
    if (!item || !state || item.name === name) return;

    item.name = name;
    item.artistId = null;
    delete state.itemStatus[itemKey];
    delete state.itemResolution[itemKey];
    const version = cancelItemWork(itemKey);
    if (!name.trim()) return;

    void resolveEditedItem(rowId, itemKey, version);
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
    ) {
      if (state.itemStatus[itemKey] === "resolving") artistResolution.flush();
      return;
    }

    void resolveEditedItem(rowId, itemKey, itemVersions.get(itemKey) ?? 0, true);
  }

  function retryLineupItem(rowId: string, itemKey: string) {
    const item = findItem(rowId, itemKey);
    if (!item || !item.name.trim()) return;
    const state = lineupStates[rowId];
    if (state) delete state.itemStatus[itemKey];
    const version = cancelItemWork(itemKey);
    void resolveEditedItem(rowId, itemKey, version, true);
  }

  function removeLineupItem(rowId: string, itemKey: string) {
    const row = findRow(rowId);
    const state = lineupStates[rowId];
    if (!row || !state) return;
    cancelItemWork(itemKey);
    itemVersions.delete(itemKey);
    row.lineup = row.lineup.filter((item) => item.key !== itemKey);
    delete state.itemStatus[itemKey];
    delete state.itemResolution[itemKey];
  }

  function removeRow(rowId: string) {
    const row = findRow(rowId);
    if (!row) return;
    const tourIdentity = row.type === "tour" ? tourResolutionKey(row.event) : null;
    cancelDraftWork(rowId);
    cancelVenueWork(rowId);
    const localityTimer = localityTimers.get(rowId);
    if (localityTimer) clearTimeout(localityTimer);
    localityTimers.delete(rowId);
    draftVersions.delete(rowId);
    localityVersions.delete(rowId);
    venueVersions.delete(rowId);
    for (const item of row.lineup) cancelItemWork(item.key);
    for (const item of row.lineup) itemVersions.delete(item.key);
    rows.value = rows.value.filter((candidate) => candidate.id !== rowId);
    delete lineupStates[rowId];
    delete geographyStates[rowId];
    delete tourStates[rowId];
    nextVersion(tourVersions, rowId);
    tourVersions.delete(rowId);
    if (tourIdentity) removeUnusedTourConfirmation(tourIdentity);
  }

  function setRowCount(count: number): boolean {
    if (!Number.isInteger(count) || count < 0) return false;

    while (rows.value.length < count) addRow();
    while (rows.value.length > count) {
      const lastRow = rows.value.at(-1);
      if (!lastRow) break;
      removeRow(lastRow.id);
    }

    return true;
  }

  onScopeDispose(() => {
    disposed = true;
    localityTimers.forEach(clearTimeout);
    localityTimers.clear();
    artistResolution.dispose();
    geographyResolution.dispose();
    tourResolution.dispose();
  });

  return {
    rows,
    lineupStates,
    geographyStates,
    tourStates,
    addRow,
    updateEvent,
    updateType,
    updateTypeRange,
    retryTour,
    confirmTour,
    selectTourCandidate,
    updateTextField,
    updateTextRange,
    updateDate,
    updateDateRange,
    updateVenue,
    updateCity,
    updateProvince,
    invalidateGeographicAssociations,
    selectAdministrativeRegion,
    selectLocalityCandidate,
    commitVenue,
    retryVenue,
    retryLocality,
    updateLineupDraft,
    commitLineupDraft,
    retryLineupDraft,
    updateLineupItemName,
    commitLineupItemName,
    retryLineupItem,
    removeLineupItem,
    removeRow,
    setRowCount,
  };
}
