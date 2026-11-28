<script setup lang="ts">
import { computed } from "vue";
import type { StatisticsSummary } from "@/modules/statistics/types/statistics";
import StatisticsInfoPopover from "./StatisticsInfoPopover.vue";

const props = defineProps<{ summary: StatisticsSummary }>();


const integerFormatter = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const deviationInterpretation = computed(() => {
  const value = props.summary.standardDeviation;
  if (value === null || !Number.isFinite(value)) return null;
  if (value < 1) return { label: "Baja", description: "Tus notas están bastante concentradas" };
  if (value < 2) return { label: "Moderada", description: "Tus valoraciones muestran cierta variedad" };
  return { label: "Alta", description: "Hay grandes diferencias entre tus puntuaciones" };
});

function formatInteger(value: number): string {
  return Number.isFinite(value) ? integerFormatter.format(value) : "—";
}

function formatDecimal(value: number | null): string {
  return value === null || !Number.isFinite(value) ? "—" : decimalFormatter.format(value);
}
</script>

<template>
  <section aria-label="Resumen anual" class="grid grid-cols-2 gap-3 sm:gap-4">
    <article class="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-4 text-center shadow-sm dark:border-white/10 dark:bg-rv-darkCard sm:min-h-44 sm:px-4">
      <span class="flex h-10 w-10 items-center justify-center rounded-full bg-rv-blue text-sm text-white shadow-sm" aria-hidden="true">
        <i class="fa-solid fa-compact-disc"></i>
      </span>
      <h2 class="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Discos puntuados</h2>
      <p class="text-3xl font-bold leading-none tabular-nums text-rv-navy dark:text-white">{{ formatInteger(summary.scoredDiscs) }}</p>
      <p class="text-xs text-gray-600 dark:text-gray-300">con nota vigente</p>
    </article>

    <article class="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-4 text-center shadow-sm dark:border-white/10 dark:bg-rv-darkCard sm:min-h-44 sm:px-4">
      <span class="flex h-10 w-10 items-center justify-center rounded-full bg-rv-purple text-sm text-white shadow-sm" aria-hidden="true">
        <i class="fa-solid fa-scale-balanced"></i>
      </span>
      <h2 class="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Nota media</h2>
      <p class="text-3xl font-bold leading-none tabular-nums text-rv-navy dark:text-white">{{ formatDecimal(summary.mean) }}</p>
      <p class="text-xs text-gray-600 dark:text-gray-300">sobre 10</p>
    </article>

    <article class="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-4 text-center shadow-sm dark:border-white/10 dark:bg-rv-darkCard sm:min-h-44 sm:px-4">
      <span class="flex h-10 w-10 items-center justify-center rounded-full bg-rv-pink text-sm text-white shadow-sm" aria-hidden="true">
        <i class="fa-solid fa-chart-simple"></i>
      </span>
      <div class="flex items-center justify-center gap-1.5">
        <h2 class="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Mediana</h2>
        <!-- En móvil esta tarjeta queda a la izquierda: la ventanita se abre hacia la derecha. -->
        <StatisticsInfoPopover id="median-help" label="Explicación de la mediana" title="¿Qué es la mediana?" mobile-align="left">
          Es la nota que queda justo en el centro si ordenas todas tus puntuaciones del año de menor a mayor: la mitad de tus discos tienen esa nota o menos, y la otra mitad esa nota o más.
          A diferencia de la nota media, no se deja arrastrar por unos pocos discos con notas muy altas o muy bajas.
        </StatisticsInfoPopover>
      </div>
      <p class="text-3xl font-bold leading-none tabular-nums text-rv-navy dark:text-white">{{ formatDecimal(summary.median) }}</p>
      <p class="text-xs text-gray-600 dark:text-gray-300">sobre 10</p>
    </article>

    <article class="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-4 text-center shadow-sm dark:border-white/10 dark:bg-rv-darkCard sm:min-h-44 sm:px-4">
      <span class="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-sm text-white shadow-sm" aria-hidden="true">
        <i class="fa-solid fa-arrows-left-right-to-line"></i>
      </span>
      <div class="flex items-center justify-center gap-1.5">
        <h2 class="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Desviación típica</h2>
        <StatisticsInfoPopover id="deviation-help" label="Explicación de la desviación típica" title="¿Qué es la desviación típica?">
          Mide cuánto se alejan tus puntuaciones de tu nota media. Se calcula con las notas vigentes de los discos incluidos en las estadísticas del año. Cuanto menor es, más parecidas son tus notas.
          Los rangos son criterios orientativos de Riff Valley, no categorías universales.
        </StatisticsInfoPopover>
      </div>
      <p class="text-3xl font-bold leading-none tabular-nums text-rv-navy dark:text-white">{{ formatDecimal(summary.standardDeviation) }}</p>
      <template v-if="deviationInterpretation">
        <p class="text-sm font-semibold text-rv-navy dark:text-white">{{ deviationInterpretation.label }}</p>
        <p class="text-xs text-gray-600 dark:text-gray-300">{{ deviationInterpretation.description }}</p>
      </template>
      <p v-else class="text-xs text-gray-600 dark:text-gray-300">Sin datos para clasificar</p>
    </article>
  </section>
</template>

