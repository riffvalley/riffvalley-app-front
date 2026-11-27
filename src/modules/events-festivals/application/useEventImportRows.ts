import type { QueryClient } from "@tanstack/vue-query";
import { onScopeDispose, reactive, ref, shallowRef } from "vue";
import type { ArtistResolutionResult } from "../api/artistResolution";
import type { VenueResolutionResult } from "@/modules/venues";
import type {
  LocalityInspectionResult,
  LocalityResolutionCandidate,
  TourResolutionResult,
  EntityCandidate,
} from "../api/entityResolutionContracts";
import { ENTITY_RESOLUTION_BATCH_LIMIT } from "../api/entityResolutionContracts";
import { artistResolutionKey, geographyContextKey } from "./entityResolutionIdentity";
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

export interface ImportedEventInput {
  type: "concert" | "festival" | "tour";
  title: string;
  startDate: string;
  endDate: string;
  artists: string[];
  venue: string;
  locality: string;
  province: string;
  administrativeRegionId: string | null;
  price: string;
  additionalInfo: string;
}

export type LocalityResolutionStatus =
  "idle" | "resolving" | "existing" | "new" | "ambiguous" | "invalid" | "error";
export type VenueResolutionStatus =
  "idle" | "resolving" | "existing" | "new" | "ambiguous" | "error";
