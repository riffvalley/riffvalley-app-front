<script setup lang="ts">
import { inject } from "vue";
import type { StatisticsControversialDisc } from "@/modules/statistics/types/statistics";
import { discCardDialogKey } from "@/composables/discCardDialog";

defineProps<{ discs: StatisticsControversialDisc[] }>();

const scoreFormatter = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Al pulsar la portada se abre la misma ficha votable que en el resto de la app.
const discCardDialog = inject(discCardDialogKey, null);
function openDisc(discId: string): void {
  discCardDialog?.open(discId);
}

function formatDifference(value: number): string {
  const sign = value < 0 ? "−" : "+";
  return `${sign}${scoreFormatter.format(Math.abs(value))}`;
}
</script>

<template>
  <article class="rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm dark:border-white/10 dark:bg-rv-darkCard sm:p-6">
    <h2 class="text-lg font-semibold text-rv-navy dark:text-white">Discos controvertidos</h2>
    <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">La diferencia compara tu puntuación con la media comunitaria.</p>

    <p v-if="discs.length === 0" role="status" class="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-rv-darkSurface dark:text-gray-300">
      Aún no hay discos con suficientes valoraciones ajenas para calcular discrepancias.
    </p>
    <ul v-else aria-label="Discos con mayor discrepancia respecto a la media comunitaria" class="mt-4 w-full space-y-3">
      <li v-for="disc in discs" :key="disc.id" class="flex min-w-0 flex-col items-start justify-between gap-3 rounded-xl bg-gray-50 p-3 text-left dark:bg-rv-darkSurface sm:flex-row sm:items-center sm:gap-4 sm:p-4">
        <div class="flex w-full min-w-0 items-center gap-3 sm:flex-1">
          <component
            :is="discCardDialog ? 'button' : 'div'"
            v-bind="discCardDialog ? { type: 'button', 'aria-label': `Abrir tarjeta de ${disc.name}`, 'aria-haspopup': 'dialog', 'data-test': 'controversial-disc-open' } : {}"
            class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-200 text-rv-navy dark:bg-white/10 dark:text-gray-200"
            :class="discCardDialog ? 'p-0 border-0 cursor-pointer transition hover:ring-2 hover:ring-rv-pink focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink' : ''"
            @click="openDisc(disc.id)"
          >
            <img v-if="disc.image" :src="disc.image" :alt="`Portada de ${disc.name}`" class="h-full w-full object-cover" />
            <i v-else class="fa-solid fa-compact-disc text-2xl opacity-60" aria-hidden="true" />
            <span v-if="!disc.image" class="sr-only">Portada no disponible</span>
          </component>
          <div class="min-w-0 flex-1">
            <h3 class="break-words font-semibold text-gray-900 dark:text-white">{{ disc.name }}</h3>
            <p class="truncate text-sm text-gray-600 dark:text-gray-300">{{ disc.artist?.name ?? "Artista no disponible" }}</p>
          </div>
        </div>
        <dl class="grid w-full shrink-0 grid-cols-[repeat(3,minmax(0,1fr))] gap-3 text-left text-xs sm:w-60 sm:gap-4">
          <div class="min-w-0">
            <dt class="min-h-4 leading-4 text-gray-500 dark:text-gray-400">Tu nota</dt>
            <dd class="mt-1 min-h-5 leading-5 font-semibold tabular-nums text-rv-navy dark:text-pink-200">{{ scoreFormatter.format(disc.userRate) }}</dd>
          </div>
          <div class="min-w-0">
            <dt class="min-h-4 leading-4 text-gray-500 dark:text-gray-400">Media</dt>
            <dd class="mt-1 min-h-5 leading-5 font-semibold tabular-nums text-amber-700 dark:text-amber-300">{{ scoreFormatter.format(disc.communityAverage) }}</dd>
          </div>
          <div class="min-w-0">
            <dt class="min-h-4 leading-4 text-gray-500 dark:text-gray-400">Diferencia</dt>
            <dd
              class="mt-1 min-h-5 leading-5 font-bold tabular-nums"
              :class="disc.diff > 0 ? 'text-green-700 dark:text-green-300' : disc.diff < 0 ? 'text-red-700 dark:text-red-300' : 'text-gray-700 dark:text-gray-200'"
              :aria-label="disc.diff > 0 ? `Tu nota está ${scoreFormatter.format(disc.diff)} puntos por encima de la media comunitaria` : disc.diff < 0 ? `Tu nota está ${scoreFormatter.format(Math.abs(disc.diff))} puntos por debajo de la media comunitaria` : 'Tu nota coincide con la media comunitaria'"
            >
              {{ formatDifference(disc.diff) }}
            </dd>
          </div>
        </dl>
      </li>
    </ul>
  </article>
</template>
