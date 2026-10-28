import { isAxiosError } from "axios";
import { computed, onBeforeUnmount, readonly, shallowRef, watch, type Ref } from "vue";
import { useAuthStore } from "@/modules/identity/auth";
import {
  getRatesArtistLastfm,
  getRatesArtistSummary,
  type RatesArtistLastfmResponseDto,
  type RatesArtistSummaryResponseDto,
} from "@services/rates/rates";

const PAGE_SIZE = 100;

export function useFavoriteArtistDetails(
  artistId: Readonly<Ref<string>>,
  enabled: Readonly<Ref<boolean>>
) {
  const authStore = useAuthStore();
  const detail = shallowRef<RatesArtistSummaryResponseDto | null>(null);
  const lastfmDetail = shallowRef<RatesArtistLastfmResponseDto | null>(null);
  const summaryLoading = shallowRef(false);
  const summaryError = shallowRef(false);
  const summaryNotFound = shallowRef(false);
  const lastfmLoading = shallowRef(false);
  const lastfmError = shallowRef(false);
  const moreLoading = shallowRef(false);
  const moreError = shallowRef(false);
  const failedMorePage = shallowRef<number | null>(null);
  const discs = computed(() => detail.value?.discs.data ?? []);
  const hasMoreDiscs = computed(() =>
    Boolean(
      detail.value &&
      detail.value.discs.total > detail.value.discs.data.length &&
      detail.value.discs.page < detail.value.discs.totalPages
    )
  );
  const unavailableDiscCount = computed(() => {
    if (
      !detail.value ||
      hasMoreDiscs.value ||
      detail.value.discs.page < detail.value.discs.totalPages
    )
      return 0;
    return Math.max(0, detail.value.discs.total - detail.value.discs.data.length);
  });

  let summaryController: AbortController | null = null;
  let summaryGeneration = 0;
  let lastfmController: AbortController | null = null;
  let lastfmGeneration = 0;

  function cancelAndClear(): void {
    summaryController?.abort();
    lastfmController?.abort();
    summaryGeneration += 1;
    lastfmGeneration += 1;
    detail.value = null;
    lastfmDetail.value = null;
    summaryLoading.value = false;
    summaryError.value = false;
    summaryNotFound.value = false;
    lastfmLoading.value = false;
    lastfmError.value = false;
    moreLoading.value = false;
    moreError.value = false;
    failedMorePage.value = null;
  }

  function summaryRequestIsCurrent(
    generation: number,
    controller: AbortController,
    requestedArtistId: string,
    userId: string,
    sessionGeneration: number
  ): boolean {
    return (
      generation === summaryGeneration &&
      !controller.signal.aborted &&
      enabled.value &&
      artistId.value === requestedArtistId &&
      authStore.authStatus === "authenticated" &&
      authStore.userId === userId &&
      authStore.authSessionGeneration === sessionGeneration
    );
  }

  function lastfmRequestIsCurrent(
    generation: number,
    controller: AbortController,
    requestedArtistId: string,
    userId: string,
    sessionGeneration: number
  ): boolean {
    return (
      generation === lastfmGeneration &&
      !controller.signal.aborted &&
      enabled.value &&
      artistId.value === requestedArtistId &&
      authStore.authStatus === "authenticated" &&
      authStore.userId === userId &&
      authStore.authSessionGeneration === sessionGeneration
    );
  }

  function loadSummary(): void {
    if (!enabled.value || summaryLoading.value) return;
    summaryController?.abort();
    const requestController = new AbortController();
    summaryController = requestController;
    const generation = ++summaryGeneration;
    const requestedArtistId = artistId.value;
    const { authStatus, userId, authSessionGeneration } = authStore;

    detail.value = null;
    summaryError.value = false;
    summaryNotFound.value = false;
    moreLoading.value = false;
    moreError.value = false;
    failedMorePage.value = null;
    if (authStatus !== "authenticated" || !userId) return;

    summaryLoading.value = true;
    void getRatesArtistSummary(
      requestedArtistId,
      { page: 1, limit: PAGE_SIZE },
      requestController.signal
    )
      .then((response) => {
        if (
          !summaryRequestIsCurrent(
            generation,
            requestController,
            requestedArtistId,
            userId,
            authSessionGeneration
          )
        )
          return;
        detail.value = response;
      })
      .catch((error: unknown) => {
        if (
          !summaryRequestIsCurrent(
            generation,
            requestController,
            requestedArtistId,
            userId,
            authSessionGeneration
          )
        )
          return;
        if (isAxiosError(error) && error.response?.status === 404) summaryNotFound.value = true;
        else summaryError.value = true;
      })
      .finally(() => {
        if (generation === summaryGeneration && !requestController.signal.aborted)
          summaryLoading.value = false;
      });
  }

  function loadLastfm(force = false): void {
    if (!enabled.value || (lastfmLoading.value && !force)) return;
    lastfmController?.abort();
    const requestController = new AbortController();
    lastfmController = requestController;
    const generation = ++lastfmGeneration;
    const requestedArtistId = artistId.value;
    const { authStatus, userId, authSessionGeneration } = authStore;

    lastfmDetail.value = null;
    lastfmError.value = false;
    if (authStatus !== "authenticated" || !userId) return;

    lastfmLoading.value = true;
    void getRatesArtistLastfm(requestedArtistId, requestController.signal)
      .then((response) => {
        if (
          !lastfmRequestIsCurrent(
            generation,
            requestController,
            requestedArtistId,
            userId,
            authSessionGeneration
          )
        )
          return;
        if (response.artistId !== requestedArtistId) {
          lastfmError.value = true;
          return;
        }
        lastfmDetail.value = response;
      })
      .catch(() => {
        if (
          !lastfmRequestIsCurrent(
            generation,
            requestController,
            requestedArtistId,
            userId,
            authSessionGeneration
          )
        )
          return;
        lastfmError.value = true;
      })
      .finally(() => {
        if (generation === lastfmGeneration && !requestController.signal.aborted)
          lastfmLoading.value = false;
      });
  }

  function retryLastfm(): void {
    if (
      lastfmError.value ||
      lastfmDetail.value?.status === "unavailable" ||
      lastfmDetail.value?.status === "invalid_response"
    )
      loadLastfm(true);
  }

  async function loadMoreDiscs(retry = false): Promise<void> {
    const current = detail.value;
    if (
      !current ||
      !enabled.value ||
      authStore.authStatus !== "authenticated" ||
      !authStore.userId ||
      summaryLoading.value ||
      moreLoading.value
    )
      return;
    const page = retry ? failedMorePage.value : current.discs.page + 1;
    if (
      page === null ||
      page < 2 ||
      page > current.discs.totalPages ||
      (!retry && !hasMoreDiscs.value)
    )
      return;

    summaryController?.abort();
    const requestController = new AbortController();
    summaryController = requestController;
    const generation = ++summaryGeneration;
    const requestedArtistId = artistId.value;
    const { userId, authSessionGeneration } = authStore;
    if (!userId) return;

    moreLoading.value = true;
    moreError.value = false;
    failedMorePage.value = null;
    try {
      const response = await getRatesArtistSummary(
        requestedArtistId,
        { page, limit: PAGE_SIZE },
        requestController.signal
      );
      if (
        !summaryRequestIsCurrent(
          generation,
          requestController,
          requestedArtistId,
          userId,
          authSessionGeneration
        ) ||
        !detail.value
      )
        return;
      const loadedIds = new Set(detail.value.discs.data.map(({ id }) => id));
      const nextDiscs = response.discs.data.filter(({ id }) => {
        if (loadedIds.has(id)) return false;
        loadedIds.add(id);
        return true;
      });
      detail.value = {
        ...detail.value,
        discs: {
          ...response.discs,
          data: [...detail.value.discs.data, ...nextDiscs],
        },
      };
    } catch {
      if (
        !summaryRequestIsCurrent(
          generation,
          requestController,
          requestedArtistId,
          userId,
          authSessionGeneration
        )
      )
        return;
      moreError.value = true;
      failedMorePage.value = page;
    } finally {
      if (generation === summaryGeneration && !requestController.signal.aborted)
        moreLoading.value = false;
    }
  }

  function retrySummary(): void {
    if (summaryError.value) loadSummary();
  }

  function retryMoreDiscs(): void {
    if (failedMorePage.value !== null) void loadMoreDiscs(true);
  }

  watch(
    () =>
      [
        enabled.value,
        artistId.value,
        authStore.authStatus,
        authStore.userId,
        authStore.authSessionGeneration,
      ] as const,
    ([isEnabled]) => {
      cancelAndClear();
      if (!isEnabled) return;
      loadSummary();
      loadLastfm();
    },
    { immediate: true }
  );

  onBeforeUnmount(cancelAndClear);

  return {
    detail: readonly(detail),
    lastfmDetail: readonly(lastfmDetail),
    summaryLoading: readonly(summaryLoading),
    summaryError: readonly(summaryError),
    summaryNotFound: readonly(summaryNotFound),
    lastfmLoading: readonly(lastfmLoading),
    lastfmError: readonly(lastfmError),
    moreLoading: readonly(moreLoading),
    moreError: readonly(moreError),
    discs: readonly(discs),
    hasMoreDiscs: readonly(hasMoreDiscs),
    unavailableDiscCount: readonly(unavailableDiscCount),
    loadSummary,
    loadLastfm: () => loadLastfm(),
    retrySummary,
    retryLastfm,
    loadMoreDiscs: () => loadMoreDiscs(),
    retryMoreDiscs,
    invalidate: cancelAndClear,
  };
}
