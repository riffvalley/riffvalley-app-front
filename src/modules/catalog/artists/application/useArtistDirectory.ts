import { computed, onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter } from "vue";
import { useInfiniteQuery, useQuery } from "@tanstack/vue-query";
import { getArtistDirectory } from "../api/artistDirectory";
import { getGenres, type Genre } from "@services/genres/genres";
import {
  ARTIST_DIRECTORY_PAGE_SIZE,
  getDistinctArtistDirectoryItems,
  getNextArtistDirectoryOffset,
} from "./artistDirectoryPagination";
import type { ArtistDirectoryLetter } from "../types/artistDirectory";

const SEARCH_DEBOUNCE_MS = 400;
export const artistDirectoryQueryKey = ["catalog", "artist-directory"] as const;
const artistDirectoryGenresQueryKey = ["catalog", "artist-directory-genres"] as const;

async function getArtistDirectoryGenres(): Promise<Genre[]> {
  const pageSize = 200;
  const firstPage = await getGenres(pageSize, 0);
  const remainingPages = await Promise.all(
    Array.from({ length: Math.max(0, firstPage.totalPages - 1) }, (_, index) =>
      getGenres(pageSize, (index + 1) * pageSize)
    )
  );
  return [firstPage, ...remainingPages].flatMap((page) => page.data);
}

export function useArtistDirectory(initialLetter: MaybeRefOrGetter<ArtistDirectoryLetter> = "A") {
  const activeLetter = ref<ArtistDirectoryLetter>(toValue(initialLetter));
  const searchText = ref("");
  const selectedGenreId = ref("");
  const debouncedSearchText = ref("");
  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  const stopSearchWatch = watch(
    searchText,
    (value) => {
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        debouncedSearchText.value = value.trim();
      }, SEARCH_DEBOUNCE_MS);
    },
    { immediate: true }
  );

  const isDebouncing = computed(() => searchText.value.trim() !== debouncedSearchText.value);
  const isSearchingGlobally = computed(() => Boolean(searchText.value.trim()));
  const genresQuery = useQuery({
    queryKey: artistDirectoryGenresQueryKey,
    queryFn: getArtistDirectoryGenres,
    staleTime: 5 * 60_000,
  });
  const queryKey = computed(
    () => [...artistDirectoryQueryKey, activeLetter.value, debouncedSearchText.value, selectedGenreId.value] as const
  );
  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: 0,
    queryFn: ({ queryKey: requestedKey, pageParam, signal }) =>
      getArtistDirectory(
        {
          letter: requestedKey[2],
          ...(requestedKey[3] ? { q: requestedKey[3] } : {}),
          ...(requestedKey[4] ? { genreId: requestedKey[4] } : {}),
          limit: ARTIST_DIRECTORY_PAGE_SIZE,
          offset: pageParam,
        },
        signal
      ),
    getNextPageParam: (lastPage, pages) => getNextArtistDirectoryOffset(lastPage, pages),
    staleTime: 30_000,
  });

  function selectLetter(letter: ArtistDirectoryLetter) {
    activeLetter.value = letter;
  }

  function selectGenre(genreId: string) {
    selectedGenreId.value = genreId;
  }

  onScopeDispose(() => {
    if (searchTimer) clearTimeout(searchTimer);
    stopSearchWatch();
  });

  return {
    activeLetter,
    searchText,
    selectedGenreId,
    genres: computed(() => genresQuery.data.value ?? []),
    isLoadingGenres: computed(() => genresQuery.isPending.value),
    isGenreError: genresQuery.isError,
    isDebouncing,
    isSearchingGlobally,
    artists: computed(() => getDistinctArtistDirectoryItems(query.data.value?.pages)),
    totalItems: computed(() => query.data.value?.pages[0]?.totalItems ?? 0),
    isLoading: computed(() => query.isPending.value || query.isFetching.value),
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    isError: query.isError,
    isFetchNextPageError: query.isFetchNextPageError,
    selectLetter,
    selectGenre,
    loadMore: query.fetchNextPage,
    retry: query.refetch,
  };
}
