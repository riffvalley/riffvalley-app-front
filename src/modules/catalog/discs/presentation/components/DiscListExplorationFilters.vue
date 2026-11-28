<template>
  <section class="w-full space-y-3" aria-label="Filtros para explorar discos">
    <!-- Botón «Fecha, país y género» de móvil: despliega esos filtros justo debajo.
         No se llama «Filtros» para no confundirlo con los filtros guardados. -->
    <div class="flex flex-col gap-3 md:hidden">
      <button
        type="button"
        class="flex h-[50px] min-w-0 flex-1 items-center justify-between rounded-2xl border border-gray-300 bg-white px-4 text-left font-medium text-rv-navy shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-navy aria-expanded:ring-2 aria-expanded:ring-rv-navy dark:aria-expanded:ring-gray-200 dark:border-white/20 dark:bg-rv-darkCard dark:text-white dark:focus-visible:ring-gray-200"
        :aria-expanded="filtersOpen"
        aria-controls="disc-list-exploration-controls"
        @click="filtersOpen = !filtersOpen"
      >
        <span class="flex min-w-0 items-center gap-2 whitespace-nowrap"
          >Fecha, país y género<span
            v-if="activeFilterCount"
            class="inline-flex min-w-6 items-center justify-center rounded-full bg-rv-navy px-1.5 text-xs font-semibold leading-6 text-white dark:bg-gray-200 dark:text-rv-navy"
            >{{ activeFilterCount }}<span class="sr-only"> activos</span></span
          ></span
        >
        <i
          class="fa-solid"
          :class="filtersOpen ? 'fa-chevron-up' : 'fa-chevron-down'"
          aria-hidden="true"
        />
      </button>
    </div>

    <!-- Desde md el botón «Fecha, país y género» está oculto: sin el margen de space-y-3,
         la separación con el buscador es la misma que entre filtros. -->
    <div
      id="disc-list-exploration-controls"
      v-show="filtersOpen || !isMobile"
      class="exploration-controls md:!mt-0"
    >
      <div class="exploration-grid">
        <div class="filter-control" role="group" aria-labelledby="disc-list-year-label">
          <span id="disc-list-year-label" class="filter-label">Año</span>
          <DiscListSelect
            id="disc-list-year"
            labelledby="disc-list-year-label"
            :model-value="selectedYear"
            :options="yearsOptions"
            @update:model-value="selectYear"
          />
        </div>

        <!-- Mes y semana se ven siempre para que la fila no tenga huecos; hasta
             elegir año (o mes) quedan desactivados y lo dicen en su texto. -->
        <div class="filter-control" role="group" aria-labelledby="disc-list-month-label">
          <span id="disc-list-month-label" class="filter-label">Mes</span>
          <DiscListSelect
            id="disc-list-month"
            labelledby="disc-list-month-label"
            :model-value="selectedYear !== 0 ? selectedMonth : ''"
            :options="monthSelectOptions"
            :disabled="selectedYear === 0"
            @update:model-value="selectMonth"
          />
        </div>

        <div
          class="filter-control period-control"
          role="group"
          aria-labelledby="disc-list-period-label"
        >
          <span id="disc-list-period-label" class="filter-label"
            >Semana o periodo</span
          >
          <DiscListSelect
            id="disc-list-period"
            labelledby="disc-list-period-label"
            :model-value="periodEnabled ? selectedPeriod : ''"
            :options="periodSelectOptions"
            :disabled="!periodEnabled"
            @update:model-value="selectPeriod"
          />
        </div>

        <div
          class="filter-control country-control"
          role="group"
          aria-labelledby="disc-list-country-label"
        >
          <span id="disc-list-country-label" class="filter-label">País</span>
          <DiscListCountrySelect
            :model-value="selectedCountry"
            :options="countries"
            @update:model-value="emit('update:country', $event)"
          />
        </div>

        <div class="filter-control genre-control">
          <span class="filter-label">Géneros</span>
          <DiscListGenreSelect
            :model-value="selectedGenres"
            :options="genres"
            :loading="optionsLoading"
            @update:model-value="emit('update:genres', $event)"
          />
        </div>

        <DiscListNoRatesSwitch
          v-if="showNoRatesFilter && !isMobile"
          class="filter-control"
          :model-value="noRatesOnly"
          @update:model-value="emit('update:no-rates', $event)"
        />
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

    <!-- En móvil «Sin votos» queda fuera del desplegable, para que se vea
         siempre; va después de los filtros para que estos salgan pegados a «Fecha, país y género». -->
    <DiscListNoRatesSwitch
      v-if="showNoRatesFilter && isMobile"
      class="md:hidden"
      :model-value="noRatesOnly"
      @update:model-value="emit('update:no-rates', $event)"
    />

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
          Limpiar
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
  formatDiscListDay,
  isDiscListSingleDayRange,
  getDiscListYearRange,
} from "../../application/discListDateFilters";
import DiscListCountrySelect from "./DiscListCountrySelect.vue";
import DiscListGenreSelect from "./DiscListGenreSelect.vue";
import DiscListNoRatesSwitch from "./DiscListNoRatesSwitch.vue";
import DiscListSelect from "./DiscListSelect.vue";

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
  /** true cuando se han restaurado filtros guardados: no imponer el año por defecto. */
  skipDefaultYear?: boolean;
}>();
const emit = defineEmits<{
  "update:week": [value: Range];
  "update:country": [value: string];
  "update:genres": [value: string[]];
  "update:no-rates": [value: boolean];
  "update:search": [value: string];
  "retry-options": [];
}>();

