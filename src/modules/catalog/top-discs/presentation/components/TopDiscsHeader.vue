<template>
  <section aria-label="Filtros del Top Discos">
    <div data-testid="header-control-rows" class="mx-auto w-fit max-w-full">
      <div
        role="group"
        aria-label="Filtros temporales"
        data-testid="temporal-controls"
        class="flex flex-wrap items-center justify-center gap-x-2 gap-y-3 sm:gap-3 mt-2 mb-4"
      >
        <button
          v-for="period in periods"
          :key="period.value"
          type="button"
          @click="emit('period-change', period.value)"
          :class="
            selectedPeriod === period.value
              ? 'bg-rv-navy dark:bg-rv-purple text-white font-semibold hover:opacity-80 hover:shadow-lg'
              : 'bg-gray-200 dark:bg-rv-darkSurface text-rv-navy dark:text-white hover:bg-rv-navy hover:text-white dark:hover:bg-rv-purple hover:shadow-lg'
          "
          class="px-3 sm:px-4 py-1.5 rounded-full shadow-md text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0 border-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink"
        >
          {{ period.label }}
        </button>

        <div v-if="selectedPeriod !== 'all'" class="relative flex w-full flex-wrap justify-center gap-2 sm:w-auto">
          <div class="relative">
            <select
              aria-label="Rango temporal"
              :value="selectedRangeKey"
              @change="onRangeChange"
              class="min-w-[10.5rem] sm:min-w-[12rem] px-4 pr-9 py-1.5 rounded-full shadow-md text-sm font-semibold bg-rv-navy dark:bg-rv-purple text-white appearance-none cursor-pointer border border-transparent dark:border-white/10 transition-all duration-200 hover:-translate-y-0.5 hover:opacity-80 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink"
            >
              <option v-for="option in optionsForSelect" :key="option.key" :value="option.key">
                {{ option.label }}
              </option>
            </select>
            <svg
              class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>

          <div v-if="selectedPeriod === 'week' || selectedPeriod === 'month'" class="relative">
            <select
              aria-label="Año"
              :value="selectedYear"
              @change="onYearChange"
              class="min-w-[6rem] px-4 pr-9 py-1.5 rounded-full shadow-md text-sm font-semibold bg-rv-navy dark:bg-rv-purple text-white appearance-none cursor-pointer border border-transparent dark:border-white/10 transition-all duration-200 hover:-translate-y-0.5 hover:opacity-80 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink"
            >
              <option v-for="year in availableYears" :key="year" :value="year">{{ year }}</option>
            </select>
            <svg
              class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>

      <div
        role="group"
        aria-label="Filtros de catálogo"
        data-testid="catalog-controls"
        class="grid w-full grid-cols-1 md:grid-cols-2 gap-4 mb-4"
      >
        <!-- Mismos selectores que en Discos. El Top solo filtra por un género. -->
        <DiscListCountrySelect
          :model-value="selectedCountry"
          :options="countries"
          @update:model-value="emit('country-change', $event)"
        />
        <DiscListGenreSelect
          :model-value="selectedGenre ? [selectedGenre] : []"
          :options="genres"
          :loading="optionsLoading"
          :multiple="false"
          @update:model-value="onGenreChange"
        />
      </div>

      <p v-if="optionsLoading" role="status" class="mb-3 text-center text-sm text-gray-600 dark:text-gray-300">
        Cargando filtros disponibles…
      </p>
      <div
        v-else-if="optionsError"
        role="alert"
        class="mb-3 text-center text-sm text-red-700 dark:text-red-300"
      >
        <span>No se pudieron cargar los filtros disponibles.</span>
        <button type="button" class="!ml-2 !inline !border-0 !bg-transparent !p-0 !font-semibold !text-rv-navy !shadow-none underline underline-offset-2 hover:!text-rv-pink dark:!text-white" @click="emit('retry-options')">
          Reintentar
        </button>
      </div>
      <p
        v-else-if="optionsEmpty"
        role="status"
        class="mb-3 text-center text-sm text-gray-600 dark:text-gray-300"
      >
        No hay filtros disponibles para este periodo.
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { toRefs } from "vue";
import { DiscListCountrySelect, DiscListGenreSelect } from "@/modules/catalog/discs";
import type { Country, Genre } from "@services/catalog/catalog";
import type { TopDiscsPeriod } from "../../composables/useTopDiscsFilterCoordinator";

interface PeriodOption {
  key: string;
  label: string;
}

interface Props {
  selectedPeriod: TopDiscsPeriod;
  selectedRangeKey: string;
  selectedYear: number;
  selectedCountry: string;
  selectedGenre: string;
  availableYears: number[];
  optionsForSelect: PeriodOption[];
  countries: Country[];
  genres: Genre[];
  optionsLoading: boolean;
  optionsError: boolean;
  optionsEmpty: boolean;
}

const props = defineProps<Props>();
const {
  selectedPeriod,
  selectedRangeKey,
  selectedYear,
  selectedCountry,
  selectedGenre,
  availableYears,
  optionsForSelect,
  countries,
  genres,
  optionsLoading,
  optionsError,
  optionsEmpty,
} = toRefs(props);
const emit = defineEmits<{
  "period-change": [period: TopDiscsPeriod];
  "year-change": [year: number];
  "range-change": [key: string];
  "country-change": [countryId: string];
  "genre-change": [genreId: string];
  "retry-options": [];
}>();

const periods: Array<{ value: TopDiscsPeriod; label: string }> = [
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
  { value: "year", label: "Año" },
  { value: "all", label: "Todos" },
];

function onRangeChange(event: Event): void {
  emit("range-change", (event.target as HTMLSelectElement).value);
}

/** El selector de géneros trabaja en minúsculas: se devuelve el id tal como viene del servidor. */
function onGenreChange(ids: string[]): void {
  const id = ids[0] ?? "";
  emit("genre-change", genres.value.find((genre) => genre.id.toLowerCase() === id)?.id ?? id);
}

function onYearChange(event: Event): void {
  emit("year-change", Number((event.target as HTMLSelectElement).value));
}
</script>
