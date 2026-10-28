<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, watch } from "vue";
import { useAuthStore } from "@/modules/identity/auth";
import {
  getRatesTopArtists,
  type ArtistRankingPeriod,
  type RatesTopArtistDto,
} from "@services/rates/rates";
import DashboardFavoriteArtistModal from "./DashboardFavoriteArtistModal.vue";

const authStore = useAuthStore();
const hasSession = computed(() => authStore.authStatus === "authenticated" && Boolean(authStore.userId));
const rankingPeriods: Array<{ value: ArtistRankingPeriod; label: string }> = [
  { value: "month", label: "Mes" },
  { value: "year", label: "Año" },
  { value: "all", label: "Siempre" },
];
const selectedPeriod = shallowRef<ArtistRankingPeriod>("all");
const topArtists = shallowRef<RatesTopArtistDto[]>([]);
const topArtistsLoading = shallowRef(false);
const topArtistsError = shallowRef(false);
const selectedArtist = shallowRef<RatesTopArtistDto | null>(null);
let controller: AbortController | null = null;
let requestGeneration = 0;

const emptyMessage = computed(() => {
  if (selectedPeriod.value === "month") return "Todavía no tienes artistas valorados este mes";
  if (selectedPeriod.value === "year") return "Todavía no tienes artistas valorados este año";
  return "Vota algún disco para ver tus artistas favoritos";
});

function loadTopArtists(): void {
  controller?.abort();
  const requestController = new AbortController();
  controller = requestController;
  const generation = ++requestGeneration;
  const { authStatus, userId, authSessionGeneration } = authStore;

  topArtists.value = [];
  topArtistsError.value = false;
  selectedArtist.value = null;
  if (authStatus !== "authenticated" || !userId) {
    topArtistsLoading.value = false;
    return;
  }

  topArtistsLoading.value = true;
  void getRatesTopArtists(requestController.signal, selectedPeriod.value)
    .then(({ artists }) => {
      if (generation !== requestGeneration || requestController.signal.aborted) return;
      if (authStore.userId !== userId || authStore.authSessionGeneration !== authSessionGeneration) return;
      topArtists.value = artists.slice(0, 7);
    })
    .catch(() => {
      if (generation !== requestGeneration || requestController.signal.aborted) return;
      topArtistsError.value = true;
    })
    .finally(() => {
      if (generation === requestGeneration && !requestController.signal.aborted) {
        topArtistsLoading.value = false;
      }
    });
}

function selectPeriod(period: ArtistRankingPeriod): void {
  if (selectedPeriod.value === period) return;
  selectedPeriod.value = period;
  loadTopArtists();
}

watch(
  () => [authStore.authStatus, authStore.userId, authStore.authSessionGeneration] as const,
  () => loadTopArtists(),
);

onMounted(() => loadTopArtists());
onBeforeUnmount(() => {
  controller?.abort();
  requestGeneration += 1;
});
</script>

