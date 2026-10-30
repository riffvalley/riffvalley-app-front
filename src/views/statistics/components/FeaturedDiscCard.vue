<script setup lang="ts">
import type { StatisticsDisc } from "@/modules/statistics/types/statistics";

defineProps<{ disc: StatisticsDisc | null }>();

const scoreFormatter = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });
</script>

<template>
  <article class="flex h-full min-w-0 flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-rv-navy sm:p-6">
    <h2 class="flex items-center gap-2 text-base font-semibold text-rv-navy dark:text-white sm:text-lg">
      <i class="fa-solid fa-star text-amber-500" aria-hidden="true"></i>
      Disco destacado del año
    </h2>

    <div v-if="!disc" role="status" class="mt-4 flex flex-1 flex-col items-center justify-center rounded-xl bg-gray-50 px-5 py-8 text-center dark:bg-rv-darkSurface">
      <span class="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-300/15 dark:text-amber-200" aria-hidden="true">
        <i class="fa-solid fa-compact-disc text-2xl"></i>
      </span>
      <p class="max-w-xs text-sm text-gray-700 dark:text-gray-200">No hay un disco destacado para este año.</p>
    </div>

    <div v-else class="mt-4 flex flex-1 flex-col items-center text-center">
      <div class="flex aspect-square w-full max-w-56 items-center justify-center overflow-hidden rounded-xl bg-gray-100 p-3 dark:bg-rv-darkSurface">
        <img
          v-if="disc.image"
          :src="disc.image"
          :alt="`Portada de ${disc.name}`"
          class="h-full w-full object-contain"
        />
        <span v-else class="flex h-full w-full items-center justify-center rounded-lg bg-rv-pink/10 text-rv-navy dark:bg-white/5 dark:text-pink-200" aria-hidden="true">
          <i class="fa-solid fa-compact-disc text-6xl"></i>
        </span>
      </div>

      <div class="mt-4 w-full min-w-0">
        <h3 class="break-words text-lg font-bold leading-snug text-gray-900 dark:text-white">{{ disc.name }}</h3>
        <p class="mt-1 break-words text-sm text-gray-700 dark:text-gray-300">{{ disc.artist?.name ?? "Artista no disponible" }}</p>
      </div>

      <p class="mt-4 rounded-full bg-rv-pink/10 px-4 py-2 text-sm font-semibold text-rv-navy dark:bg-rv-pink/20 dark:text-pink-100">
        Tu nota:
        <span class="ml-1 text-base tabular-nums">{{ scoreFormatter.format(disc.rate) }}/10</span>
      </p>
    </div>
  </article>
</template>
