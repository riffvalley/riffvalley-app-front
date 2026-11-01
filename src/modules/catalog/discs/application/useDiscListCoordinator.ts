import { computed, onScopeDispose, ref, shallowRef, watch } from "vue";
import { useAuthStore } from "@/modules/identity/auth";
import { getDiscListOptions } from "../api/discList";
import { getDiscListYearRange } from "./discListDateFilters";
import { loadDiscList } from "./loadDiscList";
import type { SavedDiscFilterCriteria } from "../types/savedDiscFilter";
import type {
  DiscListComment,
  DiscListCardDisc,
  DiscListMode,
  DiscListOptions,
  DiscListRequest,
  DiscListResult,
  DiscListSelectedArtist,
} from "../types/discList";

export const DISC_LIST_PAGE_SIZE = 50;
const DEFAULT_ORDER = "disc.releaseDate:DESC,artist.name:ASC";
const DEFAULT_ORDER_BY_MODE: Record<DiscListMode, string> = {
  all: DEFAULT_ORDER,
  rates: DEFAULT_ORDER,
  covers: DEFAULT_ORDER,
  comments: DEFAULT_ORDER,
  favorites: DEFAULT_ORDER,
  pendientes: DEFAULT_ORDER,
};

type DiscListPageLoader = (request: DiscListRequest) => Promise<DiscListResult>;
type DiscListOptionsLoader = (request: {
  mode: DiscListMode;
  query: string;
  dateRange: [string, string] | null;
  countryId: string;
  genreIds: string[];
  artistId?: string;
}) => Promise<DiscListOptions>;
type FilterAction = "country" | "genres" | "artist" | "context" | "refresh";

interface CoordinatorLoaders {
  loadPage?: DiscListPageLoader;
  loadOptions?: DiscListOptionsLoader;
}

function normalizeGenreIds(ids: string[]): string[] {
  return [...new Set(ids.map((id) => id.trim().toLowerCase()).filter(Boolean))].sort();
}

