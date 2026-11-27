import { computed, onMounted, reactive, ref, toRefs } from "vue";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { getAllCountries } from "@services/countries/countries";
import { getAllGenres } from "@services/genres/genres";
import { getTopDiscsOptions } from "../api/topDiscs";
import { topDiscsOptionsQueryKeyFor, useTopDiscsOptionsQuery } from "./useTopDiscsQueries";
import type { TopDiscsOptionsParams, TopDiscsOptionsResponse } from "../types/topDiscs";

/**
 * Catálogo completo de países y géneros, el mismo que ofrece Discos sin periodo.
 * Los selectores de Top Discos muestran siempre todas las opciones: si una
 * combinación no tiene discos en el periodo, el ranking enseña su estado vacío.
 */
async function loadFilterCatalog(): Promise<TopDiscsOptionsResponse> {
  const [genres, countries] = await Promise.all([getAllGenres(), getAllCountries()]);
  const byName = (left: { name: string }, right: { name: string }) =>
    left.name.localeCompare(right.name, "es");
  return {
    countries: countries.map(({ id, name, isoCode }) => ({ id, name, isoCode })).sort(byName),
    genres: genres.map(({ id, name, color }) => ({ id, name, color: color ?? null })).sort(byName),
  };
}

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
  let revision = 0;

  const optionsParams = computed<TopDiscsOptionsParams>(() => ({
    ...(filters.dateRange ? { dateRange: normalizeDateRange(filters.dateRange) } : {}),
    ...(filters.countryId ? { countryId: filters.countryId } : {}),
    ...(filters.genreId ? { genreId: filters.genreId } : {}),
  }));
  const currentOptionsKey = computed(() => paramsFingerprint(optionsParams.value));
  const optionsQuery = useTopDiscsOptionsQuery(optionsParams, false);
  const catalogQuery = useQuery({
    queryKey: ["top-discs", "filter-catalog"],
    queryFn: loadFilterCatalog,
    staleTime: 10 * 60 * 1000,
  });

  // El catálogo completo no bloquea el ranking: mientras llega, se ven las opciones del periodo.
  const optionsLoading = computed(() => validationPending.value || optionsQuery.isFetching.value);
  const optionsError = computed(
    () => settledOptionsKey.value === currentOptionsKey.value && optionsQuery.isError.value
  );
  const optionsReady = computed(
    () => settledOptionsKey.value === currentOptionsKey.value && optionsQuery.isSuccess.value
  );
  // Si el catálogo completo falla, las opciones del periodo sirven de respaldo.
  const countries = computed(
    () =>
      catalogQuery.data.value?.countries ??
      (optionsReady.value ? (optionsQuery.data.value?.countries ?? []) : [])
  );
  const genres = computed(
    () =>
      catalogQuery.data.value?.genres ??
      (optionsReady.value ? (optionsQuery.data.value?.genres ?? []) : [])
  );
  const optionsEmpty = computed(
    () => optionsReady.value && countries.value.length === 0 && genres.value.length === 0
  );
  const canLoadRanking = computed(() => settledOptionsKey.value === currentOptionsKey.value);

  function setFilters(update: () => void): Promise<void> {
    const previousParams = optionsParams.value;
    const previousKey = topDiscsOptionsQueryKeyFor(previousParams);
    const currentRevision = ++revision;
    settledOptionsKey.value = null;
    validationPending.value = true;
    update();
    const requestedParams = optionsParams.value;

    if (paramsFingerprint(previousParams) !== paramsFingerprint(requestedParams)) {
      void queryClient.cancelQueries({ queryKey: previousKey, exact: true });
    }

    return validateOptions(currentRevision, requestedParams);
  }

  async function validateOptions(
    currentRevision: number,
    requestedParams: TopDiscsOptionsParams
  ): Promise<void> {
    try {
      await queryClient.fetchQuery({
        queryKey: topDiscsOptionsQueryKeyFor(requestedParams),
        queryFn: ({ signal }) => getTopDiscsOptions(requestedParams, signal),
      });

      if (
        currentRevision !== revision ||
        paramsFingerprint(optionsParams.value) !== paramsFingerprint(requestedParams)
      ) {
        return;
      }

      // Las listas son completas: la elección del usuario se respeta aunque no
      // tenga discos en el periodo; el ranking mostrará entonces su estado vacío.
      settledOptionsKey.value = paramsFingerprint(requestedParams);
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
    return setFilters(() => {
      filters.period = period;
      filters.dateRange = copyRange(dateRange);
    });
  }

  function setYear(year: number, dateRange: TopDiscsDateRange): Promise<void> {
    if (filters.year === year && sameRange(filters.dateRange, dateRange)) return Promise.resolve();
    return setFilters(() => {
      filters.year = year;
      filters.dateRange = copyRange(dateRange);
    });
  }

  function setDateRange(dateRange: TopDiscsDateRange): Promise<void> {
    if (sameRange(filters.dateRange, dateRange)) return Promise.resolve();
    return setFilters(() => {
      filters.dateRange = copyRange(dateRange);
    });
  }

  function setCountry(countryId: string): Promise<void> {
    if (filters.countryId === countryId) return Promise.resolve();
    return setFilters(() => {
      filters.countryId = countryId;
    });
  }

  function setGenre(genreId: string): Promise<void> {
    if (filters.genreId === genreId) return Promise.resolve();
    return setFilters(() => {
      filters.genreId = genreId;
    });
  }

  function retryOptions(): Promise<void> {
    if (validationPending.value) return Promise.resolve();
    const currentRevision = ++revision;
    settledOptionsKey.value = null;
    validationPending.value = true;
    if (catalogQuery.isError.value) void catalogQuery.refetch();
    return validateOptions(currentRevision, optionsParams.value);
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
    void validateOptions(currentRevision, optionsParams.value);
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