<template>
  <div class="bg-white dark:bg-rv-darkSurface rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden">
    <div class="flex flex-wrap items-center justify-between gap-2 px-6 py-4 bg-gradient-to-r from-rv-pink/8 to-rv-purple/8 dark:from-rv-pink/10 dark:to-rv-purple/10 border-b border-gray-100 dark:border-white/10">
      <div class="flex min-w-0 items-center gap-2">
        <i class="fa-solid fa-heart text-rv-pink" aria-hidden="true"></i>
        <h3 class="font-bold text-gray-900 dark:text-white">Tus artistas favoritos</h3>
      </div>
      <div class="inline-flex shrink-0 rounded-lg border border-gray-300 bg-white/70 p-0.5 dark:border-white/15 dark:bg-rv-darkSurface" role="group" aria-label="Período del ranking de artistas">
        <button
          v-for="period in rankingPeriods"
          :key="period.value"
          type="button"
          class="rounded-md px-2.5 py-1.5 text-xs font-semibold leading-tight transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rv-pink"
          :class="selectedPeriod === period.value
            ? 'bg-rv-pink text-white shadow-sm'
            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/10'"
          :aria-pressed="selectedPeriod === period.value"
          @click="selectPeriod(period.value)"
        >
          {{ period.label }}
        </button>
      </div>
    </div>
    <div class="p-4 sm:p-6">
      <!-- Loading -->
      <div v-if="topArtistsLoading" class="flex flex-col gap-3" role="status" aria-label="Cargando artistas favoritos">
        <div class="grid grid-cols-3 gap-3">
          <div v-for="i in 3" :key="i" class="aspect-[3/2] rounded-2xl bg-gray-100 dark:bg-white/5 animate-pulse"></div>
        </div>
        <div class="grid grid-cols-4 gap-3">
          <div v-for="i in 4" :key="i+3" class="aspect-[4/3] rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse"></div>
        </div>
      </div>

      <!-- Cards -->
      <div v-else-if="topArtists.length" class="flex flex-col gap-3">
        <!-- Fila superior: top 3 grandes — 1 col en móvil, 3 en sm+ -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button v-for="artist in topArtists.slice(0, 3)" :key="artist.id"
            type="button"
            class="block relative rounded-2xl overflow-hidden aspect-[3/2] group appearance-none w-full cursor-pointer p-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink"
            :aria-label="`Ver detalles de ${artist.name}`"
            aria-haspopup="dialog"
            @click="selectedArtist = artist"
            @keydown.enter.prevent="selectedArtist = artist"
            @keydown.space.prevent="selectedArtist = artist">
            <img v-if="artist.image" :src="artist.image" :alt="artist.name"
              class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <div v-else class="w-full h-full bg-gradient-to-br from-rv-purple/30 to-rv-pink/30 flex items-center justify-center">
              <i class="fa-solid fa-music text-4xl text-white/40"></i>
            </div>
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
            <div class="absolute bottom-0 left-0 right-0 p-4">
              <p class="text-white font-bold text-base leading-snug drop-shadow-md line-clamp-1">{{ artist.name }}</p>
              <div class="flex items-center gap-1.5 mt-1">
                <i class="fa-solid fa-star text-amber-400 text-xs"></i>
                <span class="text-white font-bold text-sm">{{ artist.averageRate.toFixed(2) }}</span>
              </div>
            </div>
          </button>
        </div>

        <!-- Fila inferior: artistas 4-7 — 2 col en móvil, 4 en sm+ -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button v-for="artist in topArtists.slice(3, 7)" :key="artist.id"
            type="button"
            class="block relative rounded-xl overflow-hidden aspect-[4/3] group appearance-none w-full cursor-pointer p-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink"
            :aria-label="`Ver detalles de ${artist.name}`"
            aria-haspopup="dialog"
            @click="selectedArtist = artist"
            @keydown.enter.prevent="selectedArtist = artist"
            @keydown.space.prevent="selectedArtist = artist">
            <img v-if="artist.image" :src="artist.image" :alt="artist.name"
              class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <div v-else class="w-full h-full bg-gradient-to-br from-rv-purple/30 to-rv-pink/30 flex items-center justify-center">
              <i class="fa-solid fa-music text-2xl text-white/40"></i>
            </div>
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
            <div class="absolute bottom-0 left-0 right-0 p-2.5">
              <p class="text-white font-bold text-xs leading-snug drop-shadow-md line-clamp-1">{{ artist.name }}</p>
              <div class="flex items-center gap-1 mt-0.5">
                <i class="fa-solid fa-star text-amber-400 text-[9px]"></i>
                <span class="text-white font-bold text-[10px]">{{ artist.averageRate.toFixed(2) }}</span>
              </div>
            </div>
          </button>
        </div>
      </div>

      <div v-else-if="topArtistsError" class="py-6 text-center" role="alert">
        <p class="text-sm text-gray-500 dark:text-gray-400">No se pudieron cargar tus artistas favoritos.</p>
        <button type="button" class="mt-2 text-sm font-semibold text-rv-pink underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink" @click="loadTopArtists">
          Reintentar
        </button>
      </div>

      <p v-else-if="!hasSession" class="text-center text-gray-400 dark:text-gray-500 text-sm py-6" role="status">
        Tu sesión ya no está disponible.
      </p>
      <p v-else class="text-center text-gray-400 dark:text-gray-500 text-sm py-6" role="status">
        {{ emptyMessage }}
      </p>
    </div>

    <DashboardFavoriteArtistModal
      v-if="selectedArtist"
      :artist="selectedArtist"
      @close="selectedArtist = null"
    />
  </div>
</template>