export function useDiscListCoordinator(loaders: CoordinatorLoaders = {}) {
  const loadPage = loaders.loadPage ?? loadDiscList;
  const loadOptions = loaders.loadOptions ?? getDiscListOptions;
  const authStore = useAuthStore();
  const viewMode = ref<DiscListMode>("all");
  const searchQuery = ref("");
  const selectedWeek = shallowRef<[string, string] | null>(null);
  const selectedGenres = ref<string[]>([]);
  const selectedCountry = ref("");
  const noRatesOnly = ref(false);
  const selectedArtist = ref<DiscListSelectedArtist | null>(null);
  const orderBy = ref(DEFAULT_ORDER);
  const offset = ref(0);
  const discs = shallowRef<DiscListCardDisc[]>([]);
  const userComments = shallowRef<DiscListComment[]>([]);
  const totalItems = ref(0);
  const totalDisc = ref<number | "">("");
  const totalRates = ref<number | "">("");
  const totalCovers = ref<number | "">("");
  const totalFavorites = ref<number | "">("");
  const totalPendings = ref<number | "">("");
  const totalComments = ref<number | "">("");
  const loadingInitial = ref(false);
  const loadingMore = ref(false);
  const error = shallowRef<unknown>(null);
  const options = shallowRef<DiscListOptions>({ countries: [], genres: [] });
  const optionsLoading = ref(false);
  const optionsError = shallowRef<unknown>(null);
  const optionsSettledKey = ref<string | null>(null);
  const refreshGeneration = ref(0);
  let lastFilterAction: FilterAction = "context";

  const loading = computed(() => loadingInitial.value || loadingMore.value);
  const hasMore = computed(() => offset.value < totalItems.value);
  const normalizedGenres = computed(() => normalizeGenreIds(selectedGenres.value));
  const isAuthenticated = computed(() => authStore.isAuthenticated && Boolean(authStore.userId));
  const sessionContext = computed(() => [
    isAuthenticated.value,
    authStore.userId,
    authStore.authSessionGeneration,
  ]);
  const queryIdentity = computed(() =>
    JSON.stringify([
      viewMode.value,
      searchQuery.value.trim(),
      selectedWeek.value,
      selectedCountry.value,
      noRatesOnly.value,
      selectedArtist.value?.id ?? "",
      normalizedGenres.value,
      orderBy.value,
      refreshGeneration.value,
      sessionContext.value,
    ])
  );
  const optionsIdentity = computed(() =>
    JSON.stringify([
      viewMode.value,
      searchQuery.value.trim(),
      selectedWeek.value,
      selectedCountry.value,
      selectedArtist.value?.id ?? "",
      normalizedGenres.value,
      refreshGeneration.value,
      sessionContext.value,
    ])
  );
  const currentOptions = computed(() =>
    optionsSettledKey.value === optionsIdentity.value
      ? options.value
      : { countries: [], genres: [] }
  );
  const optionsReady = computed(() => optionsSettledKey.value === optionsIdentity.value);
  const isEmpty = computed(
    () =>
      !loading.value &&
      !error.value &&
      (viewMode.value === "comments" ? userComments.value.length === 0 : discs.value.length === 0)
  );

  let resultGeneration = 0;
  let optionsGeneration = 0;
  let disposed = false;
  const inFlightPages = new Set<string>();

  function clearResults() {
    discs.value = [];
    userComments.value = [];
    offset.value = 0;
    totalItems.value = 0;
    error.value = null;
    totalDisc.value = "";
    totalRates.value = "";
    totalCovers.value = "";
    totalFavorites.value = "";
    totalPendings.value = "";
    totalComments.value = "";
  }

  function requestForCurrentQuery(pageOffset: number): DiscListRequest {
    return {
      mode: viewMode.value,
      query: searchQuery.value.trim(),
      dateRange: selectedWeek.value ? [...selectedWeek.value] : null,
      genreIds: normalizedGenres.value,
      countryId: selectedCountry.value,
      ...(selectedArtist.value ? { artistId: selectedArtist.value.id } : {}),
      ...(viewMode.value === "all" && noRatesOnly.value ? { eligibility: "noRates" as const } : {}),
      orderBy: orderBy.value,
      offset: pageOffset,
      limit: DISC_LIST_PAGE_SIZE,
    };
  }

  function requestForCurrentOptions() {
    return {
      mode: viewMode.value,
      query: searchQuery.value.trim(),
      dateRange: selectedWeek.value ? ([...selectedWeek.value] as [string, string]) : null,
      countryId: selectedCountry.value,
      genreIds: normalizedGenres.value,
      ...(selectedArtist.value ? { artistId: selectedArtist.value.id } : {}),
    };
  }

  function setTotalForMode(mode: DiscListMode, total: number) {
    if (mode === "all") totalDisc.value = total;
    if (mode === "rates") totalRates.value = total;
    if (mode === "covers") totalCovers.value = total;
    if (mode === "comments") totalComments.value = total;
    if (mode === "favorites") totalFavorites.value = total;
    if (mode === "pendientes") totalPendings.value = total;
  }

  async function requestPage(requestGeneration: number, pageOffset: number): Promise<void> {
    const identity = queryIdentity.value;
    const requestKey = `${requestGeneration}:${pageOffset}`;
    if (inFlightPages.has(requestKey)) return;
    const isInitialPage = pageOffset === 0;
    if (isInitialPage) loadingInitial.value = true;
    else loadingMore.value = true;
    inFlightPages.add(requestKey);

    try {
      const result = await loadPage(requestForCurrentQuery(pageOffset));
      if (
        disposed ||
        requestGeneration !== resultGeneration ||
        identity !== queryIdentity.value ||
        result.mode !== viewMode.value
      )
        return;
      if (result.mode === "comments")
        userComments.value = [...userComments.value, ...result.comments];
      else discs.value = [...discs.value, ...result.data];
      totalItems.value = result.totalItems;
      setTotalForMode(result.mode, result.totalItems);
      offset.value = pageOffset + DISC_LIST_PAGE_SIZE;
    } catch (requestError) {
      if (!disposed && requestGeneration === resultGeneration && identity === queryIdentity.value) {
        error.value = requestError;
        console.error("Error fetching data:", requestError);
      }
    } finally {
      inFlightPages.delete(requestKey);
      if (!disposed && requestGeneration === resultGeneration && identity === queryIdentity.value) {
        if (isInitialPage) loadingInitial.value = false;
        else loadingMore.value = false;
      }
    }
  }

  function reconcileSelections(response: DiscListOptions, action: FilterAction): boolean {
    if (action === "refresh") return false;
    const countryIds = new Set(response.countries.map(({ id }) => id));
    const genreIds = new Set(response.genres.map(({ id }) => id.toLowerCase()));
    let nextCountry = selectedCountry.value;
    let nextGenres = normalizedGenres.value;

    if (action !== "country" && action !== "artist" && nextCountry && !countryIds.has(nextCountry))
      nextCountry = "";
    if (action !== "genres" && action !== "artist")
      nextGenres = nextGenres.filter((id) => genreIds.has(id));

    const changed =
      nextCountry !== selectedCountry.value ||
      nextGenres.length !== normalizedGenres.value.length ||
      nextGenres.some((id, index) => id !== normalizedGenres.value[index]);
    if (changed) {
      selectedCountry.value = nextCountry;
      selectedGenres.value = nextGenres;
    }
    return changed;
  }

  const stopWatchingQuery = watch(
    queryIdentity,
    () => {
      const currentGeneration = ++resultGeneration;
      inFlightPages.clear();
      loadingInitial.value = false;
      loadingMore.value = false;
      clearResults();
      if (isAuthenticated.value) void requestPage(currentGeneration, 0);
    },
    { immediate: true }
  );

  const stopWatchingOptions = watch(
    optionsIdentity,
    async (identity) => {
      const currentGeneration = ++optionsGeneration;
      optionsSettledKey.value = null;
      optionsError.value = null;
      optionsLoading.value = false;
      if (!isAuthenticated.value) {
        options.value = { countries: [], genres: [] };
        if (selectedCountry.value) selectedCountry.value = "";
        if (selectedGenres.value.length) selectedGenres.value = [];
        return;
      }
      options.value = { countries: [], genres: [] };
      const request = requestForCurrentOptions();
      optionsLoading.value = true;
      try {
        const response = await loadOptions(request);
        if (
          disposed ||
          currentGeneration !== optionsGeneration ||
          identity !== optionsIdentity.value
        )
          return;
        if (reconcileSelections(response, lastFilterAction)) return;
        options.value = response;
        optionsSettledKey.value = identity;
      } catch (requestError) {
        if (
          !disposed &&
          currentGeneration === optionsGeneration &&
          identity === optionsIdentity.value
        ) {
          optionsError.value = requestError;
          optionsSettledKey.value = identity;
        }
      } finally {
        if (!disposed && currentGeneration === optionsGeneration) optionsLoading.value = false;
      }
    },
    { immediate: true }
  );

  function setMode(mode: DiscListMode) {
    if (viewMode.value === mode) return;
    lastFilterAction = "context";
    noRatesOnly.value = false;
    viewMode.value = mode;
    orderBy.value = DEFAULT_ORDER_BY_MODE[mode];
  }

  function setCountry(countryId: string) {
    if (selectedCountry.value === countryId) return;
    lastFilterAction = "country";
    selectedCountry.value = countryId;
  }

  function setNoRatesOnly(enabled: boolean) {
    if (noRatesOnly.value === enabled) return;
    noRatesOnly.value = enabled;
  }

  function setGenres(ids: string[]) {
    const normalized = normalizeGenreIds(ids);
    if (JSON.stringify(normalized) === JSON.stringify(normalizedGenres.value)) return;
    lastFilterAction = "genres";
    selectedGenres.value = normalized;
  }

  function setSearchQuery(query: string) {
    if (searchQuery.value === query) return;
    lastFilterAction = "context";
    searchQuery.value = query;
  }

  function setSelectedArtist(artist: DiscListSelectedArtist | null) {
    if (selectedArtist.value?.id === artist?.id) return;
    lastFilterAction = "artist";
    selectedArtist.value = artist ? { id: artist.id, name: artist.name } : null;
  }

  function setSelectedWeek(dateRange: [string, string] | null) {
    if (JSON.stringify(selectedWeek.value) === JSON.stringify(dateRange)) return;
    lastFilterAction = "context";
    selectedWeek.value = dateRange ? [...dateRange] : null;
  }

  function applySavedCriteria(criteria: SavedDiscFilterCriteria) {
    const yearRange =
      criteria.yearFrom === null && criteria.yearTo === null
        ? null
        : ([
            getDiscListYearRange(criteria.yearFrom ?? 1)[0],
            getDiscListYearRange(criteria.yearTo ?? 9999)[1],
          ] as [string, string]);
    lastFilterAction = "refresh";
    selectedGenres.value = normalizeGenreIds(criteria.genreIds);
    selectedCountry.value = criteria.countryId ?? "";
    selectedWeek.value = yearRange;
  }

  function refresh() {
    lastFilterAction = "refresh";
    refreshGeneration.value += 1;
  }

  function updateDisc(id: string, update: Partial<DiscListCardDisc>) {
    const index = discs.value.findIndex((disc) => disc.id === id);
    if (index === -1) return;
    discs.value = discs.value.map((disc) => (disc.id === id ? { ...disc, ...update } : disc));
  }

  function removeDisc(id: string) {
    const index = discs.value.findIndex((disc) => disc.id === id);
    if (index === -1) return;
    discs.value = discs.value.filter((disc) => disc.id !== id);
    offset.value = Math.max(0, offset.value - 1);
    totalItems.value = Math.max(0, totalItems.value - 1);
    setTotalForMode(viewMode.value, totalItems.value);
  }

  function retryOptions() {
    if (optionsLoading.value || !isAuthenticated.value) return;
    optionsSettledKey.value = null;
    options.value = { countries: [], genres: [] };
    const currentGeneration = ++optionsGeneration;
    const identity = optionsIdentity.value;
    const request = requestForCurrentOptions();
    optionsLoading.value = true;
    optionsError.value = null;
    void loadOptions(request)
      .then((response) => {
        if (
          disposed ||
          currentGeneration !== optionsGeneration ||
          identity !== optionsIdentity.value
        )
          return;
        if (reconcileSelections(response, lastFilterAction)) return;
        options.value = response;
        optionsSettledKey.value = identity;
      })
      .catch((requestError: unknown) => {
        if (
          !disposed &&
          currentGeneration === optionsGeneration &&
          identity === optionsIdentity.value
        ) {
          optionsError.value = requestError;
          optionsSettledKey.value = identity;
        }
      })
      .finally(() => {
        if (!disposed && currentGeneration === optionsGeneration) optionsLoading.value = false;
      });
  }

  function loadNextPage(): Promise<void> {
    if (loading.value || !hasMore.value || error.value) return Promise.resolve();
    return requestPage(resultGeneration, offset.value);
  }

  onScopeDispose(() => {
    disposed = true;
    resultGeneration += 1;
    optionsGeneration += 1;
    inFlightPages.clear();
    stopWatchingQuery();
    stopWatchingOptions();
  });

  return {
    viewMode,
    setMode,
    searchQuery,
    setSearchQuery,
    selectedWeek,
    setSelectedWeek,
    applySavedCriteria,
    selectedGenres,
    setGenres,
    selectedCountry,
    setCountry,
    noRatesOnly,
    setNoRatesOnly,
    selectedArtist,
    setSelectedArtist,
    orderBy,
    offset,
    discs,
    userComments,
    totalItems,
    totalDisc,
    totalRates,
    totalCovers,
    totalFavorites,
    totalPendings,
    totalComments,
    loadingInitial,
    loadingMore,
    loading,
    hasMore,
    error,
    isEmpty,
    queryIdentity,
    options: currentOptions,
    optionsLoading,
    optionsError,
    optionsReady,
    retryOptions,
    refresh,
    updateDisc,
    removeDisc,
    loadNextPage,
  };
}
