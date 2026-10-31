<template>
  <section class="w-full space-y-3" aria-label="Filtros para explorar discos">
    <button
      type="button"
      class="flex min-h-11 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 text-left font-medium text-rv-navy shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:border-white/15 dark:bg-rv-darkCard dark:text-white md:hidden"
      :aria-expanded="filtersOpen"
      aria-controls="disc-list-exploration-controls"
      @click="filtersOpen = !filtersOpen"
    >
      <span
        >Filtros<span v-if="activeFilterCount"> · {{ activeFilterCount }} activos</span></span
      >
      <i
        class="fa-solid"
        :class="filtersOpen ? 'fa-chevron-up' : 'fa-chevron-down'"
        aria-hidden="true"
      />
    </button>

    <div
      id="disc-list-exploration-controls"
      v-show="filtersOpen || !isMobile"
      class="exploration-controls"
    >
      <div class="exploration-grid">
        <div class="filter-control" role="group" aria-labelledby="disc-list-year-label">
          <span id="disc-list-year-label" class="text-gray-700 dark:text-gray-200">Año</span>
          <select
            id="disc-list-year"
            class="native-filter-select"
            aria-label="Año"
            :value="selectedYear"
            @change="selectYear(($event.target as HTMLSelectElement).value)"
          >
            <option v-for="year in yearsOptions" :key="year.value" :value="year.value">
              {{ year.label }}
            </option>
          </select>
        </div>

        <div
          v-if="selectedYear !== 0"
          class="filter-control"
          role="group"
          aria-labelledby="disc-list-month-label"
        >
          <span id="disc-list-month-label" class="text-gray-700 dark:text-gray-200">Mes</span>
          <select
            id="disc-list-month"
            class="native-filter-select"
            aria-label="Mes"
            :value="selectedMonth"
            @change="selectMonth(($event.target as HTMLSelectElement).value)"
          >
            <option v-for="month in monthsOptions" :key="month.value" :value="month.value">
              {{ month.label }}
            </option>
          </select>
        </div>

        <div
          v-if="selectedYear !== 0 && selectedMonth !== 0"
          class="filter-control period-control"
          role="group"
          aria-labelledby="disc-list-period-label"
        >
          <span id="disc-list-period-label" class="text-gray-700 dark:text-gray-200"
            >Semana o periodo</span
          >
          <select
            id="disc-list-period"
            class="native-filter-select"
            aria-label="Semana o periodo"
            :value="selectedPeriod"
            @change="selectPeriod(($event.target as HTMLSelectElement).value)"
          >
            <option v-for="period in periodOptions" :key="period.value" :value="period.value">
              {{ period.label }}
            </option>
          </select>
        </div>

        <div
          class="filter-control country-control"
          role="group"
          aria-labelledby="disc-list-country-label"
        >
          <span id="disc-list-country-label" class="text-gray-700 dark:text-gray-200">País</span>
          <SearchableSelect
            v-model="countryModel"
            :options="countries"
            placeholder="Buscar país..."
            trigger-placeholder="Todos los países"
            all-label="Todos los países"
            title="name"
            trackby="id"
            :max="150"
            class="select-pill w-full"
          />
        </div>

        <div class="filter-control genre-control">
          <span class="text-gray-700 dark:text-gray-200">Géneros</span>
          <DiscListGenreSelect
            :model-value="selectedGenres"
            :options="genres"
            :loading="optionsLoading"
            @update:model-value="emit('update:genres', $event)"
          />
        </div>

        <div
          v-if="showNoRatesFilter"
          class="filter-control no-rates-control"
          role="group"
          aria-labelledby="disc-list-no-rates-label"
        >
          <span id="disc-list-no-rates-label" class="text-gray-700 dark:text-gray-200"
            >Sin votos</span
          >
          <label class="no-rates-switch" title="Mostrar solo discos sin votos">
            <input
              type="checkbox"
              role="switch"
              class="sr-only"
              aria-label="Mostrar solo discos sin votos"
              :checked="noRatesOnly"
              @change="emit('update:no-rates', ($event.target as HTMLInputElement).checked)"
            />
            <span class="no-rates-switch-track" aria-hidden="true" />
          </label>
        </div>
      </div>

      <p v-if="optionsError" class="text-sm text-red-700 dark:text-red-300" role="alert">
        No se pudieron cargar los filtros de país y género.
        <button
          type="button"
          class="ml-1 font-semibold underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-pink"
          @click="emit('retry-options')"
        >
          Reintentar
        </button>
      </p>
      <p v-else-if="optionsLoading" class="text-sm text-gray-600 dark:text-gray-300" role="status">
        Actualizando opciones de filtros...
      </p>
    </div>

    <div
      v-if="activeFilters.length || noRatesOnly || $slots.savedActions"
      class="flex flex-wrap items-center justify-between gap-3"
      aria-label="Filtros activos"
    >
      <div
        v-if="activeFilters.length || noRatesOnly || searchQuery.trim()"
        class="flex min-w-0 flex-wrap items-center gap-2"
      >
        <template v-if="activeFilters.length">
          <span
            v-for="filter in visibleFilters"
            :key="filter.key"
            class="inline-flex min-h-9 max-w-full items-center gap-1 rounded-full border border-rv-pink/30 bg-rv-pink/10 pl-3 pr-1 text-sm text-rv-navy dark:border-rv-pink/40 dark:bg-rv-pink/20 dark:text-white"
          >
            <span class="truncate">{{ filter.label }}</span>
            <button
              type="button"
              class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-transparent hover:bg-rv-pink/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink"
              :aria-label="`Quitar ${filter.label}`"
              @click="removeFilter(filter.key)"
            >
              <i class="fa-solid fa-xmark text-xs" aria-hidden="true" />
            </button>
          </span>
          <button
            v-if="hiddenGenreCount > 0"
            type="button"
            class="min-h-9 rounded-full border border-gray-300 bg-transparent px-3 text-sm text-rv-navy hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:border-white/20 dark:text-white dark:hover:bg-rv-darkSurface"
            :aria-expanded="showAllGenres"
            @click="showAllGenres = !showAllGenres"
          >
            {{ showAllGenres ? "Mostrar menos" : `+${hiddenGenreCount} géneros` }}
          </button>
        </template>
        <button
          v-if="activeFilters.length || noRatesOnly || searchQuery.trim()"
          type="button"
          class="min-h-9 bg-transparent px-2 text-sm font-medium text-rv-navy underline underline-offset-2 hover:text-rv-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:text-white"
          @click="clearExploration"
        >
          Limpiar exploración
        </button>
      </div>
      <div class="ml-auto flex flex-wrap items-center justify-end gap-2">
        <slot name="savedActions" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { getAvailableYears, MONTHS } from "@helpers/dateConstants";
