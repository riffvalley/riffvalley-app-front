<script setup lang="ts">
import { computed } from "vue";
import type { StatisticsScoreBucket } from "@/modules/statistics/types/statistics";

const props = defineProps<{
  scoreDistribution: StatisticsScoreBucket[];
  scoredDiscs: number;
  year: number;
}>();

const numberFormatter = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });
const barColors = [
  "bg-red-700", "bg-red-600", "bg-orange-600", "bg-orange-500", "bg-amber-500", "bg-yellow-500",
  "bg-lime-600", "bg-lime-700", "bg-green-700", "bg-green-800", "bg-green-900",
] as const;
const buckets = computed(() => [...props.scoreDistribution].sort((a, b) => a.score - b.score));
const bucketTotal = computed(() => buckets.value.reduce((total, bucket) => total + bucket.scoredDiscCount, 0));
const largestBucket = computed(() => Math.max(0, ...buckets.value.map(bucket => bucket.scoredDiscCount)));
const distributionMatchesSummary = computed(() => bucketTotal.value === props.scoredDiscs);
const hasAllBuckets = computed(() => buckets.value.length === 11
  && buckets.value.every((bucket, index) => bucket.score === index));

function bucketLabel(score: number): string {
  return score === 10 ? "10 exacto" : `${score} hasta menos de ${score + 1}`;
}

function barHeight(count: number): string {
  return count === 0 ? "0%" : `${Math.max(5, (count / largestBucket.value) * 100)}%`;
}

function barColor(score: number): string {
  return barColors[score] ?? barColors[barColors.length - 1];
}
</script>

<template>
  <article class="rounded-2xl border border-gray-100 bg-white p-6 shadow-md dark:border-white/10 dark:bg-rv-navy">
    <h2 class="text-lg font-semibold text-gray-800 dark:text-white">Discos puntuados {{ year }}</h2>

    <p v-if="scoredDiscs === 0" role="status" class="mt-5 rounded-xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-rv-darkSurface dark:text-gray-300">
      No hay discos con una puntuación vigente para mostrar en esta distribución.
    </p>
    <p v-if="scoredDiscs > 0 && buckets.length === 0" role="status" class="mt-5 rounded-xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-rv-darkSurface dark:text-gray-300">
      Hay {{ numberFormatter.format(scoredDiscs) }} discos con puntuación vigente, pero no hay buckets de distribución disponibles.
    </p>
    <template v-if="buckets.length > 0">
      <ul aria-label="Discos puntuados por intervalo de nota" class="mt-5 grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-6 xl:grid-cols-11">
        <li v-for="bucket in buckets" :key="bucket.score" class="min-w-0">
          <article class="flex min-w-0 flex-col items-center text-center">
            <div
              class="score-chart relative flex h-24 w-full min-w-0 items-end justify-center overflow-visible rounded-t-lg border-b border-gray-200 bg-gray-50 outline-none dark:border-white/15 dark:bg-white/[0.02]"
              role="img"
              tabindex="0"
              :aria-label="`${bucketLabel(bucket.score)}: ${numberFormatter.format(bucket.scoredDiscCount)} ${bucket.scoredDiscCount === 1 ? 'disco' : 'discos'}`"
            >
              <span class="score-tooltip rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-800 shadow-lg dark:border-white/10 dark:bg-rv-darkSurface dark:text-white">
                {{ bucketLabel(bucket.score) }} · {{ numberFormatter.format(bucket.scoredDiscCount) }} {{ bucket.scoredDiscCount === 1 ? "disco" : "discos" }}
              </span>
              <div class="pointer-events-none absolute inset-0 flex flex-col justify-between" aria-hidden="true">
                <span class="border-t border-gray-300/50 dark:border-white/10" />
                <span class="border-t border-gray-300/50 dark:border-white/10" />
                <span class="border-t border-gray-300/50 dark:border-white/10" />
              </div>
              <span
                class="relative z-10 w-7 max-w-[55%] rounded-t-md transition-[height] duration-500 motion-reduce:transition-none"
                :class="barColor(bucket.score)"
                :style="{ height: barHeight(bucket.scoredDiscCount) }"
                aria-hidden="true"
              />
            </div>
            <span class="mt-2 text-xs font-semibold tabular-nums text-gray-700 dark:text-gray-200">{{ bucket.score }}</span>
            <span class="sr-only">{{ bucketLabel(bucket.score) }} · {{ numberFormatter.format(bucket.scoredDiscCount) }} {{ bucket.scoredDiscCount === 1 ? "disco" : "discos" }}</span>
          </article>
        </li>
      </ul>
      <p class="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Total en los buckets: {{ numberFormatter.format(bucketTotal) }} · Discos puntuados: {{ numberFormatter.format(scoredDiscs) }}
      </p>
      <p v-if="!distributionMatchesSummary" role="status" class="mt-2 text-sm text-amber-800 dark:text-amber-300">
        La suma de los buckets no coincide con el total de discos puntuados; se muestran los valores recibidos sin modificarlos.
      </p>
      <p v-if="!hasAllBuckets" role="status" class="mt-2 text-sm text-amber-800 dark:text-amber-300">
        El backend no ha enviado los once buckets esperados; solo se muestran los intervalos recibidos.
      </p>
    </template>
  </article>
</template>

<style scoped>
.score-tooltip {
  position: absolute;
  bottom: calc(100% + 0.5rem);
  left: 50%;
  z-index: 30;
  max-width: calc(100vw - 3rem);
  transform: translateX(-50%);
  opacity: 0;
  pointer-events: none;
  transition: opacity 150ms ease;
  white-space: nowrap;
}

.score-chart:hover .score-tooltip,
.score-chart:focus-visible .score-tooltip {
  opacity: 1;
}

.score-chart:focus-visible {
  outline: 2px solid #ec4899;
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  .score-tooltip {
    transition: none;
  }
}
</style>
