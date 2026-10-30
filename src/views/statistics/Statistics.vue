<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from "vue";
import SimpleSelect from "@components/SimpleSelect.vue";
import { useStatisticsSummaryQuery } from "@/modules/statistics/application/useStatisticsQueries";
import { useStatisticsFilters } from "@/modules/statistics/application/statisticsFilters";
import ActivityCalendar from "./components/ActivityCalendar.vue";
import GenreActivityChart from "./components/GenreActivityChart.vue";
import MonthlyActivityChart from "./components/MonthlyActivityChart.vue";
import ControversialDiscsList from "./components/ControversialDiscsList.vue";
import FeaturedDiscCard from "./components/FeaturedDiscCard.vue";
import ScoreDistributionChart from "./components/ScoreDistributionChart.vue";
import StatisticsSummaryCards from "./components/StatisticsSummaryCards.vue";

defineOptions({ name: "StatisticsView" });

const filters = useStatisticsFilters();
const summaryQuery = useStatisticsSummaryQuery();
const isGalaxyOpen = ref(false);
const GenreGalaxyModal = defineAsyncComponent(() => import("./components/GenreGalaxyModal.vue"));

const yearOptions = computed(() => Array.from(
  { length: filters.currentYear.value - filters.minYear + 1 },
  (_, index) => {
    const year = filters.currentYear.value - index;
    return { value: year, label: String(year) };
  },
));

const summary = computed(() => {
  const result = summaryQuery.data.value;
  if (!result || result.year !== filters.year.value || result.timeZone !== filters.timeZone.value) return null;
  return result;
});

const isInitialLoading = computed(() => summaryQuery.isPending.value || (summaryQuery.isFetching.value && !summary.value));

function updateYear(value: string | number | null): void {
  if (typeof value === "number") filters.setYear(value);
}

function retry(): void {
  void summaryQuery.refetch();
}
</script>

<template>
  <main class="max-w-7xl mx-auto mt-10 px-4 sm:px-6 lg:px-8 pb-10">
    <header class="mb-8 text-center">
      <h1 class="text-2xl md:text-3xl font-bold mb-2 text-rv-navy dark:text-white">
        <i class="fa-solid fa-chart-area mr-3" aria-hidden="true"></i>Estadísticas
      </h1>
      <p class="text-sm text-gray-500 dark:text-gray-400">Tus estadísticas anuales de actividad y puntuaciones.</p>
    </header>

    <div class="flex justify-center mb-6">
      <div class="w-full max-w-[320px] sm:max-w-[380px]">
        <SimpleSelect
          :model-value="filters.year.value"
          :options="yearOptions"
          placeholder="Selecciona un año"
          aria-label="Año de las estadísticas"
          class="w-full"
          @update:model-value="updateYear"
        />
      </div>
    </div>

    <div class="grid grid-cols-1 gap-6">
      <section aria-label="Resumen anual y disco destacado" class="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(17rem,1fr)] lg:items-stretch">
        <template v-if="isInitialLoading">
          <div
            aria-label="Resumen anual"
            role="status"
            aria-live="polite"
            aria-busy="true"
            class="grid grid-cols-2 gap-3 sm:gap-4"
          >
            <span class="sr-only">Cargando estadísticas del año {{ filters.year.value }}…</span>
            <div v-for="item in 4" :key="item" class="flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-rv-navy sm:min-h-44">
              <div class="h-10 w-10 animate-pulse rounded-full bg-gray-200 dark:bg-white/10"></div>
              <div class="h-3 w-24 animate-pulse rounded bg-gray-200 dark:bg-white/10"></div>
              <div class="h-8 w-16 animate-pulse rounded bg-gray-200 dark:bg-white/10"></div>
            </div>
          </div>
          <div aria-hidden="true" class="min-h-80 animate-pulse rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-rv-navy"></div>
        </template>

        <section
          v-else-if="summaryQuery.isError.value"
          role="alert"
          class="rounded-2xl border border-red-200 bg-white p-6 text-center text-red-700 dark:border-red-400/30 dark:bg-rv-navy dark:text-red-300 lg:col-span-2"
        >
          <p>No se pudieron cargar las estadísticas de {{ filters.year.value }}.</p>
          <button
            type="button"
            class="mt-3 rounded-lg px-3 py-2 font-semibold underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            @click="retry"
          >
            Reintentar
          </button>
        </section>

        <template v-else-if="summary">
          <StatisticsSummaryCards :summary="summary" />
          <FeaturedDiscCard :disc="summary.topDiscOverall" />
        </template>
      </section>

      <template v-if="summary">
        <p
          v-if="summary.activityCount === 0"
          role="status"
          class="rounded-2xl border border-gray-100 bg-white p-6 text-center text-gray-600 shadow-md dark:border-white/10 dark:bg-rv-navy dark:text-gray-300"
        >
          No hay actividad de voto registrada en {{ summary.year }}. Puedes elegir otro año para consultar sus estadísticas.
        </p>

        <p
          v-else-if="summary.scoredDiscs === 0"
          role="status"
          class="rounded-2xl border border-gray-100 bg-white p-5 text-center text-gray-600 shadow-md dark:border-white/10 dark:bg-rv-navy dark:text-gray-300"
        >
          Hay actividad este año, pero ningún disco conserva una puntuación vigente para calcular la media o la mediana.
        </p>

        <p v-if="summaryQuery.isFetching.value" role="status" aria-live="polite" class="text-center text-sm text-gray-600 dark:text-gray-300">
          Actualizando estadísticas…
        </p>
      </template>

      <section v-if="summary" aria-label="Visualizaciones anuales" class="grid grid-cols-1 gap-6">
        <MonthlyActivityChart
          :year="summary.year"
          :activity="summary.activityByMonth"
          :annual-activity-count="summary.activityCount"
        />
        <ActivityCalendar
          :year="summary.year"
          :activity="summary.activityByDay"
          :annual-activity-count="summary.activityCount"
        />
        <GenreActivityChart
          :year="summary.year"
          :activity="summary.activityByGenre"
          :activity-without-genre="summary.activityWithoutGenre"
          :annual-activity-count="summary.activityCount"
          @open-galaxy="isGalaxyOpen = true"
        />

        <ScoreDistributionChart
          :score-distribution="summary.scoreDistribution"
          :scored-discs="summary.scoredDiscs"
          :year="summary.year"
        />
        <ControversialDiscsList :discs="summary.mostControversial" />

      </section>
    </div>
    <GenreGalaxyModal v-if="isGalaxyOpen" :year="filters.year.value" @close="isGalaxyOpen = false" />
  </main>
</template>
