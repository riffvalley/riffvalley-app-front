import { computed, onMounted, reactive, ref, toRefs } from "vue";
import { useQueryClient } from "@tanstack/vue-query";
import { getTopDiscsOptions } from "../api/topDiscs";
import { topDiscsOptionsQueryKeyFor, useTopDiscsOptionsQuery } from "./useTopDiscsQueries";
import { resolveTopDiscsSelection, type TopDiscsFilterAction } from "./topDiscsFilterSelection";
import type { TopDiscsOptionsParams } from "../types/topDiscs";

export type TopDiscsPeriod = "week" | "month" | "year" | "all";
export type TopDiscsDateRange = [string, string] | null;

interface TopDiscsFilterState {
  period: TopDiscsPeriod;
  year: number;
  dateRange: TopDiscsDateRange;
  countryId: string;
  genreId: string;
}

function normalizeDateRange(dateRange: TopDiscsDateRange): [string, string] | undefined {
  return dateRange ? [dateRange[0], dateRange[1]] : undefined;
}

function paramsFingerprint(params: TopDiscsOptionsParams): string {
  return JSON.stringify(topDiscsOptionsQueryKeyFor(params));
}

export function useTopDiscsFilterCoordinator() {
  const queryClient = useQueryClient();
  const filters = reactive<TopDiscsFilterState>({
    period: "week",
    year: new Date().getFullYear(),
    dateRange: null,
    countryId: "",
    genreId: "",
  });
  const validationPending = ref(false);
  const settledOptionsKey = ref<string | null>(null);
  const lastAction = ref<TopDiscsFilterAction>("period");
  let revision = 0;

  const optionsParams = computed<TopDiscsOptionsParams>(() => ({
    ...(filters.dateRange ? { dateRange: normalizeDateRange(filters.dateRange) } : {}),
    ...(filters.countryId ? { countryId: filters.countryId } : {}),
    ...(filters.genreId ? { genreId: filters.genreId } : {}),
  }));
  const currentOptionsKey = computed(() => paramsFingerprint(optionsParams.value));
  const optionsQuery = useTopDiscsOptionsQuery(optionsParams, false);

  const optionsLoading = computed(() => validationPending.value || optionsQuery.isFetching.value);
  const optionsError = computed(
    () => settledOptionsKey.value === currentOptionsKey.value && optionsQuery.isError.value
  );
  const optionsReady = computed(
    () => settledOptionsKey.value === currentOptionsKey.value && optionsQuery.isSuccess.value
  );
  const countries = computed(() =>
    optionsReady.value ? (optionsQuery.data.value?.countries ?? []) : []
  );
  const genres = computed(() =>
    optionsReady.value ? (optionsQuery.data.value?.genres ?? []) : []
  );
  const optionsEmpty = computed(
    () => optionsReady.value && countries.value.length === 0 && genres.value.length === 0
  );
  const canLoadRanking = computed(() => settledOptionsKey.value === currentOptionsKey.value);

  function setFilters(action: TopDiscsFilterAction, update: () => void): Promise<void> {
    const previousParams = optionsParams.value;
    const previousKey = topDiscsOptionsQueryKeyFor(previousParams);
    const currentRevision = ++revision;
    lastAction.value = action;
    settledOptionsKey.value = null;
    validationPending.value = true;
    update();
    const requestedParams = optionsParams.value;

    if (paramsFingerprint(previousParams) !== paramsFingerprint(requestedParams)) {
      void queryClient.cancelQueries({ queryKey: previousKey, exact: true });
    }

    return validateOptions(currentRevision, action, requestedParams);
  }

  async function validateOptions(
    currentRevision: number,
    action: TopDiscsFilterAction,
    firstParams: TopDiscsOptionsParams
  ): Promise<void> {
    let requestedParams = firstParams;

    try {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const requestedKey = topDiscsOptionsQueryKeyFor(requestedParams);
        const response = await queryClient.fetchQuery({
          queryKey: requestedKey,
          queryFn: ({ signal }) => getTopDiscsOptions(requestedParams, signal),
        });

        if (
          currentRevision !== revision ||
          paramsFingerprint(optionsParams.value) !== paramsFingerprint(requestedParams)
        ) {
          return;
        }

        const resolved = resolveTopDiscsSelection(
          action,
          { countryId: filters.countryId, genreId: filters.genreId },
          response
        );
        const selectionChanged =
          resolved.countryId !== filters.countryId || resolved.genreId !== filters.genreId;

        if (!selectionChanged) {
          settledOptionsKey.value = paramsFingerprint(requestedParams);
          return;
        }

        // Both IDs change in the same transaction. The next options request then
        // represents the final filter state before the ranking query is enabled.
        filters.countryId = resolved.countryId;
        filters.genreId = resolved.genreId;
        requestedParams = optionsParams.value;
      }

      if (currentRevision === revision) {
        settledOptionsKey.value = paramsFingerprint(optionsParams.value);
      }
    } catch {
      if (
        currentRevision === revision &&
        paramsFingerprint(optionsParams.value) === paramsFingerprint(requestedParams)
      ) {
        // A failed options request does not invalidate the user's current choices.
        settledOptionsKey.value = paramsFingerprint(requestedParams);
      }
    } finally {
      if (currentRevision === revision) validationPending.value = false;
    }
  }

  function setInitialDateRange(dateRange: TopDiscsDateRange): void {
    if (filters.dateRange === null && filters.period === "week" && dateRange) {
      filters.dateRange = [dateRange[0], dateRange[1]];
    }
  }

  function setPeriod(period: TopDiscsPeriod, dateRange: TopDiscsDateRange): Promise<void> {
    if (filters.period === period && sameRange(filters.dateRange, dateRange))
      return Promise.resolve();
    return setFilters("period", () => {
      filters.period = period;
      filters.dateRange = copyRange(dateRange);
    });
  }

  function setYear(year: number, dateRange: TopDiscsDateRange): Promise<void> {
    if (filters.year === year && sameRange(filters.dateRange, dateRange)) return Promise.resolve();
    return setFilters("period", () => {
      filters.year = year;
      filters.dateRange = copyRange(dateRange);
    });
  }

  function setDateRange(dateRange: TopDiscsDateRange): Promise<void> {
    if (sameRange(filters.dateRange, dateRange)) return Promise.resolve();
    return setFilters("period", () => {
      filters.dateRange = copyRange(dateRange);
    });
  }

  function setCountry(countryId: string): Promise<void> {
    if (filters.countryId === countryId) return Promise.resolve();
    return setFilters("country", () => {
      filters.countryId = countryId;
    });
  }

  function setGenre(genreId: string): Promise<void> {
    if (filters.genreId === genreId) return Promise.resolve();
    return setFilters("genre", () => {
      filters.genreId = genreId;
    });
  }

  function retryOptions(): Promise<void> {
    if (validationPending.value) return Promise.resolve();
    const currentRevision = ++revision;
    settledOptionsKey.value = null;
    validationPending.value = true;
    return validateOptions(currentRevision, lastAction.value, optionsParams.value);
  }

  function sameRange(left: TopDiscsDateRange, right: TopDiscsDateRange): boolean {
    return left === null
      ? right === null
      : right !== null && left[0] === right[0] && left[1] === right[1];
  }

  function copyRange(dateRange: TopDiscsDateRange): TopDiscsDateRange {
    return dateRange ? [dateRange[0], dateRange[1]] : null;
  }

  onMounted(() => {
    const currentRevision = ++revision;
    validationPending.value = true;
    void validateOptions(currentRevision, "period", optionsParams.value);
  });

  return {
    ...toRefs(filters),
    optionsParams,
    countries,
    genres,
    optionsLoading,
    optionsError,
    optionsEmpty,
    canLoadRanking,
    optionsQuery,
    setInitialDateRange,
    setPeriod,
    setYear,
    setDateRange,
    setCountry,
    setGenre,
    retryOptions,
  };
}