import {
  getDiscListDateSelection,
  getDiscListMonthRange,
  getDiscListPeriodOptions,
  getDiscListYearRange,
} from "../../application/discListDateFilters";
import SearchableSelect from "@components/SearchableSelect.vue";
import DiscListGenreSelect from "./DiscListGenreSelect.vue";

interface CountryOption {
  id: string;
  name: string;
  isoCode?: string;
}
interface GenreOption {
  id: string;
  name: string;
  color?: string | null;
}
type Range = [string, string] | null;

const props = defineProps<{
  selectedWeek: Range;
  selectedCountry: string;
  selectedGenres: string[];
  noRatesOnly: boolean;
  showNoRatesFilter: boolean;
  countries: CountryOption[];
  genres: GenreOption[];
  optionsLoading: boolean;
  optionsError: boolean;
  searchQuery: string;
}>();
const emit = defineEmits<{
  "update:week": [value: Range];
  "update:country": [value: string];
  "update:genres": [value: string[]];
  "update:no-rates": [value: boolean];
  "update:search": [value: string];
  "retry-options": [];
}>();

if (!props.selectedWeek && defaultYear() !== 0) {
  emit("update:week", getDiscListYearRange(defaultYear()));
}

const filtersOpen = ref(false);
const showAllGenres = ref(false);
const isMobile = ref(
  typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
);
const countryModel = computed({
  get: () => props.selectedCountry,
  set: (value: string | number) => emit("update:country", String(value ?? "")),
});

const selectedYear = computed(() => getDiscListDateSelection(props.selectedWeek).year);
const selectedMonth = computed(() => getDiscListDateSelection(props.selectedWeek).month);
const yearsOptions = computed(() => [
  { value: 0, label: "Todos los años" },
  ...getAvailableYears().map((year) => ({ value: year, label: String(year) })),
]);
const monthsOptions = computed(() => [
  { value: 0, label: "Año completo" },
  ...MONTHS.map((label, index) => ({ value: index + 1, label })),
]);
const selectedPeriod = computed(() => {
  const option = periodOptions.value.find((item) =>
    item.range?.every((v, i) => v === props.selectedWeek?.[i])
  );
  return (
    option?.value ?? (selectedMonth.value ? `M-${selectedYear.value}-${selectedMonth.value}` : "")
  );
});
const periodOptions = computed(() => {
  return getDiscListPeriodOptions(selectedYear.value, selectedMonth.value);
});

const activeFilters = computed(() => {
  const result: Array<{ key: string; label: string }> = [];
  if (props.selectedWeek) result.push({ key: "week", label: describeRange(props.selectedWeek) });
  const country = props.countries.find((item) => item.id === props.selectedCountry);
  if (props.selectedCountry)
    result.push({ key: "country", label: country?.name ?? props.selectedCountry });
  for (const id of props.selectedGenres) {
    const genre = props.genres.find((item) => item.id.toLowerCase() === id.toLowerCase());
    result.push({ key: `genre:${id}`, label: genre?.name ?? id });
  }
  return result;
});
const visibleFilters = computed(() => {
  const genres = activeFilters.value.filter((item) => item.key.startsWith("genre:"));
  const other = activeFilters.value.filter((item) => !item.key.startsWith("genre:"));
  return [...other, ...(showAllGenres.value ? genres : genres.slice(0, 2))];
});
const hiddenGenreCount = computed(() => Math.max(0, props.selectedGenres.length - 2));
const activeFilterCount = computed(
  () =>
    Number(Boolean(props.selectedWeek)) +
    Number(Boolean(props.selectedCountry)) +
    props.selectedGenres.length +
    Number(props.noRatesOnly)
);

