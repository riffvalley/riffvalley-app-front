<script setup lang="ts">
interface Props {
  processed: number;
  total: number;
  percent: number;
  batch: number;
  imagesAdded: number;
  notFound: number;
  ambiguous: number;
  errors: number;
  concurrentUpdates: number;
  running: boolean;
  stopped: boolean;
  failed: boolean;
  complete: boolean;
}

defineProps<Props>();
const emit = defineEmits<{ stop: [] }>();
</script>

<template>
  <section
    class="mb-5 rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm dark:border-white/10 dark:bg-rv-darkCard"
    aria-label="Progreso del relleno de imágenes"
    aria-live="polite"
  >
    <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
      <strong class="text-rv-navy dark:text-white">
        {{ complete ? "Recorrido completado" : stopped && running ? "Deteniendo proceso" : stopped ? "Proceso detenido" : failed ? "Proceso interrumpido por error" : "Rellenando imágenes" }}
      </strong>
      <span class="text-gray-600 dark:text-gray-300">
        {{ processed }} / {{ total }} artistas · {{ percent }} % · lote {{ batch }}
      </span>
    </div>

    <div
      class="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
      role="progressbar"
      :aria-valuenow="percent"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="`${percent}% de artistas examinados`"
    >
      <div class="h-full rounded-full bg-green-600 transition-[width] duration-300" :style="{ width: `${percent}%` }"></div>
    </div>

    <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
      <span>Imágenes añadidas: {{ imagesAdded }}</span>
      <span>Sin coincidencia: {{ notFound }}</span>
      <span>Ambiguos: {{ ambiguous }}</span>
      <span>Errores: {{ errors }}</span>
      <span>Actualizaciones concurrentes: {{ concurrentUpdates }}</span>
    </div>

    <div v-if="running" class="mt-3 flex flex-wrap items-center justify-between gap-2">
      <p class="m-0 text-xs text-gray-500 dark:text-gray-400">
        Detener impide pedir más lotes; el lote ya iniciado puede terminar en el servidor.
      </p>
      <button
        type="button"
        :disabled="stopped"
        class="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:border-gray-600 dark:text-gray-200 dark:hover:bg-white/5"
        @click="emit('stop')"
      >
        {{ stopped ? "Deteniendo…" : "Detener" }}
      </button>
    </div>
    <p v-else-if="stopped" class="mb-0 mt-3 text-xs text-amber-700 dark:text-amber-300">
      Recorrido interrumpido. Un lote que ya se había enviado puede haber terminado en el servidor.
    </p>
    <p v-else-if="complete" class="mb-0 mt-3 font-medium text-rv-navy dark:text-white">
      Resumen final: {{ processed }} artistas examinados; {{ imagesAdded }} fotografías añadidas,
      {{ notFound }} sin coincidencia, {{ ambiguous }} ambiguos, {{ errors }} errores y
      {{ concurrentUpdates }} actualizaciones concurrentes.
    </p>
  </section>
</template>
