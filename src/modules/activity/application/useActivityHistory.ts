import { computed } from "vue";
import { useInfiniteQuery, useQueryClient } from "@tanstack/vue-query";
import { getActivityHistory } from "../api/activityApi";
import {
  ACTIVITY_HISTORY_PAGE_SIZE,
  type ActivityHistoryParams,
  type ActivityHistoryResponse,
} from "../types/activity";
import { useAuthStore } from "@/modules/identity/auth";

export const activityHistoryQueryKey = ["activity", "history"] as const;

export function normalizeActivityHistoryParams(params: ActivityHistoryParams = {}) {
  return {
    ...(params.from === undefined ? {} : { from: params.from }),
    ...(params.to === undefined ? {} : { to: params.to }),
    ...(params.timeZone === undefined ? {} : { timeZone: params.timeZone }),
    ...(params.type === undefined ? {} : { type: params.type }),
    ...(params.q === undefined ? {} : { q: params.q }),
    limit: params.limit ?? ACTIVITY_HISTORY_PAGE_SIZE,
  };
}

export function activityHistoryQueryKeyForSession(
  params: ActivityHistoryParams,
  userId: string | null,
  generation: number,
) {
  return [...activityHistoryQueryKey, normalizeActivityHistoryParams(params), userId, generation] as const;
}

function isCurrentSession(
  authStore: ReturnType<typeof useAuthStore>,
  userId: string | null,
  generation: number,
) {
  return authStore.authStatus === "authenticated"
    && authStore.isAuthenticated
    && authStore.userId === userId
    && authStore.authSessionGeneration === generation;
}

function isInvalidCursorError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const response = (error as { response?: { status?: unknown } }).response;
  return response?.status === 400;
}

export function useActivityHistory(
  params: () => ActivityHistoryParams = () => ({}),
  canQuery: () => boolean = () => true,
) {
  const authStore = useAuthStore();
  const queryClient = useQueryClient();
  const normalizedParams = computed(() => normalizeActivityHistoryParams(params()));
  const queryKey = computed(() => activityHistoryQueryKeyForSession(
    normalizedParams.value,
    authStore.userId,
    authStore.authSessionGeneration,
  ));
  const enabled = computed(() =>
    authStore.authStatus === "authenticated"
      && authStore.isAuthenticated
      && !!authStore.userId
      && canQuery(),
  );

  const query = useInfiniteQuery({
    queryKey,
    enabled,
    initialPageParam: null as string | null,
    queryFn: async ({ queryKey: requestedKey, pageParam, signal }) => {
      const [, , requestedParams, requestedUserId, requestedGeneration] = requestedKey;
      if (!requestedUserId || !isCurrentSession(authStore, requestedUserId, requestedGeneration)) {
        throw new Error("La sesión cambió antes de consultar el historial.");
      }

      const response = await getActivityHistory({
        ...requestedParams,
        ...(pageParam === null ? {} : { cursor: pageParam }),
      }, signal);

      if (signal.aborted || !isCurrentSession(authStore, requestedUserId, requestedGeneration)) {
        throw new Error("La sesión cambió antes de completar la consulta del historial.");
      }
      return response;
    },
    getNextPageParam: (
      lastPage: ActivityHistoryResponse,
      _allPages: ActivityHistoryResponse[],
      _lastPageParam: string | null,
      allPageParams: Array<string | null>,
    ) => {
      if (!lastPage.hasMore || !lastPage.nextCursor || allPageParams.includes(lastPage.nextCursor)) {
        return undefined;
      }
      return lastPage.nextCursor;
    },
  });

  let nextPageInFlight = false;
  const pages = computed(() => query.data.value?.pages ?? []);
  const events = computed(() => pages.value.flatMap((page) => page.items));
  const dailySetCounts = computed(() => pages.value.reduce<Record<string, number>>(
    (counts, page) => ({ ...counts, ...page.dailySetCounts }),
    {},
  ));
  const hasMore = computed(() => query.hasNextPage.value ?? false);

  async function loadMore(): Promise<void> {
    if (
      nextPageInFlight ||
      !enabled.value ||
      !hasMore.value ||
      query.isFetching.value ||
      !query.hasNextPage.value
    ) return;

    nextPageInFlight = true;
    try {
      const result = await query.fetchNextPage({ cancelRefetch: false });
      const previousPage = query.data.value?.pages.at(-1);
      if (result.isError && previousPage?.nextCursor && isInvalidCursorError(result.error)) {
        await resetPagination();
      }
    } catch (error: unknown) {
      const currentPages = query.data.value?.pages ?? [];
      const previousPage = currentPages.at(-1);
      if (previousPage?.nextCursor && isInvalidCursorError(error)) {
        await resetPagination();
      }
    } finally {
      nextPageInFlight = false;
    }
  }

  async function resetPagination(): Promise<void> {
    await queryClient.resetQueries({ queryKey: queryKey.value, exact: true });
  }

  return {
    events,
    pages,
    dailySetCounts,
    isLoading: computed(() => query.isPending.value && !query.data.value),
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    isError: query.isError,
    isFetchNextPageError: query.isFetchNextPageError,
    error: query.error,
    isEmpty: computed(() => !query.isPending.value && !query.isError.value && events.value.length === 0),
    hasMore,
    loadMore,
    resetPagination,
    retry: query.refetch,
  };
}