if (!props.skipDefaultYear && !props.selectedWeek && defaultYear() !== 0) {
  emit("update:week", getDiscListYearRange(defaultYear()));
}

const filtersOpen = ref(false);
const showAllGenres = ref(false);
const isMobile = ref(
  typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
);

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
// Un solo día (acceso directo «Hoy» del Dashboard) no es ninguna semana del
// selector: se añade como opción propia para que el selector no diga «Mes completo».
const dayOption = computed(() => {
  const range = props.selectedWeek;
  if (!isDiscListSingleDayRange(range)) return null;
  return { value: `D-${range[0].slice(0, 10)}`, label: `Solo el ${formatDiscListDay(range[0])}`, range };
});
const selectedPeriod = computed(() => {
  if (dayOption.value) return dayOption.value.value;
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
const periodEnabled = computed(() => selectedYear.value !== 0 && selectedMonth.value !== 0);
/** Sin año, el mes desactivado solo muestra «Todos los meses». */
const monthSelectOptions = computed(() =>
  selectedYear.value !== 0 ? monthsOptions.value : [{ value: "", label: "Todos los meses" }]
);
/** Sin mes, la semana desactivada solo muestra «Todas las semanas». */
const periodSelectOptions = computed(() =>
  periodEnabled.value
    ? [...(dayOption.value ? [dayOption.value] : []), ...periodOptions.value]
    : [{ value: "", label: "Todas las semanas" }]
);

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
// Solo cuenta lo que hay dentro del desplegable de móvil: «Sin votos» va fuera.
const activeFilterCount = computed(
  () =>
    Number(Boolean(props.selectedWeek)) +
    Number(Boolean(props.selectedCountry)) +
    props.selectedGenres.length
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
  if (isDiscListSingleDayRange(range)) return format(start);
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
/* Mismo hueco de 1rem que entre la búsqueda y «Mis filtros», sin línea
   separadora: los filtros quedan como un solo bloque con lo de arriba. */
.exploration-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}
/* Mismo formato que «Buscar discos o artistas» y «Mis filtros»: control de
   50px con esquinas rounded-2xl y anillo de foco navy. Los títulos solo los
   lee el lector de pantalla: el valor de cada selector ya dice qué filtra. */
.filter-control {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.5rem;
}
.filter-label {
  @apply sr-only;
}
.genre-control,
.country-control {
  grid-column: auto;
}
/* La rejilla se adapta al ancho que tiene de verdad (con o sin menú lateral),
   no al de la pantalla. */
.exploration-controls {
  container-type: inline-size;
}
/* Poco ancho (dos columnas): año y mes juntos, la semana a lo ancho debajo y
   luego país y géneros; así las fechas no se mezclan con el país. */
.exploration-grid > .period-control,
.exploration-grid > .no-rates-control {
  grid-column: 1 / -1;
}
/* Ancho suficiente: dos filas de tres columnas iguales. Arriba las fechas
   (año, mes y semana) y abajo país, géneros y «Sin votos». */
@container (min-width: 720px) {
  .exploration-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: end;
  }
  .exploration-grid > .filter-control {
    grid-row: 1;
  }
  .exploration-grid > .period-control {
    grid-column: auto;
  }
  .exploration-grid > .country-control {
    grid-row: 2;
    grid-column: 1;
  }
  .exploration-grid > .genre-control {
    grid-row: 2;
    grid-column: 2;
  }
  .exploration-grid > .no-rates-control {
    grid-row: 2;
    grid-column: 3;
  }
  /* Sin «Sin votos», «Géneros» aprovecha también la tercera columna. */
  .exploration-grid > .genre-control:last-child {
    grid-column: 2 / -1;
  }
}
/* Muy estrecho: una sola columna. */
@container (max-width: 439px) {
  .exploration-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
