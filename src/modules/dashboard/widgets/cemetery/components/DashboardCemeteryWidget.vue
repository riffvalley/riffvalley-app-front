<script setup lang="ts">
import { computed, onUnmounted, shallowRef, watch } from "vue";
import DiscCard from "@components/DiscCardComponent.vue";
import { useAuthStore } from "@/modules/identity/auth";
import { getRandomDiscs, type Disc } from "@services/discs/discs";

interface RatingSavedEvent {
  discId: string;
  action: "created" | "updated";
  musicalRateChanged: boolean;
  hasMusicalRate: boolean;
  coverChanged: boolean;
}

const authStore = useAuthStore();
const discs = shallowRef<Disc[]>([]);
const isLoading = shallowRef(false);
const isRolling = shallowRef(false);
const hasLoaded = shallowRef(false);
const errorMessage = shallowRef<string | null>(null);

const sessionKey = computed(() =>
  authStore.isAuthenticated && authStore.userId
    ? `${authStore.userId}:${authStore.authSessionGeneration}`
    : null,
);

const missingDiscIdMessage = "Catalog devolvió un disco sin identificador válido.";

let activeController: AbortController | null = null;
let requestGeneration = 0;
let isUnmounted = false;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidDisc(value: unknown): value is Disc {
  if (!isRecord(value) || typeof value.id !== "string" || value.id.trim() === "") return false;
  if (typeof value.name !== "string" || typeof value.releaseDate !== "string") return false;
  return isRecord(value.artist) && typeof value.artist.name === "string";
}

function normalizeDisc(disc: Disc): Disc {
  const userRate = disc.userRate;
  return {
    ...disc,
    artist: { ...disc.artist, country: disc.artist?.country ?? null },
    userRate: userRate
      ? {
          ...userRate,
          rate: userRate.rate == null ? null : Number(userRate.rate),
          cover: userRate.cover == null ? null : Number(userRate.cover),
        }
      : null,
    favoriteId: disc.favoriteId ?? disc.userFavoriteId ?? null,
  };
}

function cancelActiveRequest(): void {
  requestGeneration += 1;
  activeController?.abort();
  activeController = null;
  isLoading.value = false;
  isRolling.value = false;
}

function uniqueDiscs(items: Disc[]): Disc[] {
  const seen = new Set<string>();
  return items.filter((disc) => {
    if (seen.has(disc.id)) return false;
    seen.add(disc.id);
    return true;
  });
}

async function requestDiscs(
  purpose: "shuffle" | "replacement",
  excludedIds: readonly string[] = [],
  interruptCurrent = false,
): Promise<void> {
  if (!sessionKey.value || isUnmounted) return;
  if (isLoading.value && !interruptCurrent) return;
  if (interruptCurrent) cancelActiveRequest();

  const requestSession = sessionKey.value;
  const generation = ++requestGeneration;
  const controller = new AbortController();
  activeController = controller;
  isLoading.value = true;
  isRolling.value = purpose === "shuffle" && hasLoaded.value;
  errorMessage.value = null;

  const isCurrentRequest = () =>
    !isUnmounted &&
    generation === requestGeneration &&
    requestSession === sessionKey.value &&
    !controller.signal.aborted;

  try {
    const response: unknown = await getRandomDiscs(
      { unratedByCommunity: true, limit: 2 },
      { signal: controller.signal },
    );
    if (!isCurrentRequest()) return;
    if (!Array.isArray(response)) throw new Error("La respuesta de Catalog no es una lista de discos.");

    const validDiscs = response.filter(isValidDisc).map(normalizeDisc);
    if (response.length > 0 && validDiscs.length === 0) {
      throw new Error(missingDiscIdMessage);
    }

    const excluded = new Set(excludedIds);
    if (purpose === "replacement") {
      discs.value = uniqueDiscs([
        ...discs.value,
        ...validDiscs.filter((disc) => !excluded.has(disc.id)),
      ]).slice(0, 2);
    } else {
      const freshDiscs = validDiscs.filter((disc) => !excluded.has(disc.id));
      // The community-unrated backend mode currently ignores previousDiscId.
      // Prefer alternatives included in this response without making another request.
      discs.value = uniqueDiscs(freshDiscs.length > 0 ? freshDiscs : validDiscs).slice(0, 2);
    }
    hasLoaded.value = true;
  } catch (error: unknown) {
    if (isCurrentRequest()) {
      errorMessage.value =
        error instanceof Error && error.message === missingDiscIdMessage
          ? missingDiscIdMessage
          : "No se pudieron cargar los discos olvidados. Inténtalo de nuevo.";
      hasLoaded.value = true;
    }
  } finally {
    if (generation === requestGeneration && !isUnmounted) {
      isLoading.value = false;
      isRolling.value = false;
      activeController = null;
    }
  }
}

