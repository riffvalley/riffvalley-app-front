<script setup lang="ts">
import { inject } from "vue";
import type { StatisticsDisc } from "@/modules/statistics/types/statistics";
import { discCardDialogKey } from "@/composables/discCardDialog";

const props = defineProps<{ disc: StatisticsDisc | null }>();

const scoreFormatter = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });

// «Ver disco»: la misma ficha votable que en Actividad, Calendario y Mis comentarios.
const discCardDialog = inject(discCardDialogKey, null);
function openDisc(): void {
  if (props.disc) discCardDialog?.open(props.disc.id);
}
</script>

<template>
  <article class="flex h-full min-w-0 flex-col rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm dark:border-white/10 dark:bg-rv-darkCard sm:p-6">
    <h2 class="flex items-center gap-2 text-base font-semibold text-rv-navy dark:text-white sm:text-lg">
      <i class="fa-solid fa-star text-amber-500" aria-hidden="true"></i>
      Tu disco destacado del año
    </h2>

    <div v-if="!disc" role="status" class="mt-4 flex flex-1 flex-col items-center justify-center rounded-xl bg-gray-50 px-5 py-8 text-center dark:bg-rv-darkSurface">
      <span class="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-300/15 dark:text-amber-200" aria-hidden="true">
        <i class="fa-solid fa-compact-disc text-2xl"></i>
      </span>
      <p class="max-w-xs text-sm text-gray-700 dark:text-gray-200">No hay un disco destacado para este año.</p>
    </div>

    <div v-else class="mt-4 flex flex-1 flex-col items-center justify-center text-center">
      <!-- Portada a sangre, con un halo dorado suave detrás (a juego con la estrella) -->
      <div class="relative w-full max-w-56">
        <div class="absolute inset-3 rounded-2xl bg-amber-400/30 blur-2xl dark:bg-amber-300/20" aria-hidden="true"></div>
        <div class="relative aspect-square overflow-hidden rounded-xl bg-gray-100 shadow-lg ring-1 ring-black/5 dark:bg-rv-darkSurface dark:ring-white/10">
          <img
            v-if="disc.image"
            :src="disc.image"
            :alt="`Portada de ${disc.name}`"
            class="h-full w-full object-cover"
          />
          <span v-else class="flex h-full w-full items-center justify-center bg-rv-pink/10 text-rv-navy dark:bg-white/5 dark:text-pink-200" aria-hidden="true">
            <i class="fa-solid fa-compact-disc text-6xl"></i>
          </span>
        </div>
      </div>

      <div class="mt-4 w-full min-w-0">
        <h3 class="break-words text-lg font-bold leading-snug text-gray-900 dark:text-white">{{ disc.name }}</h3>
        <p class="mt-1 break-words text-sm text-gray-700 dark:text-gray-300">{{ disc.artist?.name ?? "Artista no disponible" }}</p>
        <span
          v-if="disc.genre?.name"
          class="mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
          :style="{ backgroundColor: disc.genre.color || '#1f2937' }"
        >
          {{ disc.genre.name }}
        </span>
      </div>

      <!-- Nota y «Ver disco» en la misma fila; si no caben, el botón baja debajo -->
      <div class="mt-4 flex flex-wrap items-center justify-center gap-2">
        <p class="rounded-full bg-rv-pink/10 px-4 py-2 text-sm font-semibold text-rv-navy dark:bg-rv-pink/20 dark:text-pink-100">
          Tu nota:
          <span class="ml-1 text-base tabular-nums">{{ scoreFormatter.format(disc.rate) }}/10</span>
        </p>
        <button
          v-if="discCardDialog"
          type="button"
          class="inline-flex shrink-0 items-center rounded-full bg-rv-navy px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-rv-navy/85 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple dark:bg-gray-200 dark:text-rv-navy dark:hover:bg-gray-300 dark:focus-visible:outline-rv-pink"
          :aria-label="`Abrir tarjeta de ${disc.name}`"
          aria-haspopup="dialog"
          data-test="featured-disc-open"
          @click="openDisc"
        >
          Ver disco
        </button>
      </div>
    </div>
  </article>
</template>
