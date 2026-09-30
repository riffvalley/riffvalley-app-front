import { onUnmounted, ref, watch } from "vue";
import type { ArtistManagementPort } from "../../application/artistManagementPort";
import { ARTISTS_PAGE_SIZE, listArtists } from "../../application/listArtists";
import type { ArtistManagementItem } from "../../domain/artistManagement";

export function useArtistManagementList(port: ArtistManagementPort, onError: (error: unknown) => void) {
  const artists = ref<ArtistManagementItem[]>([]);
  const totalItems = ref(0);
  const totalPages = ref(1);
  const currentPage = ref(1);
  const loading = ref(false);
  const query = ref("");
  const selectedGenreId = ref("");
  const selectedCountryId = ref("");
  const needsReview = ref<boolean | null>(null);
  let searchTimer: ReturnType<typeof setTimeout> | null = null;
  let requestVersion = 0;

  const fetchArtists = async (page = 1) => {
    const version = ++requestVersion;
    loading.value = true;
    try {
      const result = await listArtists(port, {
        query: query.value || undefined,
        offset: (page - 1) * ARTISTS_PAGE_SIZE,
        genreId: selectedGenreId.value || undefined,
        countryId: selectedCountryId.value || undefined,
        needsReview: needsReview.value ?? undefined,
      });
      if (version !== requestVersion) return;
      artists.value = result.data;
      totalItems.value = result.totalItems;
      totalPages.value = result.totalPages;
      currentPage.value = result.currentPage;
    } finally {
      if (version === requestVersion) loading.value = false;
    }
  };

  const loadArtists = (page = 1) => fetchArtists(page).catch(onError);

  const onQueryInput = () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      void loadArtists(1);
    }, 400);
  };

  watch(selectedGenreId, () => void loadArtists(1));
  watch(selectedCountryId, () => void loadArtists(1));
  watch(needsReview, () => void loadArtists(1));

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages.value) return;
    void loadArtists(page);
  };

  onUnmounted(() => {
    if (searchTimer) clearTimeout(searchTimer);
    requestVersion++;
  });

  return {
    artists, totalItems, totalPages, currentPage, loading, query,
    selectedGenreId, selectedCountryId, needsReview, fetchArtists: loadArtists, onQueryInput, goToPage,
  };
}
