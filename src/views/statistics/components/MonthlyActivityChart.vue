<script setup lang="ts">
import { computed } from "vue";
import type { StatisticsMonthlyActivity } from "@/modules/statistics/types/statistics";
import { buildMonthlyActivity, totalActivity } from "../utils/activityVisualizations";

const props = defineProps<{
  year: number;
  activity: readonly StatisticsMonthlyActivity[];
  annualActivityCount: number;
}>();

const months = computed(() => buildMonthlyActivity(props.year, props.activity));
const maxCount = computed(() => Math.max(1, ...months.value.map(({ count }) => count)));
const monthTotal = computed(() => totalActivity(months.value.map(({ count }) => count)));
const totalMismatch = computed(() => monthTotal.value !== props.annualActivityCount);
const scoreFormatter = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });

function barHeight(count: number): string {
  return count === 0 ? "0%" : `${Math.max(5, (count / maxCount.value) * 100)}%`;
}
</script>

<template>
  <article
    aria-labelledby="monthly-activity-title"
    class="rounded-2xl border border-gray-100 bg-white p-5 shadow-md dark:border-white/10 dark:bg-rv-navy sm:p-6"
  >
    <header class="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <div>
        <h2 id="monthly-activity-title" class="text-lg font-semibold text-gray-800 dark:text-white">Resumen del año</h2>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Actividad mensual y disco mejor puntuado</p>
      </div>
      <p class="text-sm tabular-nums text-gray-500 dark:text-gray-400">
        {{ year }} <span class="mx-1 text-rv-pink" aria-hidden="true">·</span> {{ monthTotal.toLocaleString("es-ES") }} votos
      </p>
    </header>

    <p v-if="monthTotal === 0" role="status" class="mb-5 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:bg-white/5 dark:text-gray-300">
      No hay votos en ningún mes de {{ year }}.
    </p>

    <ol class="grid grid-cols-3 gap-x-2 gap-y-6 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-12" :aria-label="`Actividad mensual de ${year}, de enero a diciembre`">
      <li v-for="month in months" :key="month.month" class="min-w-0">
        <article class="flex h-full min-w-0 flex-col items-center text-center">
          <div class="flex min-h-[132px] w-full min-w-0 flex-col items-center">
            <div class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 text-rv-navy ring-1 ring-black/5 dark:bg-white/10 dark:text-gray-200 dark:ring-white/10 sm:h-16 sm:w-16">
              <img
                v-if="month.count > 0 && month.topDisc?.image"
                :src="month.topDisc.image"
                :alt="`Portada de ${month.topDisc.name}`"
                class="h-full w-full object-cover"
              />
              <i v-else-if="month.count > 0 && month.topDisc" class="fa-solid fa-compact-disc text-2xl sm:text-3xl" aria-hidden="true" />
              <i v-else class="fa-solid fa-music text-xl opacity-40" aria-hidden="true" />
              <span v-if="month.count > 0 && month.topDisc && !month.topDisc.image" class="sr-only">Portada no disponible</span>
              <span v-if="month.count > 0 && !month.topDisc" class="sr-only">Sin disco destacado</span>
            </div>

            <template v-if="month.count > 0 && month.topDisc">
              <h3 class="mt-2 w-full truncate whitespace-nowrap text-[11px] font-semibold leading-tight text-gray-900 dark:text-white sm:text-xs" :title="month.topDisc.name">
                {{ month.topDisc.name }}
              </h3>
              <p class="mt-1 w-full truncate text-[10px] leading-tight text-gray-600 dark:text-gray-300 sm:text-[11px]" :title="month.topDisc.artist?.name ?? 'Artista no disponible'">
                {{ month.topDisc.artist?.name ?? "Artista no disponible" }}
              </p>
              <p class="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold tabular-nums text-gray-700 dark:text-gray-200 sm:text-[11px]">
                <i class="fa-solid fa-star text-[9px] text-amber-500" aria-hidden="true" />
                {{ scoreFormatter.format(month.topDisc.rate) }}/10
              </p>
            </template>
            <p v-else-if="month.count > 0" class="mt-2 max-w-24 text-[10px] leading-snug text-gray-600 dark:text-gray-300">
              Sin disco destacado disponible
            </p>
            <p v-else class="mt-2 text-[10px] text-gray-500 dark:text-gray-400">Sin actividad</p>
          </div>

          <div class="mt-3 flex h-[112px] w-full flex-col items-center justify-end">
            <span class="mb-2 text-xs font-bold tabular-nums text-gray-800 dark:text-white" :aria-label="`${month.count} ${month.count === 1 ? 'voto' : 'votos'}`">
              {{ month.count }}
            </span>
            <div class="relative flex h-20 w-full items-end justify-center overflow-hidden border-b border-gray-200 bg-gray-50 dark:border-white/15 dark:bg-white/[0.02]" role="img" :aria-label="`${month.name}: ${month.count} ${month.count === 1 ? 'voto' : 'votos'}`">
              <div class="pointer-events-none absolute inset-0 flex flex-col justify-between" aria-hidden="true">
                <span class="border-t border-gray-300/50 dark:border-white/10" />
                <span class="border-t border-gray-300/50 dark:border-white/10" />
                <span class="border-t border-gray-300/50 dark:border-white/10" />
              </div>
              <span
                class="relative z-10 w-1/2 min-w-3 rounded-t-md bg-rv-pink shadow-[0_0_12px_rgb(226_81_125_/_0.2)] transition-[height] duration-500 motion-reduce:transition-none"
                :style="{ height: barHeight(month.count) }"
                aria-hidden="true"
              />
            </div>
            <span class="mt-2 text-[11px] font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">{{ month.label }}</span>
          </div>
        </article>
      </li>
    </ol>

    <p v-if="totalMismatch" role="status" class="mt-5 text-sm text-amber-800 dark:text-amber-200">
      Los meses suman {{ monthTotal.toLocaleString("es-ES") }} votos y el resumen anual indica
      {{ annualActivityCount.toLocaleString("es-ES") }}. Se muestran los datos recibidos sin ajustes.
    </p>
  </article>
</template>
