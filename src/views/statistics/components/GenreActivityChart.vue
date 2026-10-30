<script setup lang="ts">
import { computed } from "vue";
import type { StatisticsGenreActivity } from "@/modules/statistics/types/statistics";
import { totalActivity } from "../utils/activityVisualizations";

const props = defineProps<{
  year: number;
  activity: readonly StatisticsGenreActivity[];
  activityWithoutGenre: number;
  annualActivityCount: number;
}>();

const emit = defineEmits<{
  openGalaxy: [];
}>();

const genres = computed(() => [...props.activity]
  .sort((a, b) => b.activityCount - a.activityCount || a.genre.localeCompare(b.genre, "es", { sensitivity: "base" }))
  .slice(0, 7)
  .map(({ genre: label, activityCount: count, topDisc }) => ({ label, count, topDisc })));
const maxCount = computed(() => Math.max(1, ...genres.value.map(({ count }) => count)));
const genreTotal = computed(() => totalActivity([...props.activity.map(({ activityCount }) => activityCount), props.activityWithoutGenre]));
const totalMismatch = computed(() => genreTotal.value !== props.annualActivityCount);
const scoreFormatter = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });

function percentage(count: number): string {
  return `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format((count / props.annualActivityCount) * 100)} %`;
}

function barWidth(count: number): string {
  return `${(count / maxCount.value) * 100}%`;
}
</script>

<template>
  <article
    aria-labelledby="genre-activity-title"
    class="rounded-2xl border border-gray-100 bg-white p-5 shadow-md dark:border-white/10 dark:bg-rv-navy sm:p-6"
  >
    <header class="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <div>
        <h2 id="genre-activity-title" class="text-lg font-semibold text-gray-800 dark:text-white">Géneros representativos</h2>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Actividad anual y disco mejor puntuado</p>
      </div>
      <span class="text-sm text-gray-500 dark:text-gray-400">{{ year }}</span>
    </header>

    <div v-if="activityWithoutGenre > 0" class="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 dark:bg-white/5">
      <span class="text-xs font-medium text-gray-600 dark:text-gray-300">Sin género</span>
      <span class="text-sm font-semibold tabular-nums text-rv-navy dark:text-white">{{ activityWithoutGenre.toLocaleString("es-ES") }} {{ activityWithoutGenre === 1 ? "voto" : "votos" }}</span>
    </div>

    <p v-if="genres.length === 0" role="status" class="rounded-lg bg-gray-50 px-3 py-4 text-sm text-gray-600 dark:bg-white/5 dark:text-gray-300">
      No hay actividad asociada a géneros en {{ year }}.
    </p>

    <ol v-else class="divide-y divide-gray-100 dark:divide-white/10" aria-label="Géneros con más votos">
      <li v-for="genre in genres" :key="genre.label" class="min-w-0">
        <article class="grid grid-cols-1 items-center gap-x-5 gap-y-2 py-3 sm:grid-cols-[minmax(8rem,0.85fr)_minmax(9rem,1fr)_minmax(13rem,1.35fr)]">
          <h3 class="truncate text-sm font-semibold text-gray-900 dark:text-white" :title="genre.label">{{ genre.label }}</h3>

          <div class="min-w-0">
            <div class="mb-1 flex items-baseline justify-between gap-3 text-xs tabular-nums">
              <span class="font-semibold text-gray-800 dark:text-white">{{ genre.count.toLocaleString("es-ES") }} {{ genre.count === 1 ? "voto" : "votos" }}</span>
              <span v-if="annualActivityCount > 0" class="shrink-0 text-gray-500 dark:text-gray-400">{{ percentage(genre.count) }}</span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10" role="img" :aria-label="`${genre.label}: ${genre.count} ${genre.count === 1 ? 'voto' : 'votos'}, ${annualActivityCount > 0 ? percentage(genre.count) + ' de la actividad anual' : 'porcentaje no disponible'}`">
              <span class="block h-full rounded-full bg-rv-pink transition-[width] duration-500 motion-reduce:transition-none" :style="{ width: barWidth(genre.count) }" aria-hidden="true" />
            </div>
          </div>

          <div class="flex min-w-0 items-center gap-3">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gray-100 text-rv-navy dark:bg-white/10 dark:text-gray-200">
              <img v-if="genre.topDisc?.image" :src="genre.topDisc.image" :alt="`Portada de ${genre.topDisc.name}`" class="h-full w-full object-cover" />
              <i v-else class="fa-solid fa-compact-disc text-xl opacity-60" aria-hidden="true" />
              <span v-if="genre.topDisc && !genre.topDisc.image" class="sr-only">Portada no disponible</span>
              <span v-if="!genre.topDisc" class="sr-only">Sin disco destacado</span>
            </div>

            <div class="min-w-0">
              <template v-if="genre.topDisc">
                <p class="truncate text-xs font-medium text-gray-800 dark:text-gray-100" :title="genre.topDisc.name">{{ genre.topDisc.name }}</p>
                <p class="mt-0.5 truncate text-[11px] text-gray-600 dark:text-gray-300" :title="genre.topDisc.artist?.name ?? 'Artista no disponible'">
                  {{ genre.topDisc.artist?.name ?? "Artista no disponible" }}
                  <span class="px-1 text-gray-400" aria-hidden="true">·</span>
                  <span class="font-semibold tabular-nums text-rv-navy dark:text-pink-200">{{ scoreFormatter.format(genre.topDisc.rate) }}/10</span>
                </p>
              </template>
              <p v-else class="text-xs text-gray-500 dark:text-gray-400">Sin disco destacado disponible</p>
            </div>
          </div>
        </article>
      </li>
    </ol>

    <p v-if="totalMismatch" role="status" class="mt-4 text-sm text-amber-800 dark:text-amber-200">
      El desglose de géneros y la actividad sin género suman {{ genreTotal.toLocaleString("es-ES") }} votos y el resumen anual indica
      {{ annualActivityCount.toLocaleString("es-ES") }}. Se muestran los datos recibidos sin ajustes.
    </p>

    <button
      type="button"
      aria-haspopup="dialog"
      class="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-rv-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rv-navy/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink dark:bg-white dark:text-rv-navy dark:hover:bg-gray-200"
      @click="emit('openGalaxy')"
    >
      <i class="fa-solid fa-star text-amber-400 dark:text-amber-500" aria-hidden="true" />
      Abrir galaxia de géneros
    </button>
  </article>
</template>
