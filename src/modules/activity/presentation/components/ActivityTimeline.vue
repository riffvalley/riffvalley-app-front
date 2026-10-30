<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useActivityHistory } from "../../application/useActivityHistory";
import { groupActivityEventsByLocalDay } from "../../application/groupActivityEvents";
import ActivityDayGroup from "./ActivityDayGroup.vue";

const props = defineProps<{
  from?: string;
  to?: string;
  timeZone: string | null;
  isDateFiltered: boolean;
  isDateRange: boolean;
}>();
const emit = defineEmits<{ clearFilter: [] }>();
const history = useActivityHistory(
  () => ({
    ...(props.from === undefined ? {} : { from: props.from }),
    ...(props.to === undefined ? {} : { to: props.to }),
    ...(props.timeZone === null ? {} : { timeZone: props.timeZone }),
  }),
  () => props.timeZone !== null,
);
const sentinel = ref<HTMLElement | null>(null);
const canObserve = computed(() =>
  history.hasMore.value && !history.isFetchingNextPage.value && !history.isFetchNextPageError.value,
);
const groups = computed(() => props.timeZone
  ? groupActivityEventsByLocalDay(history.events.value, props.timeZone)
  : []);
const hasEvents = computed(() => groups.value.some((group) => group.events.length > 0));
let observer: IntersectionObserver | null = null;
let disposed = false;

function disconnectObserver(): void {
  observer?.disconnect();
  observer = null;
}

function observeSentinel(): void {
  disconnectObserver();
  if (disposed || !canObserve.value || !sentinel.value || typeof IntersectionObserver === "undefined") return;

  observer = new IntersectionObserver((entries) => {
    if (disposed || !canObserve.value || !entries.some((entry) => entry.isIntersecting)) return;
    void history.loadMore();
  }, { rootMargin: "320px 0px", threshold: 0 });
  observer.observe(sentinel.value);
}

onMounted(observeSentinel);
watch([sentinel, canObserve], observeSentinel, { flush: "post" });
onBeforeUnmount(() => {
  disposed = true;
  disconnectObserver();
});
</script>

<template>
  <section aria-label="Cronología de valoraciones" class="mx-auto mt-8 w-full max-w-3xl">
    <p v-if="timeZone === null" role="status" class="text-sm text-amber-800 dark:text-amber-200">
      El historial está pausado hasta que el navegador proporcione una zona horaria IANA válida.
    </p>
    <div v-else-if="history.isLoading.value" role="status" aria-live="polite" aria-busy="true" class="mx-auto w-full max-w-2xl space-y-6">
      <span class="sr-only">Cargando tu historial de actividad…</span>
      <div v-for="placeholder in 3" :key="placeholder" class="flex gap-4 border-b border-gray-200 py-4 dark:border-white/10">
        <div class="h-16 w-16 shrink-0 animate-pulse rounded-lg bg-gray-200 motion-reduce:animate-none dark:bg-rv-darkSurface sm:h-20 sm:w-20"></div>
        <div class="flex-1 space-y-3 py-1">
          <div class="h-4 w-2/5 animate-pulse rounded bg-gray-200 motion-reduce:animate-none dark:bg-rv-darkSurface"></div>
          <div class="h-3 w-1/4 animate-pulse rounded bg-gray-200 motion-reduce:animate-none dark:bg-rv-darkSurface"></div>
          <div class="h-3 w-3/5 animate-pulse rounded bg-gray-200 motion-reduce:animate-none dark:bg-rv-darkSurface"></div>
        </div>
      </div>
    </div>

    <div v-else-if="!hasEvents && history.isError.value" role="alert" class="text-sm text-red-700 dark:text-red-300">
      <p>No se pudo cargar el historial de actividad. Comprueba la conexión e inténtalo de nuevo.</p>
      <button
        type="button"
        class="mt-3 rounded-lg border border-gray-300 px-3 py-2 font-semibold text-gray-800 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-blueDark dark:border-white/20 dark:text-white dark:hover:bg-white/10 dark:focus-visible:outline-rv-pink"
        @click="history.retry()"
      >
        Reintentar
      </button>
    </div>

    <div v-else-if="!hasEvents" role="status" class="text-sm text-gray-600 dark:text-gray-300">
      <p>{{ isDateFiltered ? (isDateRange ? "No hay actividad registrada para este intervalo." : "No hay actividad registrada para esta fecha.") : "Todavía no hay eventos en tu historial de actividad." }}</p>
      <button
        v-if="isDateFiltered"
        type="button"
        class="mt-3 rounded-lg border border-gray-300 px-3 py-2 font-semibold text-gray-800 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-blueDark dark:border-white/20 dark:text-white dark:hover:bg-white/10 dark:focus-visible:outline-rv-pink"
        @click="emit('clearFilter')"
      >
        Limpiar fecha
      </button>
    </div>

    <template v-else>
      <ActivityDayGroup
        v-for="group in groups"
        :key="group.dateKey"
        :group="group"
        :daily-set-count="history.dailySetCounts.value[group.dateKey]"
      />

      <div class="mt-4 flex flex-col items-center gap-3 py-3">
        <p v-if="history.isFetchNextPageError.value" role="alert" class="text-sm text-red-700 dark:text-red-300">
          No se pudieron cargar los eventos anteriores. Puedes intentarlo de nuevo.
        </p>
        <p v-else-if="history.isFetchingNextPage.value" role="status" aria-live="polite" class="text-sm text-gray-600 dark:text-gray-300">
          Cargando eventos anteriores…
        </p>
        <p v-else-if="!history.hasMore.value" role="status" class="text-sm text-gray-600 dark:text-gray-300">
          Has llegado al final del historial.
        </p>

        <button
          v-if="history.hasMore.value"
          type="button"
          class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-blueDark disabled:cursor-wait disabled:opacity-70 dark:border-white/20 dark:text-white dark:hover:bg-white/10 dark:focus-visible:outline-rv-pink"
          :disabled="history.isFetchingNextPage.value"
          @click="history.loadMore()"
        >
          <span v-if="history.isFetchNextPageError.value">Reintentar carga</span>
          <span v-else-if="history.isFetchingNextPage.value">Cargando…</span>
          <span v-else>Cargar más eventos</span>
        </button>
        <div ref="sentinel" class="h-px w-full" aria-hidden="true"></div>
      </div>
    </template>
  </section>
</template>