export interface EventGeographyState {
  localityStatus: LocalityResolutionStatus;
  localityCandidates: LocalityResolutionCandidate[];
  selectedLocality: LocalityResolutionCandidate | null;
  localitySelectionOriginalContext: {
    province: string;
    administrativeRegionId: string | null;
  } | null;
  localityResult: LocalityInspectionResult | null;
  localityError: string | null;
  venueStatus: VenueResolutionStatus;
  venueCandidates: VenueResolutionResult["candidates"];
  selectedVenueCandidateId: string | null;
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

export interface EventImportRowsWorkspace {
  rows: EventImportRow[];
  lineupStates: Record<string, LineupCellState>;
  geographyStates: Record<string, EventGeographyState>;
  tourStates: Record<string, EventTourState>;
  bulkResolutionStatus: string;
  bulkResolutionPhases: EventImportResolutionPhase[];
  confirmedTours: Array<[string, string]>;
}

export interface EventImportResolutionPhase {
  id: "artists" | "geography" | "venues" | "tours" | "validation";
  label: string;
  status: "pending" | "in-progress" | "complete" | "error";
  processed: number;
  total: number;
  errors: number;
}

function emptyResolutionPhases(): EventImportResolutionPhase[] {
  return [
    { id: "artists", label: "Artistas", status: "pending", processed: 0, total: 0, errors: 0 },
    {
      id: "geography",
      label: "Localidades y regiones",
      status: "pending",
      processed: 0,
      total: 0,
      errors: 0,
    },
    {
      id: "venues",
      label: "Salas y recintos",
      status: "pending",
      processed: 0,
      total: 0,
      errors: 0,
    },
    { id: "tours", label: "Giras", status: "pending", processed: 0, total: 0, errors: 0 },
    {
      id: "validation",
      label: "Preparación y validación",
      status: "pending",
      processed: 0,
      total: 0,
      errors: 0,
    },
  ];
}

const INITIAL_ROW_COUNT = 5;
const emptyGeographyState = (): EventGeographyState => ({
  localityStatus: "idle",
  localityCandidates: [],
  selectedLocality: null,
  localitySelectionOriginalContext: null,
  localityResult: null,
  localityError: null,
  venueStatus: "idle",
  venueCandidates: [],
  selectedVenueCandidateId: null,
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
  const bulkResolutionStatus = shallowRef("");
  const bulkResolutionPhases = ref(emptyResolutionPhases());
  const artistResolution = useEventEntityResolution(queryClient);
  const geographyResolution = useEventGeographyResolution(queryClient);
  const tourResolution = useEventTourResolution(queryClient);
  const itemVersions = new Map<string, number>();
  const geographyStates = reactive<Record<string, EventGeographyState>>({});
  const tourStates = reactive<Record<string, EventTourState>>({});
  const tourVersions = new Map<string, number>();
  const confirmedTours = new Map<string, string>();
  const venueVersions = new Map<string, number>();
  const localityVersions = new Map<string, number>();
  const localityTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const restoredArtistSelections = new Map<string, string>();
  const restoredLocalitySelections = new Map<string, string>();
  const restoredVenueSelections = new Map<string, string>();
  const restoredTourSelections = new Map<string, string>();
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

  function cancelItemWork(itemKey: string) {
    return nextVersion(itemVersions, itemKey);
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
      const confirmedId = confirmedTours.get(tourResolutionKey(requestedName));
      const candidates =
        result.status === "existing"
          ? [result.entity]
          : result.status === "ambiguous"
            ? result.candidates
            : [];
      const restoredConfirmation = candidates.some((candidate) => candidate.id === confirmedId)
        ? (confirmedId ?? null)
        : null;
      const restoredSelection = restoredTourSelections.get(rowId);
      state.selectedCandidateId = candidates.some(({ id }) => id === restoredSelection)
        ? (restoredSelection ?? null)
        : (restoredConfirmation ?? (result.status === "existing" ? result.entity.id : null));
      state.confirmedTourId = restoredConfirmation;
      restoredTourSelections.delete(rowId);
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
      state.selectedVenueCandidateId = null;
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
      state.selectedVenueCandidateId = null;
      current.venue.venueId = result.status === "existing" ? result.venue.id : null;
      const restoredVenueId = restoredVenueSelections.get(rowId);
      if (
        result.status === "ambiguous" &&
        restoredVenueId &&
        result.candidates.some(({ id }) => id === restoredVenueId)
      ) {
        state.selectedVenueCandidateId = restoredVenueId;
        current.venue.venueId = restoredVenueId;
      }
      restoredVenueSelections.delete(rowId);
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
      } else if (result.status === "ambiguous") {
        const restoredLocalityId = restoredLocalitySelections.get(rowId);
        restoredLocalitySelections.delete(rowId);
        if (restoredLocalityId && result.candidates.some(({ id }) => id === restoredLocalityId)) {
          state.localityCandidates = result.candidates;
          selectLocalityCandidate(rowId, restoredLocalityId);
        } else {
          current.venue.localityId = null;
          current.venue.venueId = null;
          cancelVenueWork(rowId);
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
      state.localitySelectionOriginalContext = null;
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
    if (!localityId && row && state?.localityResult?.status === "ambiguous") {
      const original = state.localitySelectionOriginalContext;
      state.selectedLocality = null;
      state.localitySelectionOriginalContext = null;
      state.localityStatus = "ambiguous";
      row.administrativeRegionId =
        original?.administrativeRegionId ??
        state.localityResult.input.administrativeRegionId ??
        null;
      row.province = original?.province ?? row.province;
      row.venue.localityId = null;
      row.venue.venueId = null;
      cancelVenueWork(rowId);
      return;
    }
    const candidate = state?.localityCandidates.find(({ id }) => id === localityId);
    const originalContext =
      state?.localitySelectionOriginalContext ??
      (row ? { province: row.province, administrativeRegionId: row.administrativeRegionId } : null);
    if (
      !row ||
      !state ||
      !candidate ||
      candidate.country.id !== countryId ||
      (originalContext?.administrativeRegionId &&
        originalContext.administrativeRegionId !== candidate.administrativeRegion.id) ||
      (originalContext?.province.trim() &&
        geographyContextKey(candidate.province ?? "") &&
        geographyContextKey(candidate.province ?? "") !==
          geographyContextKey(originalContext.province))
    )
      return;
    const version = cancelVenueWork(rowId);
    if (!state.localitySelectionOriginalContext) {
      state.localitySelectionOriginalContext = {
        province: row.province,
        administrativeRegionId: row.administrativeRegionId,
      };
    }
    // Keep the editor's administrative context alongside the explicitly selected identity.
    row.administrativeRegionId = candidate.administrativeRegion.id;
    row.province = originalContext?.province.trim()
      ? originalContext.province
      : (candidate.province ?? "");
    row.venue.localityId = candidate.id;
    row.venue.venueId = null;
    state.localityStatus = "existing";
    state.selectedLocality = candidate;
    if (row.venue.name.trim()) void resolveVenue(rowId, version, true);
  }

  function selectVenueCandidate(rowId: string, venueId: string) {
    const row = findRow(rowId);
    const state = geographyStates[rowId];
    const candidate = state?.venueCandidates.find(({ id }) => id === venueId);
    if (!row || !state || state.venueStatus !== "ambiguous") return;
    if (!venueId) {
      state.selectedVenueCandidateId = null;
      row.venue.venueId = null;
      return;
    }
    if (!candidate) return;
    if (!row.venue.localityId || !row.venue.name.trim()) return;
    state.selectedVenueCandidateId = candidate.id;
    row.venue.venueId = candidate.id;
  }

  function selectArtistCandidate(rowId: string, itemKey: string, artistId: string) {
    const item = findItem(rowId, itemKey);
    const state = lineupStates[rowId];
    const result = state?.itemResolution[itemKey];
    if (!item || !state || result?.status !== "ambiguous") return;
    if (!artistId) {
      item.artistId = null;
      return;
    }
    if (result.candidates.some(({ id }) => id === artistId)) item.artistId = artistId;
  }

  function addConfirmedLineupNames(rowId: string, values: readonly string[]) {
    const row = findRow(rowId);
    const state = lineupStates[rowId];
    if (!row || !state) return;
    const names = values.map((value) => value.trim()).filter(Boolean);
    if (!names.length) return;

    const items = names.map((name) => ({
      key: `lineup-item-${nextLineupItemKey++}`,
      name,
      artistId: null,
    }));
    row.lineup.push(...items);
    items.forEach((item) => {
      const version = nextVersion(itemVersions, item.key);
      state.itemStatus[item.key] = "resolving";
      void resolveEditedItem(rowId, item.key, version);
    });
  }

  function confirmLineupDraft(rowId: string, pastedNames?: readonly string[]) {
    const state = lineupStates[rowId];
    if (!state) return;
    const names = pastedNames ?? [state.draft.trim()];
    state.draft = "";
    state.draftStatus = "idle";
    state.draftError = null;
    addConfirmedLineupNames(rowId, names);
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
        artistResolutionKey(currentItem.name) !== artistResolutionKey(name)
      ) {
        return;
      }

      currentItem.artistId = result?.status === "existing" ? result.artist.id : null;
      const restoredArtistId = restoredArtistSelections.get(itemKey);
      if (
        result?.status === "ambiguous" &&
        restoredArtistId &&
        result.candidates.some(({ id }) => id === restoredArtistId)
      ) {
        currentItem.artistId = restoredArtistId;
      }
      restoredArtistSelections.delete(itemKey);
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

  function appendImportedRows(importedRows: readonly ImportedEventInput[]) {
    const isEmpty = (row: EventImportRow) =>
      !row.event.trim() &&
      row.lineup.length === 0 &&
      !row.startDateDraft.trim() &&
      !row.endDateDraft.trim() &&
      !row.city.trim() &&
      !row.province.trim() &&
      !row.venue.name.trim() &&
      !row.price.trim() &&
      !row.otherInfo.trim();
    let cursor = 0;
    for (const imported of importedRows) {
      while (cursor < rows.value.length && !isEmpty(rows.value[cursor]!)) cursor++;
      if (cursor >= rows.value.length) addRow();
      const row = rows.value[cursor++]!;
      updateType(row.id, imported.type);
      updateEvent(row.id, imported.title);
      updateDate(row.id, "startDate", calendarInput(imported.startDate));
      updateDate(row.id, "endDate", calendarInput(imported.endDate));
      updateCity(row.id, imported.locality);
      updateProvince(row.id, imported.province);
      if (imported.administrativeRegionId)
        selectAdministrativeRegion(row.id, imported.administrativeRegionId);
      updateVenue(row.id, imported.venue);
      updateTextField(row.id, "price", imported.price);
      updateTextField(row.id, "otherInfo", imported.additionalInfo);
      addConfirmedLineupNames(row.id, imported.artists);
    }
  }

  async function appendImportedRowsAndResolve(importedRows: readonly ImportedEventInput[]) {
    const isEmpty = (row: EventImportRow) =>
      !row.event.trim() &&
      row.lineup.length === 0 &&
      !row.startDateDraft.trim() &&
      !row.endDateDraft.trim() &&
      !row.city.trim() &&
      !row.province.trim() &&
      !row.venue.name.trim() &&
      !row.price.trim() &&
      !row.otherInfo.trim() &&
      !row.administrativeRegionId;
    let cursor = 0;
    const importedRowIds: string[] = [];
    for (const imported of importedRows) {
      while (cursor < rows.value.length && !isEmpty(rows.value[cursor]!)) cursor++;
      if (cursor >= rows.value.length) addRow();
      const row = rows.value[cursor++]!;
      row.type = imported.type;
      row.event = imported.title;
      updateDate(row.id, "startDate", calendarInput(imported.startDate));
      updateDate(row.id, "endDate", calendarInput(imported.endDate));
      row.city = imported.locality;
      row.province = imported.province;
      row.administrativeRegionId = imported.administrativeRegionId;
      row.venue = { name: imported.venue, venueId: null, localityId: null };
      row.price = imported.price;
      row.otherInfo = imported.additionalInfo;
      row.lineup = imported.artists.map((name) => ({
        key: `lineup-item-${nextLineupItemKey++}`,
        name,
        artistId: null,
      }));
      importedRowIds.push(row.id);
      lineupStates[row.id] = {
        draft: "",
        draftStatus: "idle",
        itemStatus: Object.fromEntries(row.lineup.map(({ key }) => [key, "resolving"])),
        draftError: null,
        itemResolution: {},
      };
      geographyStates[row.id] = {
        ...emptyGeographyState(),
        localityStatus: row.city.trim() ? "resolving" : "idle",
      };
      tourStates[row.id] = {
        ...emptyTourState(),
        status: row.type === "tour" && row.event.trim() ? "resolving" : "idle",
      };
      for (const item of row.lineup) nextVersion(itemVersions, item.key);
      nextVersion(localityVersions, row.id);
      nextVersion(venueVersions, row.id);
      if (row.type === "tour") nextVersion(tourVersions, row.id);
    }
    await resolveImportedReferences(importedRowIds);
    return importedRowIds;
  }

  async function resolveImportedReferences(rowIds: readonly string[]) {
    const importedIds = new Set(rowIds);
    const imported = rows.value.filter(({ id }) => importedIds.has(id));
    const rowById = new Map(imported.map((row) => [row.id, row]));
    const artists = new Map<
      string,
      { name: string; rows: Array<{ rowId: string; itemKey: string; version: number }> }
    >();
    const localities = new Map<
      string,
      {
        input: import("../api/entityResolutionContracts").LocalityInspectionInput;
        rows: Array<{ rowId: string; version: number }>;
      }
    >();
    const tours = new Map<
      string,
      { name: string; rows: Array<{ rowId: string; version: number }> }
    >();
    for (const row of imported) {
      for (const item of row.lineup) {
        const key = artistResolutionKey(item.name);
        const entry = artists.get(key) ?? { name: item.name.trim(), rows: [] };
        entry.rows.push({
          rowId: row.id,
          itemKey: item.key,
          version: itemVersions.get(item.key) ?? 0,
        });
        artists.set(key, entry);
      }
      if (row.city.trim() && countryId) {
        const input = {
          name: row.city,
          countryId,
          ...(row.administrativeRegionId
            ? { administrativeRegionId: row.administrativeRegionId }
            : {}),
          ...(row.province.trim() ? { province: row.province } : {}),
        };
        const key = localityIdentity(input);
        const entry = localities.get(key) ?? { input, rows: [] };
        entry.rows.push({ rowId: row.id, version: localityVersions.get(row.id) ?? 0 });
        localities.set(key, entry);
      }
      if (row.type === "tour" && row.event.trim()) {
        const key = tourResolutionKey(row.event);
        const entry = tours.get(key) ?? { name: row.event.trim(), rows: [] };
        entry.rows.push({ rowId: row.id, version: tourVersions.get(row.id) ?? 0 });
        tours.set(key, entry);
      }
    }

    async function resolveGroups<T>(
      entries: Array<[string, T]>,
      resolveBatch: (batch: T[]) => Promise<unknown[]>,
      apply: (key: string, result: unknown) => void,
      markError: (key: string, error: unknown) => void,
      phase: EventImportResolutionPhase
    ) {
      const batches: Array<Array<[string, T]>> = [];
      for (let offset = 0; offset < entries.length; offset += ENTITY_RESOLUTION_BATCH_LIMIT)
        batches.push(entries.slice(offset, offset + ENTITY_RESOLUTION_BATCH_LIMIT));
      let nextBatch = 0;
      const workers = Array.from({ length: Math.min(3, batches.length) }, async () => {
        while (nextBatch < batches.length) {
          const batch = batches[nextBatch++]!;
          try {
            const results = await resolveBatch(batch.map(([, entry]) => entry));
            batch.forEach(([key], index) => {
              const result = results[index];
              if (result === undefined) {
                phase.errors++;
                markError(key, new Error("Respuesta incompleta del resolvedor."));
              } else apply(key, result);
              phase.processed++;
            });
          } catch (error) {
            batch.forEach(([key]) => {
              markError(key, error);
              phase.errors++;
              phase.processed++;
            });
          }
        }
      });
      await Promise.all(workers);
    }

    bulkResolutionPhases.value = emptyResolutionPhases();
    const [artistPhase, geographyPhase, venuePhase, tourPhase] = bulkResolutionPhases.value;
    artistPhase!.total = artists.size;
    geographyPhase!.total = localities.size;
    venuePhase!.total = 0;
    tourPhase!.total = tours.size;
    artistPhase!.status = "in-progress";
    bulkResolutionStatus.value = "Resolviendo artistas…";
    await resolveGroups(
      [...artists],
      (batch) =>
        artistResolution.resolve(
          batch.map(({ name }) => name),
          true
        ),
      (key, value) => {
        const result = value as ArtistResolutionResult;
        for (const reference of artists.get(key)?.rows ?? []) {
          const state = lineupStates[reference.rowId];
          const item = rowById
            .get(reference.rowId)
            ?.lineup.find(({ key: itemKey }) => itemKey === reference.itemKey);
          if (
            !state ||
            !item ||
            itemVersions.get(reference.itemKey) !== reference.version ||
            disposed
          )
            continue;
          item.artistId = result.status === "existing" ? result.artist.id : null;
          state.itemResolution[reference.itemKey] = result;
          delete state.itemStatus[reference.itemKey];
        }
      },
      (key, error) => {
        for (const reference of artists.get(key)?.rows ?? []) {
          const state = lineupStates[reference.rowId];
          if (!state || itemVersions.get(reference.itemKey) !== reference.version) continue;
          state.itemStatus[reference.itemKey] = "error";
          state.itemResolution[reference.itemKey] = {
            status: "error",
            message: errorMessage(error),
          };
        }
      },
      artistPhase!
    );

    artistPhase!.status = artistPhase!.errors ? "error" : "complete";
    geographyPhase!.status = "in-progress";
    bulkResolutionStatus.value = "Resolviendo localidades…";
    const localityResults = new Map<string, LocalityInspectionResult>();
    await resolveGroups(
      [...localities],
      (batch) =>
        geographyResolution.resolveLocalities(
          batch.map((entry) => entry.input),
          true
        ),
      (key, result) => localityResults.set(key, result as LocalityInspectionResult),
      (key, error) => {
        for (const { rowId, version } of localities.get(key)?.rows ?? []) {
          const state = geographyStates[rowId];
          if (state && localityVersions.get(rowId) === version) {
            state.localityStatus = "error";
            state.localityError = errorMessage(error);
          }
        }
      },
      geographyPhase!
    );
    for (const [key, result] of localityResults) {
      for (const { rowId, version } of localities.get(key)?.rows ?? []) {
        const row = rowById.get(rowId);
        const state = geographyStates[rowId];
        if (!row || !state || disposed || localityVersions.get(rowId) !== version) continue;
        state.localityResult = result;
        state.localityStatus = result.status;
        state.localityCandidates = result.status === "ambiguous" ? result.candidates : [];
        if (result.status === "existing") {
          state.selectedLocality = result.locality;
          row.venue.localityId = result.locality.id;
          if (row.venue.name.trim()) state.venueStatus = "resolving";
        }
      }
    }

    geographyPhase!.status = geographyPhase!.errors ? "error" : "complete";
    bulkResolutionStatus.value = "Resolviendo recintos…";
    const venues = new Map<
      string,
      {
        input: { name: string; localityId: string };
        rows: Array<{ rowId: string; version: number }>;
      }
    >();
    for (const row of imported) {
      if (!row.venue.name.trim() || !row.venue.localityId) continue;
      const input = { name: row.venue.name, localityId: row.venue.localityId };
      const key = venueIdentity(input);
      const entry = venues.get(key) ?? { input, rows: [] };
      entry.rows.push({ rowId: row.id, version: venueVersions.get(row.id) ?? 0 });
      venues.set(key, entry);
    }
    venuePhase!.total = venues.size;
    venuePhase!.status = "in-progress";
    await resolveGroups(
      [...venues],
      (batch) =>
        geographyResolution.resolveVenues(
          batch.map((entry) => entry.input),
          true
        ),
      (key, value) => {
        const result = value as VenueResolutionResult;
        for (const { rowId, version } of venues.get(key)?.rows ?? []) {
          const row = rowById.get(rowId);
          const state = geographyStates[rowId];
          if (
            !row ||
            !state ||
            disposed ||
            venueVersions.get(rowId) !== version ||
            venueIdentity({ name: row.venue.name, localityId: row.venue.localityId ?? "" }) !== key
          )
            continue;
          state.venueStatus = result.status;
          state.venueCandidates = result.candidates;
          row.venue.venueId = result.status === "existing" ? result.venue.id : null;
        }
      },
      (key, error) => {
        for (const { rowId, version } of venues.get(key)?.rows ?? []) {
          const state = geographyStates[rowId];
          if (state && venueVersions.get(rowId) === version) {
            state.venueStatus = "error";
            state.venueError = errorMessage(error);
          }
        }
      },
      venuePhase!
    );

    venuePhase!.status = venuePhase!.errors ? "error" : "complete";
    tourPhase!.status = "in-progress";
    bulkResolutionStatus.value = "Resolviendo giras…";
    await resolveGroups(
      [...tours],
      (batch) =>
        tourResolution.resolve(
          batch.map(({ name }) => name),
          true
        ),
      (key, value) => {
        const result = value as TourResolutionResult;
        for (const { rowId, version } of tours.get(key)?.rows ?? []) {
          const state = tourStates[rowId];
          if (
            !state ||
            disposed ||
            tourVersions.get(rowId) !== version ||
            tourResolutionKey(rowById.get(rowId)?.event ?? "") !== key
          )
            continue;
          state.result = result;
          state.status = result.status;
          state.selectedCandidateId = result.status === "existing" ? result.entity.id : null;
        }
      },
      (key, error) => {
        for (const { rowId, version } of tours.get(key)?.rows ?? []) {
          const state = tourStates[rowId];
          if (state && tourVersions.get(rowId) === version) {
            state.status = "error";
            state.error = errorMessage(error);
          }
        }
      },
      tourPhase!
    );
    tourPhase!.status = tourPhase!.errors ? "error" : "complete";
    bulkResolutionStatus.value = "";
  }

  function calendarInput(isoDate: string): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(isoDate);
    return match ? `${Number(match[3])}/${Number(match[2])}/${match[1]}` : isoDate;
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
    const row = findRow(rowId);
    const state = tourStates[rowId];
    if (
      !row ||
      row.type !== "tour" ||
      !state ||
      state.status !== "ambiguous" ||
      !state.result ||
      state.result.status !== "ambiguous"
    )
      return;
    if (candidateId && !state.result.candidates.some((candidate) => candidate.id === candidateId))
      return;
    if (state.selectedCandidateId === candidateId) return;
    const identity = tourResolutionKey(row.event);
    confirmedTours.delete(identity);
    rows.value.forEach((candidateRow) => {
      if (candidateRow.type !== "tour" || tourResolutionKey(candidateRow.event) !== identity)
        return;
      const candidateState = tourStates[candidateRow.id];
      if (candidateState) candidateState.confirmedTourId = null;
    });
    state.selectedCandidateId = candidateId || null;
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

    state.draft = draft;
    state.draftStatus = "idle";
    state.draftError = null;
  }

  function pasteLineupRange(startIndex: number, values: readonly (readonly string[])[]) {
    while (rows.value.length < startIndex + values.length) addRow();
    values.forEach((names, offset) => {
      const row = rows.value[startIndex + offset];
      if (row) addConfirmedLineupNames(row.id, names);
    });
  }

  function commitLineupDraft(rowId: string) {
    confirmLineupDraft(rowId);
  }

  function updateLineupItemName(rowId: string, itemKey: string, name: string) {
    const item = findItem(rowId, itemKey);
    const state = lineupStates[rowId];
    if (!item || !state || item.name === name) return;

    const sameIdentity = artistResolutionKey(item.name) === artistResolutionKey(name);
    item.name = name;
    if (sameIdentity) return;
    item.artistId = null;
    delete state.itemStatus[itemKey];
    delete state.itemResolution[itemKey];
    cancelItemWork(itemKey);
    if (!name.trim()) return;
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
    if (state.itemStatus[itemKey] === "resolving") return;
    delete state.itemStatus[itemKey];
    const version = cancelItemWork(itemKey);
    void resolveEditedItem(rowId, itemKey, version, true);
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
    removeRows([rowId]);
  }

  function removeRows(rowIds: readonly string[]) {
    const ids = new Set(rowIds);
    const removedRows = rows.value.filter(({ id }) => ids.has(id));
    if (!removedRows.length) return;
    const removedTourIdentities = new Set<string>();
    rows.value = rows.value.filter(({ id }) => !ids.has(id));
    for (const row of removedRows) {
      if (row.type === "tour") removedTourIdentities.add(tourResolutionKey(row.event));
      cancelVenueWork(row.id);
      const localityTimer = localityTimers.get(row.id);
      if (localityTimer) clearTimeout(localityTimer);
      localityTimers.delete(row.id);
      localityVersions.delete(row.id);
      venueVersions.delete(row.id);
      for (const item of row.lineup) cancelItemWork(item.key);
      for (const item of row.lineup) itemVersions.delete(item.key);
      delete lineupStates[row.id];
      delete geographyStates[row.id];
      delete tourStates[row.id];
      nextVersion(tourVersions, row.id);
      tourVersions.delete(row.id);
    }
    removedTourIdentities.forEach(removeUnusedTourConfirmation);
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

  function restoreRows(
    savedRows: EventImportRow[],
    savedLineupStates: Record<string, LineupCellState>,
    savedTourStates: Record<string, EventTourState>
  ) {
    bulkResolutionStatus.value = "";
    bulkResolutionPhases.value = emptyResolutionPhases();
    rows.value.forEach((row) => {
      delete lineupStates[row.id];
      delete geographyStates[row.id];
      delete tourStates[row.id];
    });
    confirmedTours.clear();
    restoredArtistSelections.clear();
    restoredLocalitySelections.clear();
    restoredVenueSelections.clear();
    restoredTourSelections.clear();
    rows.value = savedRows.map((saved) => ({
      ...saved,
      lineup: saved.lineup.map((item) => ({ ...item, artistId: null })),
      venue: { ...saved.venue },
    }));
    for (const row of rows.value) {
      const savedState = savedLineupStates[row.id];
      lineupStates[row.id] = {
        draft: savedState?.draft ?? "",
        draftStatus: "idle",
        itemStatus: {},
        draftError: null,
        itemResolution: {},
      };
      geographyStates[row.id] = emptyGeographyState();
      const savedTour = savedTourStates[row.id];
      tourStates[row.id] = emptyTourState();
      if (savedTour?.confirmedTourId) {
        confirmedTours.set(tourResolutionKey(row.event), savedTour.confirmedTourId);
      }
      if (savedTour?.selectedCandidateId)
        restoredTourSelections.set(row.id, savedTour.selectedCandidateId);
      if (savedRowsSelection(savedRows, row.id)?.venue.localityId)
        restoredLocalitySelections.set(
          row.id,
          savedRowsSelection(savedRows, row.id)!.venue.localityId!
        );
      if (savedRowsSelection(savedRows, row.id)?.venue.venueId)
        restoredVenueSelections.set(row.id, savedRowsSelection(savedRows, row.id)!.venue.venueId!);
      const rowNumber = /^event-row-(\d+)$/u.exec(row.id)?.[1];
      if (rowNumber) nextRowId = Math.max(nextRowId, Number(rowNumber) + 1);
      for (const item of row.lineup) {
        const originalItem = savedRowsSelection(savedRows, row.id)?.lineup.find(
          ({ key }) => key === item.key
        );
        if (originalItem?.artistId) restoredArtistSelections.set(item.key, originalItem.artistId);
        const itemNumber = /^lineup-item-(\d+)$/u.exec(item.key)?.[1];
        if (itemNumber) nextLineupItemKey = Math.max(nextLineupItemKey, Number(itemNumber) + 1);
        const version = cancelItemWork(item.key);
        void resolveEditedItem(row.id, item.key, version, true);
      }
      if (row.city.trim()) scheduleLocalityResolution(row.id, true);
      if (row.type === "tour" && row.event.trim()) scheduleTourResolution(row.id, true);
    }
  }

  function savedRowsSelection(savedRows: EventImportRow[], rowId: string) {
    return savedRows.find(({ id }) => id === rowId);
  }

  function resetRows() {
    rows.value.forEach((row) => removeRow(row.id));
    rows.value = Array.from({ length: INITIAL_ROW_COUNT }, createRow);
    confirmedTours.clear();
    bulkResolutionStatus.value = "";
    bulkResolutionPhases.value = emptyResolutionPhases();
  }

  function restoreResolutionPhases(phases?: EventImportResolutionPhase[]) {
    bulkResolutionPhases.value = phases ?? emptyResolutionPhases();
  }

  function completeImportValidation() {
    const validation = bulkResolutionPhases.value.find(({ id }) => id === "validation");
    if (validation) validation.status = "complete";
  }

  function captureWorkspace(): EventImportRowsWorkspace {
    return {
      rows: rows.value,
      lineupStates: { ...lineupStates },
      geographyStates: { ...geographyStates },
      tourStates: { ...tourStates },
      bulkResolutionStatus: bulkResolutionStatus.value,
      bulkResolutionPhases: bulkResolutionPhases.value,
      confirmedTours: [...confirmedTours.entries()],
    };
  }

  function restoreWorkspace(workspace: EventImportRowsWorkspace) {
    for (const key of Object.keys(lineupStates)) delete lineupStates[key];
    for (const key of Object.keys(geographyStates)) delete geographyStates[key];
    for (const key of Object.keys(tourStates)) delete tourStates[key];
    Object.assign(lineupStates, workspace.lineupStates);
    Object.assign(geographyStates, workspace.geographyStates);
    Object.assign(tourStates, workspace.tourStates);
    confirmedTours.clear();
    workspace.confirmedTours.forEach(([identity, tourId]) => confirmedTours.set(identity, tourId));
    rows.value = workspace.rows;
    bulkResolutionStatus.value = workspace.bulkResolutionStatus;
    bulkResolutionPhases.value = workspace.bulkResolutionPhases ?? emptyResolutionPhases();
  }

  function hasActiveResolution(): boolean {
    return (
      localityTimers.size > 0 ||
      Object.values(lineupStates).some(
        (state) =>
          state.draftStatus === "resolving" ||
          Object.values(state.itemStatus).some((status) => status === "resolving")
      ) ||
      Object.values(geographyStates).some(
        (state) => state.localityStatus === "resolving" || state.venueStatus === "resolving"
      ) ||
      Object.values(tourStates).some((state) => state.status === "resolving")
    );
  }

  function setWorkspaceCountryContext(nextCountryId: string) {
    countryId = nextCountryId;
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
    bulkResolutionStatus,
    bulkResolutionPhases,
    addRow,
    captureWorkspace,
    restoreWorkspace,
    restoreResolutionPhases,
    completeImportValidation,
    hasActiveResolution,
    setWorkspaceCountryContext,
    appendImportedRows,
    appendImportedRowsAndResolve,
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
    selectVenueCandidate,
    selectArtistCandidate,
    commitVenue,
    retryVenue,
    retryLocality,
    updateLineupDraft,
    pasteLineupRange,
    commitLineupDraft,
    updateLineupItemName,
    commitLineupItemName,
    retryLineupItem,
    removeLineupItem,
    removeRow,
    removeRows,
    setRowCount,
    restoreRows,
    resetRows,
  };
}