function fetchOtherDiscs(): void {
  if (isLoading.value) return;
  void requestDiscs("shuffle", discs.value.map((disc) => disc.id));
}

function handleRatingSaved(event: RatingSavedEvent): void {
  if (!event.hasMusicalRate || !event.musicalRateChanged) return;
  if (!discs.value.some((disc) => disc.id === event.discId)) return;

  discs.value = discs.value.filter((disc) => disc.id !== event.discId);
  void requestDiscs("replacement", [event.discId], isLoading.value);
}

watch(
  sessionKey,
  (currentSession, _previousSession, onCleanup) => {
    cancelActiveRequest();
    discs.value = [];
    errorMessage.value = null;
    hasLoaded.value = false;

    if (currentSession) void requestDiscs("shuffle");
    onCleanup(cancelActiveRequest);
  },
  { immediate: true },
);

const showInitialLoading = computed(() => isLoading.value && discs.value.length === 0);
const showEmpty = computed(() => hasLoaded.value && !isLoading.value && !errorMessage.value && discs.value.length === 0);

onUnmounted(() => {
  isUnmounted = true;
  cancelActiveRequest();
});
</script>

<template>
  <section
    class="bg-white dark:bg-rv-darkSurface rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden flex flex-col flex-1"
    aria-labelledby="cemetery-title"
    data-test="cemetery-widget"
  >
    <header class="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-gray-800/5 to-gray-600/5 dark:from-white/3 dark:to-white/5 border-b border-gray-100 dark:border-white/10 shrink-0">
      <div class="flex flex-col">
        <div class="flex items-center gap-2">
          <span class="text-base leading-none" aria-hidden="true">🪦</span>
          <h3 id="cemetery-title" class="font-bold text-gray-900 dark:text-white">Cementerio de discos</h3>
        </div>
        <p class="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 pl-6">Solo discos sin valoraciones musicales</p>
      </div>
      <button
        type="button"
        data-test="cemetery-shuffle"
        :disabled="isLoading || !sessionKey"
        :aria-busy="isLoading"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow bg-gray-100 dark:bg-rv-navy text-rv-navy dark:text-white hover:bg-rv-navy hover:text-white dark:hover:bg-rv-pink hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none transition-all duration-200 border border-gray-200 dark:border-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink"
        @click="fetchOtherDiscs"
      >
        <i class="fa-solid fa-shuffle text-[10px]" :class="{ 'animate-spin': isRolling }" aria-hidden="true"></i>
        {{ isLoading ? "Buscando…" : "Otros olvidados" }}
      </button>
    </header>

    <div class="p-4 sm:p-5 flex-1" aria-live="polite">
      <div v-if="showInitialLoading" class="grid grid-cols-1 xl:grid-cols-2 gap-4" role="status">
        <span class="sr-only">Buscando discos olvidados…</span>
        <div v-for="slot in 2" :key="slot" class="aspect-square rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse"></div>
      </div>

      <p v-else-if="!sessionKey" class="text-center text-gray-400 dark:text-gray-500 text-sm py-6" role="status">
        Inicia sesión para buscar discos olvidados.
      </p>

      <template v-else>
        <p v-if="isLoading && discs.length > 0" class="mb-3 text-center text-xs text-gray-400 dark:text-gray-500" role="status">
          Buscando otros discos olvidados…
        </p>
        <p v-if="errorMessage" class="mb-3 text-center text-sm text-rose-600 dark:text-rose-400" role="alert" data-test="cemetery-error">
          {{ errorMessage }}
        </p>

        <div v-if="discs.length > 0" class="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div v-for="disc in discs" :key="disc.id" class="flex justify-center">
            <DiscCard
              :id="disc.id"
              :ep="disc.ep ?? disc.EP"
              :image="disc.image ?? ''"
              :name="disc.name"
              :releaseDate="disc.releaseDate"
              :artistName="disc.artist.name"
              :genreName="disc.genre?.name"
              :genreColor="disc.genre?.color"
              :link="disc.link"
              :averageRate="disc.averageRate"
              :averageCover="disc.averageCover"
              :rate="disc.userRate?.rate"
              :cover="disc.userRate?.cover"
              :isNew="!disc.userRate"
              :userDiscRate="disc.userRate?.id"
              :favoriteId="disc.favoriteId ?? disc.userFavoriteId"
              :pendingId="disc.pendingId"
              :comment-count="disc.commentCount"
              :rateCount="disc.voteCount"
              :artistCountry="disc.artist?.country"
              :debut="disc.debut"
              @rating-saved="handleRatingSaved"
            />
          </div>
        </div>

        <p v-else-if="showEmpty" class="text-center text-gray-400 dark:text-gray-500 text-sm py-6" role="status" data-test="cemetery-empty">
          No quedan discos sin valoraciones musicales en el catálogo.
        </p>
      </template>
    </div>
  </section>
</template>
