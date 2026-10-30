<script setup lang="ts">
import { computed, shallowRef } from "vue";
import type { StatisticsSummary } from "@/modules/statistics/types/statistics";

const props = defineProps<{ summary: StatisticsSummary }>();

const isDeviationHelpOpen = shallowRef(false);
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
    <article class="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-4 text-center dark:border-white/10 dark:bg-rv-navy sm:min-h-44 sm:px-4">
      <span class="flex h-10 w-10 items-center justify-center rounded-full bg-rv-blue text-sm text-white shadow-sm" aria-hidden="true">
        <i class="fa-solid fa-compact-disc"></i>
      </span>
      <h2 class="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Discos puntuados</h2>
      <p class="text-3xl font-bold leading-none tabular-nums text-rv-navy dark:text-white">{{ formatInteger(summary.scoredDiscs) }}</p>
      <p class="text-xs text-gray-600 dark:text-gray-300">con nota vigente</p>
    </article>

    <article class="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-4 text-center dark:border-white/10 dark:bg-rv-navy sm:min-h-44 sm:px-4">
      <span class="flex h-10 w-10 items-center justify-center rounded-full bg-rv-purple text-sm text-white shadow-sm" aria-hidden="true">
        <i class="fa-solid fa-scale-balanced"></i>
      </span>
      <h2 class="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Nota media</h2>
      <p class="text-3xl font-bold leading-none tabular-nums text-rv-navy dark:text-white">{{ formatDecimal(summary.mean) }}</p>
      <p class="text-xs text-gray-600 dark:text-gray-300">sobre 10</p>
    </article>

    <article class="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-4 text-center dark:border-white/10 dark:bg-rv-navy sm:min-h-44 sm:px-4">
      <span class="flex h-10 w-10 items-center justify-center rounded-full bg-rv-pink text-sm text-white shadow-sm" aria-hidden="true">
        <i class="fa-solid fa-chart-simple"></i>
      </span>
      <h2 class="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Mediana</h2>
      <p class="text-3xl font-bold leading-none tabular-nums text-rv-navy dark:text-white">{{ formatDecimal(summary.median) }}</p>
      <p class="text-xs text-gray-600 dark:text-gray-300">sobre 10</p>
    </article>

    <article class="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-4 text-center dark:border-white/10 dark:bg-rv-navy sm:min-h-44 sm:px-4">
      <span class="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-sm text-white shadow-sm" aria-hidden="true">
        <i class="fa-solid fa-arrows-left-right-to-line"></i>
      </span>
      <div class="flex items-center justify-center gap-1.5">
        <h2 class="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Desviación típica</h2>
        <button
          type="button"
          class="inline-flex h-8 w-8 items-center justify-center rounded-full text-rv-blue hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rv-blue dark:text-sky-300 dark:hover:bg-white/10"
          :aria-expanded="isDeviationHelpOpen"
          aria-controls="deviation-help"
          aria-label="Explicación de la desviación típica"
          @click="isDeviationHelpOpen = !isDeviationHelpOpen"
        >
          <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
        </button>
      </div>
      <p class="text-3xl font-bold leading-none tabular-nums text-rv-navy dark:text-white">{{ formatDecimal(summary.standardDeviation) }}</p>
      <template v-if="deviationInterpretation">
        <p class="text-sm font-semibold text-rv-navy dark:text-white">{{ deviationInterpretation.label }}</p>
        <p class="text-xs text-gray-600 dark:text-gray-300">{{ deviationInterpretation.description }}</p>
      </template>
      <p v-else class="text-xs text-gray-600 dark:text-gray-300">Sin datos para clasificar</p>
      <p
        v-show="isDeviationHelpOpen"
        id="deviation-help"
        class="max-w-[32ch] text-xs leading-relaxed text-gray-700 dark:text-gray-200"
      >
        Mide cuánto se alejan tus puntuaciones de tu nota media. Se calcula con las notas vigentes de los discos incluidos en las estadísticas del año. Cuanto menor es, más parecidas son tus notas.
        Los rangos son criterios orientativos de Riff Valley, no categorías universales.
      </p>
    </article>
  </section>
</template>
