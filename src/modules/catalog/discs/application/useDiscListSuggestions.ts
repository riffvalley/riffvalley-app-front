import { computed, onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { useAuthStore } from "@/modules/identity/auth";
import { getDiscListSuggestions } from "../api/discList";

const SUGGESTIONS_DEBOUNCE_MS = 250;
export const discListSuggestionsQueryKey = ["catalog", "disc-list-suggestions"] as const;

export function normalizeDiscListSuggestionQuery(query: string): string {
  return query.normalize("NFKD").replace(/\p{M}/gu, "").trim().replace(/\s+/g, " ").toLowerCase();
}

function hasMinimumQueryLength(query: string): boolean {
  return Array.from(query).length >= 2;
}

export function useDiscListSuggestions(
  query: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean>
) {
  const authStore = useAuthStore();
  const normalizedQuery = computed(() => normalizeDiscListSuggestionQuery(toValue(query)));
  const debouncedQuery = normalizedQuery;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const settledQuery = ref("");

  const stopWatchingQuery = watch(
    normalizedQuery,
    (nextQuery) => {
      if (timer) clearTimeout(timer);
      settledQuery.value = "";
      if (!hasMinimumQueryLength(nextQuery)) return;
      timer = setTimeout(() => {
        settledQuery.value = nextQuery;
      }, SUGGESTIONS_DEBOUNCE_MS);
    },
    { immediate: true }
  );

  // A ref is used only for the debounce boundary; the typed text remains owned by DiscList.
  const readyQuery = computed(() =>
    settledQuery.value === debouncedQuery.value ? settledQuery.value : ""
  );
  const queryKey = computed(
    () =>
      [
        ...discListSuggestionsQueryKey,
        authStore.userId,
        authStore.authSessionGeneration,
        readyQuery.value,
      ] as const
  );
  const authenticated = computed(() => authStore.isAuthenticated && Boolean(authStore.userId));
  const canQuery = computed(
    () =>
      authenticated.value && Boolean(toValue(enabled)) && hasMinimumQueryLength(readyQuery.value)
  );
  const suggestionsQuery = useQuery({
    queryKey,
    enabled: canQuery,
    queryFn: ({ queryKey: requestedKey, signal }) =>
      getDiscListSuggestions(requestedKey[4], signal),
    staleTime: 60_000,
  });

  onScopeDispose(() => {
    if (timer) clearTimeout(timer);
    stopWatchingQuery();
  });

  return {
    suggestions: computed(() => (canQuery.value ? suggestionsQuery.data.value : undefined)),
    isFetching: computed(() => canQuery.value && suggestionsQuery.isFetching.value),
    error: computed(() => (canQuery.value ? suggestionsQuery.error.value : null)),
    isDebouncing: computed(
      () =>
        Boolean(toValue(enabled)) &&
        authenticated.value &&
        hasMinimumQueryLength(normalizedQuery.value) &&
        !readyQuery.value
    ),
    canQuery,
    retry: suggestionsQuery.refetch,
  };
}