function defaultYear() {
  return localStorage.getItem("rv_default_year_filter") === "all" ? 0 : new Date().getFullYear();
}
function describeRange(range: [string, string]) {
  const start = new Date(range[0]);
  const end = new Date(range[1]);
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();
  if (startYear === 1 && endYear !== 9999) return `Hasta ${endYear}`;
  if (endYear === 9999 && startYear !== 1) return `Desde ${startYear}`;
  const format = (date: Date) =>
    `${String(date.getUTCDate()).padStart(2, "0")}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${date.getUTCFullYear()}`;
  return `${format(start)} – ${format(end)}`;
}
function selectYear(value: string | number | null) {
  const year = Number(value);
  emit("update:week", year === 0 ? null : getDiscListYearRange(year));
}
function selectMonth(value: string | number | null) {
  const month = Number(value);
  emit(
    "update:week",
    month === 0
      ? getDiscListYearRange(selectedYear.value)
      : getDiscListMonthRange(selectedYear.value, month)
  );
}
function selectPeriod(value: string | number | null) {
  const option = periodOptions.value.find((item) => item.value === value);
  if (option) emit("update:week", option.range);
}
function removeFilter(key: string) {
  if (key === "week") emit("update:week", null);
  else if (key === "country") emit("update:country", "");
  else
    emit(
      "update:genres",
      props.selectedGenres.filter((id) => `genre:${id}` !== key)
    );
}
function clearExploration() {
  emit("update:search", "");
  emit("update:week", null);
  emit("update:country", "");
  emit("update:genres", []);
  emit("update:no-rates", false);
}
function onYearPreferenceChanged(event: Event) {
  const value = (event as CustomEvent).detail;
  emit("update:week", value === "all" ? null : getDiscListYearRange(new Date().getFullYear()));
}
function onResize() {
  isMobile.value = window.matchMedia("(max-width: 767px)").matches;
}
onMounted(() => {
  window.addEventListener("rv-year-filter-changed", onYearPreferenceChanged);
  window.addEventListener("resize", onResize);
});
onUnmounted(() => {
  window.removeEventListener("rv-year-filter-changed", onYearPreferenceChanged);
  window.removeEventListener("resize", onResize);
});
</script>

<style scoped>
.exploration-controls {
  border-bottom: 1px solid rgb(229 231 235 / 0.8);
  padding: 0.25rem 0 1.25rem;
}
.exploration-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem 1.25rem;
}
.filter-control {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.4rem;
}
.filter-control > span,
.filter-control > label {
  font-size: 0.8rem;
  font-weight: 600;
}
.native-filter-select {
  min-height: 2.75rem;
  width: 100%;
  border: 1px solid;
  border-radius: 9999px;
  padding: 0.5rem 2.25rem 0.5rem 1rem;
  @apply border-gray-300 bg-white text-rv-navy dark:border-white/20 dark:bg-rv-darkCard dark:text-white;
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.08);
}
.native-filter-select:focus-visible {
  @apply outline-none ring-2 ring-rv-pink ring-offset-2;
}
.genre-control,
.country-control {
  grid-column: auto;
}
.no-rates-control {
  align-self: stretch;
  justify-content: flex-start;
}
.no-rates-switch {
  display: inline-flex;
  width: fit-content;
  cursor: pointer;
}
.no-rates-switch-track {
  position: relative;
  display: block;
  width: 3rem;
  height: 1.75rem;
  border-radius: 9999px;
  background: #d1d5db;
  transition: background-color 160ms ease;
}
.no-rates-switch-track::before {
  position: absolute;
  top: 0.25rem;
  left: 0.25rem;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 9999px;
  background: white;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.2);
  content: "";
  transition: transform 160ms ease;
}
.no-rates-switch input:checked + .no-rates-switch-track {
  background: #00021f;
}
.no-rates-switch input:checked + .no-rates-switch-track::before {
  transform: translateX(1.25rem);
}
.no-rates-switch input:focus-visible + .no-rates-switch-track {
  outline: 2px solid #e46e8a;
  outline-offset: 2px;
}
.dark .no-rates-switch-track {
  background: #27283c;
}
.dark .no-rates-switch input:checked + .no-rates-switch-track {
  background: #e5e7eb;
}
.dark .no-rates-switch input:checked + .no-rates-switch-track::before {
  background: #00021f;
}
.country-control :deep(.search_input_trigger) {
  height: 2.75rem;
  line-height: 1.25rem;
}
@media (min-width: 1024px) {
  .exploration-controls {
    padding-top: 0.5rem;
  }
  .exploration-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
    align-items: end;
  }
  .genre-control {
    grid-column: span 2;
  }
  .exploration-grid:has(.period-control) {
    grid-template-columns: repeat(7, minmax(0, 1fr));
  }
}
@media (max-width: 480px) {
  .exploration-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .genre-control,
  .country-control {
    grid-column: auto;
  }
}
</style>
