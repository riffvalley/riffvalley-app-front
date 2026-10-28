import { computed, onScopeDispose, ref, shallowRef, watch } from "vue";
import { useAuthStore } from "@/modules/identity/auth";
import { loadDiscList } from "./loadDiscList";
import type {
  DiscListComment,
  DiscListMode,
  DiscListRequest,
  DiscListResult,
} from "../types/discList";
import type { Disc } from "@services/discs/discs";

const PAGE_SIZE = 20;
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

export function useDiscListCoordinator(loadPage: DiscListPageLoader = loadDiscList) {
  const authStore = useAuthStore();
  const viewMode = ref<DiscListMode>("all");
  const searchQuery = ref("");
  const selectedWeek = shallowRef<[string, string] | null>(null);
  const selectedGenre = ref("");
  const selectedCountry = ref("");
  const orderBy = ref(DEFAULT_ORDER);
  const offset = ref(0);
  const discs = shallowRef<Disc[]>([]);
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

  const loading = computed(() => loadingInitial.value || loadingMore.value);
  const hasMore = computed(() => offset.value < totalItems.value);
  const isEmpty = computed(
    () =>
      !loading.value &&
      !error.value &&
      (viewMode.value === "comments" ? userComments.value.length === 0 : discs.value.length === 0)
  );
  const sessionContext = computed(() => ({
    authenticated: authStore.isAuthenticated,
    userId: authStore.userId,
    generation: authStore.authSessionGeneration,
  }));
  const queryIdentity = computed(() =>
    JSON.stringify([
      viewMode.value,
      searchQuery.value,
      selectedWeek.value,
      selectedCountry.value,
      selectedGenre.value,
      orderBy.value,
      sessionContext.value,
    ])
  );

  let generation = 0;
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
      query: searchQuery.value,
      dateRange: selectedWeek.value ? [...selectedWeek.value] : null,
      genre: selectedGenre.value,
      country: selectedCountry.value,
      orderBy: orderBy.value,
      offset: pageOffset,
      limit: PAGE_SIZE,
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
        requestGeneration !== generation ||
        identity !== queryIdentity.value ||
        result.mode !== viewMode.value
      ) {
        return;
      }

      if (result.mode === "comments")
        userComments.value = [...userComments.value, ...result.comments];
      else discs.value = [...discs.value, ...result.data];

      totalItems.value = result.totalItems;
      setTotalForMode(result.mode, result.totalItems);
      offset.value = pageOffset + PAGE_SIZE;
    } catch (requestError) {
      if (!disposed && requestGeneration === generation && identity === queryIdentity.value) {
        error.value = requestError;
        console.error("Error fetching data:", requestError);
      }
    } finally {
      inFlightPages.delete(requestKey);
      if (!disposed && requestGeneration === generation && identity === queryIdentity.value) {
        if (isInitialPage) loadingInitial.value = false;
        else loadingMore.value = false;
      }
    }
  }

  function loadNextPage(): Promise<void> {
    if (loading.value || !hasMore.value || error.value) return Promise.resolve();
    return requestPage(generation, offset.value);
  }

  const stopWatchingQuery = watch(
    queryIdentity,
    () => {
      const requestGeneration = ++generation;
      inFlightPages.clear();
      loadingInitial.value = false;
      loadingMore.value = false;
      clearResults();

      if (!authStore.isAuthenticated || !authStore.userId) {
        return;
      }

      // The generation and identity are captured before the request so stale pages
      // can never append to a later filter or session selection.
      void requestPage(requestGeneration, 0);
    },
    { immediate: true }
  );

  function setMode(mode: DiscListMode) {
    if (viewMode.value === mode) return;
    viewMode.value = mode;
    orderBy.value = DEFAULT_ORDER_BY_MODE[mode];
  }

  onScopeDispose(() => {
    disposed = true;
    generation += 1;
    inFlightPages.clear();
    stopWatchingQuery();
  });

  return {
    viewMode,
    setMode,
    searchQuery,
    selectedWeek,
    selectedGenre,
    selectedCountry,
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
    loadNextPage,
  };
}
