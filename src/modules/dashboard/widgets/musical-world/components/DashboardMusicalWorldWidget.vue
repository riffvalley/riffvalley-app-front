<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref, shallowRef, watch } from "vue";
import { useAuthStore } from "@/modules/identity/auth";
import {
  getRatesGeographyTop,
  type RatesGeographyCountryDto,
} from "@services/rates/rates";

const DashboardMusicalWorldModal = defineAsyncComponent(() => import("./DashboardMusicalWorldModal.vue"));
const isMapModalOpen = ref(false);
const MAX_COUNTRIES = 5;
const EMPTY_MESSAGE = "Todavía no tienes discos valorados con un país disponible";

const emit = defineEmits<{ exploreMap: [] }>();

const authStore = useAuthStore();
const countries = shallowRef<RatesGeographyCountryDto[]>([]);
const isLoading = shallowRef(true);
const hasError = shallowRef(false);
const retryVersion = shallowRef(0);
const isMounted = shallowRef(false);
const maxDiscCount = computed(() =>
  countries.value.reduce((maximum, country) => Math.max(maximum, country.count), 0),
);
const visibleCountries = computed(() => countries.value.slice(0, MAX_COUNTRIES));

watch(
  () => [
    isMounted.value,
    authStore.authStatus,
    authStore.userId,
    authStore.authSessionGeneration,
    retryVersion.value,
  ] as const,
  ([mounted, authStatus, userId], _previous, onCleanup) => {
    const controller = new AbortController();
    let isCurrentRequest = true;
    onCleanup(() => {
      isCurrentRequest = false;
      controller.abort();
    });

    countries.value = [];
    hasError.value = false;

    if (!mounted) return;
    if (authStatus === "initializing") {
      isLoading.value = true;
      return;
    }
    if (authStatus !== "authenticated" || !userId) {
      isLoading.value = false;
      return;
    }

    isLoading.value = true;
    void getRatesGeographyTop(controller.signal)
      .then((response) => {
        if (!isCurrentRequest || controller.signal.aborted) return;
        countries.value = response.countries.slice(0, MAX_COUNTRIES);
      })
      .catch(() => {
        if (isCurrentRequest && !controller.signal.aborted) hasError.value = true;
      })
      .finally(() => {
        if (isCurrentRequest && !controller.signal.aborted) isLoading.value = false;
      });
  },
  { immediate: true },
);

onMounted(() => {
  isMounted.value = true;
});

onUnmounted(() => {
  isMounted.value = false;
});

function barWidth(count: number): string {
  if (maxDiscCount.value <= 0) return "0%";
  return `${(count / maxDiscCount.value) * 100}%`;
}

function formatDiscCount(count: number): string {
  const formattedCount = new Intl.NumberFormat("es-ES").format(count);
  return `${formattedCount} ${count === 1 ? "disco" : "discos"}`;
}

function retry() {
  if (hasError.value && !isLoading.value) retryVersion.value += 1;
}

function openMap() {
  emit("exploreMap");
  isMapModalOpen.value = true;
}
</script>

<template>
  <section
    class="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-rv-darkSurface"
    aria-labelledby="musical-world-title"
  >
    <header class="border-b border-gray-100 bg-gradient-to-r from-rv-blue/8 to-rv-purple/8 px-5 py-4 dark:border-white/10 dark:from-rv-blue/10 dark:to-rv-purple/10">
      <div class="min-w-0 text-left">
        <h3 id="musical-world-title" class="flex min-w-0 items-center gap-2 font-bold text-gray-900 dark:text-white">
          <i class="fa-solid fa-earth-americas shrink-0 text-rv-blue" aria-hidden="true"></i>
          <span class="truncate">Tu mundo musical</span>
        </h3>
        <p class="pl-6 text-xs text-gray-500 dark:text-gray-400">Los países de tus discos valorados</p>
      </div>
    </header>

    <div
      v-if="isLoading"
      class="flex flex-col gap-3 p-5"
      role="status"
      aria-label="Cargando tus países"
      aria-busy="true"
      data-test="musical-world-loading"
    >
      <div
        v-for="position in MAX_COUNTRIES"
        :key="position"
        class="grid min-w-0 grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1"
      >
        <span class="h-3 w-4 shrink-0 animate-pulse rounded bg-gray-200 dark:bg-white/10"></span>
        <span class="h-3 min-w-0 animate-pulse rounded bg-gray-200 dark:bg-white/10"></span>
        <span class="col-start-2 flex min-w-0 items-center gap-2">
          <span class="h-1.5 min-w-0 flex-1 animate-pulse rounded bg-gray-200 dark:bg-white/10"></span>
          <span class="h-3 w-14 shrink-0 animate-pulse rounded bg-gray-200 dark:bg-white/10"></span>
        </span>
      </div>
    </div>

    <div v-else-if="hasError" class="flex flex-col items-center gap-3 p-6 text-center" role="alert">
      <p class="text-sm text-gray-600 dark:text-gray-300">No se pudieron cargar tus países valorados.</p>
      <button
        type="button"
        class="rounded-lg border-2 border-rv-navy bg-rv-navy px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-transparent hover:text-gray-600 hover:border-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink dark:hover:text-gray-300 dark:hover:border-white/20"
        @click="retry"
      >
        Reintentar
      </button>
    </div>

    <template v-else-if="visibleCountries.length">
      <ol class="flex min-w-0 flex-col gap-2 px-5 py-4" aria-label="Top 5 de países">
        <li
          v-for="(country, index) in visibleCountries"
          :key="country.isoCode"
          class="grid min-w-0 grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1"
          :data-country-code="country.isoCode"
        >
          <span class="w-5 shrink-0 text-right text-xs tabular-nums text-gray-500 dark:text-gray-400">{{ index + 1 }}</span>
          <span class="country-label flex min-w-0 items-center gap-2">
            <CircleFlags
              :country="country.isoCode.toLowerCase()"
              :show-flag-name="false"
              class="h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <span class="min-w-0 truncate text-sm text-gray-800 dark:text-gray-100" :title="country.name">
              {{ country.name }}
            </span>
          </span>
          <span class="country-statistics col-start-2 flex min-w-0 items-center gap-2">
            <span class="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10" aria-hidden="true">
              <span
                class="block h-full rounded-full bg-rv-blue transition-[width] duration-300"
                :style="{ width: barWidth(country.count) }"
                :data-bar-width="barWidth(country.count)"
              ></span>
            </span>
            <span class="shrink-0 whitespace-nowrap text-right text-xs tabular-nums text-gray-600 dark:text-gray-300" data-test="disc-count">
              {{ formatDiscCount(country.count) }}
            </span>
          </span>
        </li>
      </ol>
    </template>

    <p v-else class="px-5 py-7 text-center text-sm text-gray-600 dark:text-gray-300" data-test="musical-world-empty">
      {{ EMPTY_MESSAGE }}.
    </p>

    <footer class="mt-auto border-t border-gray-100 px-5 py-3 dark:border-white/10">
      <button
        type="button"
        class="w-full rounded-lg border-2 border-rv-navy bg-rv-navy px-3 py-2 text-sm font-semibold text-white transition hover:bg-transparent hover:text-gray-600 hover:border-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink dark:hover:text-gray-300 dark:hover:border-white/20"
        data-test="world-map-open"
        @click="openMap"
      >
        Explorar mapa mundial
      </button>
    </footer>
    <DashboardMusicalWorldModal v-if="isMapModalOpen" @close="isMapModalOpen = false" />
  </section>
</template>
