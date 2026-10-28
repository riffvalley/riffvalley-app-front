<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { useAuthStore } from "@/modules/identity/auth";
import {
  getDailyCoverFeatured,
  type DailyCoverFeaturedDisc,
} from "@services/discs/discs";
import { postRateService, updateRateService } from "@services/rates/rates";

const authStore = useAuthStore();
const cover = ref<DailyCoverFeaturedDisc | null>(null);
const coverVoteValue = ref<number | null>(null);
const personalCoverVote = ref<number | null>(null);
const isLoading = ref(false);
const isSubmitting = ref(false);
const loadError = ref("");
const voteError = ref("");
const isVoteSaved = ref(false);

const sessionKey = computed(() => {
  if (!authStore.isAuthenticated || !authStore.userId) return null;
  return `${authStore.userId}:${authStore.authSessionGeneration}`;
});
const hasSession = computed(() => Boolean(sessionKey.value));

const canSubmitVote = computed(() =>
  typeof coverVoteValue.value === "number" &&
  Number.isFinite(coverVoteValue.value) &&
  coverVoteValue.value >= 1 &&
  coverVoteValue.value <= 10 &&
  Number.isInteger(coverVoteValue.value * 2),
);

const formattedAverage = computed(() =>
  cover.value
    ? new Intl.NumberFormat("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(
        cover.value.averageCover,
      )
    : "",
);

const formattedVoteCount = computed(() =>
  cover.value ? new Intl.NumberFormat("es-ES").format(cover.value.coverVoteCount) : "",
);

function isValidCoverDisc(value: unknown): value is DailyCoverFeaturedDisc {
  if (!value || typeof value !== "object") return false;
  const disc = value as Partial<DailyCoverFeaturedDisc>;
  const artist = disc.artist;
  return Boolean(
    typeof disc.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(disc.id) &&
      typeof disc.name === "string" &&
      disc.name.trim() &&
      typeof disc.image === "string" &&
      disc.image.trim() &&
      artist &&
      typeof artist.name === "string" &&
      artist.name.trim() &&
      typeof disc.averageCover === "number" &&
      Number.isFinite(disc.averageCover) &&
      typeof disc.coverVoteCount === "number" &&
      Number.isInteger(disc.coverVoteCount) &&
      disc.coverVoteCount >= 0,
  );
}

function clearWidgetState() {
  cover.value = null;
  coverVoteValue.value = null;
  personalCoverVote.value = null;
  isLoading.value = false;
  isSubmitting.value = false;
  loadError.value = "";
  voteError.value = "";
  isVoteSaved.value = false;
}

let requestVersion = 0;
let activeRequest: AbortController | null = null;
let isAlive = true;

function cancelActiveRequest() {
  requestVersion += 1;
  activeRequest?.abort();
  activeRequest = null;
}

async function requestCover() {
  const currentSession = sessionKey.value;
  if (!currentSession) return;

  cancelActiveRequest();
  const version = requestVersion;
  const controller = new AbortController();
  activeRequest = controller;
  isLoading.value = true;
  loadError.value = "";

  try {
    const response = await getDailyCoverFeatured({ signal: controller.signal });
    if (
      !isAlive ||
      controller.signal.aborted ||
      version !== requestVersion ||
      currentSession !== sessionKey.value
    ) {
      return;
    }

    if (response === null) {
      cover.value = null;
      coverVoteValue.value = null;
      personalCoverVote.value = null;
      isVoteSaved.value = false;
      voteError.value = "";
      return;
    }

    if (!isValidCoverDisc(response)) {
      cover.value = null;
      coverVoteValue.value = null;
      personalCoverVote.value = null;
      isVoteSaved.value = false;
      loadError.value = "La portada recibida no tiene un formato válido.";
      return;
    }

    cover.value = response;
    coverVoteValue.value = null;
    personalCoverVote.value = null;
    isVoteSaved.value = false;
    voteError.value = "";
  } catch {
    if (isAlive && !controller.signal.aborted && version === requestVersion && currentSession === sessionKey.value) {
      loadError.value = "No se pudo cargar la portada destacada.";
    }
  } finally {
    if (isAlive && version === requestVersion && currentSession === sessionKey.value) {
      isLoading.value = false;
      if (activeRequest === controller) activeRequest = null;
    }
  }
}

watch(
  sessionKey,
  (currentSession, _previousSession, onCleanup) => {
    cancelActiveRequest();
    clearWidgetState();

    if (currentSession) {
      void requestCover();
    }

    onCleanup(cancelActiveRequest);
  },
  { immediate: true },
);

onUnmounted(() => {
  isAlive = false;
  cancelActiveRequest();
});

async function submitCoverVote() {
  const selectedCover = cover.value;
  const vote = coverVoteValue.value;
  if (!selectedCover || !isValidCoverDisc(selectedCover) || !canSubmitVote.value || isSubmitting.value) {
    return;
  }

  const currentSession = sessionKey.value;
  if (!currentSession) return;

  isSubmitting.value = true;
  voteError.value = "";
  const musicalRate = selectedCover.userRate?.rate;
  const payload = {
    discId: selectedCover.id,
    rate: musicalRate == null ? null : Number(musicalRate),
    cover: vote,
  };

  try {
    if (selectedCover.userRate?.id) {
      await updateRateService(selectedCover.userRate.id, payload);
    } else {
      await postRateService(payload);
    }

    if (!isAlive || currentSession !== sessionKey.value) return;

    const nextCount = selectedCover.coverVoteCount + 1;
    const nextAverage =
      (selectedCover.averageCover * selectedCover.coverVoteCount + vote) / nextCount;
    cover.value = {
      ...selectedCover,
      averageCover: nextAverage,
      coverVoteCount: nextCount,
      userRate: {
        ...(selectedCover.userRate ?? {}),
        rate: payload.rate,
        cover: vote,
      },
    };
    personalCoverVote.value = vote;
    isVoteSaved.value = true;
  } catch {
    if (isAlive && currentSession === sessionKey.value) {
      voteError.value = "No se pudo guardar tu valoración. Puedes intentarlo de nuevo.";
    }
  } finally {
    if (isAlive && currentSession === sessionKey.value) isSubmitting.value = false;
  }
}
</script>

<template>
  <section
    class="bg-white dark:bg-rv-darkSurface rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden flex flex-col flex-1"
    aria-labelledby="cover-of-day-title"
    data-test="cover-of-day-widget"
  >
    <header class="flex items-center gap-2 px-6 py-4 bg-gradient-to-r from-rv-purple/8 to-rv-pink/8 dark:from-rv-purple/10 dark:to-rv-pink/10 border-b border-gray-100 dark:border-white/10 shrink-0">
      <i class="fa-solid fa-image text-rv-purple" aria-hidden="true"></i>
      <h3 id="cover-of-day-title" class="font-bold text-gray-900 dark:text-white">Portada del día</h3>
    </header>

    <div v-if="isLoading && !cover" class="flex flex-col items-center justify-center gap-3 py-16 flex-1" role="status" aria-live="polite">
      <i class="fa-solid fa-spinner animate-spin text-2xl text-rv-purple" aria-hidden="true"></i>
      <span class="text-sm text-gray-500 dark:text-gray-400">Buscando portada…</span>
    </div>

    <div v-else class="flex flex-col flex-1">
      <div v-if="isLoading" class="px-4 py-2 text-xs text-gray-500 dark:text-gray-400" role="status" aria-live="polite">
        Buscando otra portada…
      </div>

      <div v-if="loadError" class="mx-4 mt-4 rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-800 dark:text-red-200" role="alert">
        <p>{{ loadError }}</p>
        <button
          type="button"
          class="mt-2 font-semibold underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
          :disabled="isLoading"
          @click="requestCover"
        >
          Reintentar
        </button>
      </div>

      <article v-if="cover" class="flex flex-col flex-1" :aria-labelledby="`cover-title-${cover.id}`">
        <a
          :href="cover.image"
          target="_blank"
          rel="noopener noreferrer"
          class="relative block aspect-square max-h-[460px] min-h-[280px] w-full shrink-0 overflow-hidden bg-gray-100 dark:bg-rv-navy group/cover cursor-zoom-in focus-visible:outline focus-visible:outline-4 focus-visible:outline-inset focus-visible:outline-rv-purple"
          :aria-label="`Ampliar portada de ${cover.name} en una pestaña nueva`"
        >
          <img
            :src="cover.image"
            :alt="`Portada de ${cover.name}, de ${cover.artist.name}`"
            class="w-full h-full object-contain transition-transform duration-300 group-hover/cover:scale-105"
          />
          <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cover:opacity-100 transition-opacity duration-200 pointer-events-none" aria-hidden="true">
            <div class="w-14 h-14 rounded-full bg-black/50 flex items-center justify-center shadow-lg">
              <i class="fa-solid fa-magnifying-glass-plus text-white text-2xl"></i>
            </div>
          </div>
        </a>

        <div class="p-4 shrink-0 border-t border-gray-100 dark:border-white/10">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0">
              <h4 :id="`cover-title-${cover.id}`" class="break-words text-base font-bold leading-snug text-gray-900 dark:text-white">
                {{ cover.name }}
              </h4>
              <p class="mt-0.5 break-words text-sm text-gray-600 dark:text-gray-300">{{ cover.artist.name }}</p>
            </div>
            <p class="shrink-0 text-sm font-semibold text-gray-700 dark:text-gray-200 sm:text-right" data-test="cover-community-rating">
              {{ formattedAverage }} / 10 · {{ formattedVoteCount }}
              {{ cover.coverVoteCount === 1 ? 'voto de portada' : 'votos de portada' }}
            </p>
          </div>

          <div v-if="voteError" class="mt-3 rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-800 dark:text-red-200" role="alert">
            {{ voteError }}
          </div>

          <div v-if="isVoteSaved" class="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" role="status" aria-live="polite">
            <p class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <i class="fa-solid fa-circle-check text-green-600 dark:text-green-400" aria-hidden="true"></i>
              Valoraste esta portada con <strong class="text-rv-purple">{{ personalCoverVote }}</strong>
            </p>
            <button
              type="button"
              class="inline-flex items-center justify-center gap-2 rounded-full bg-rv-purple px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rv-purple/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple disabled:opacity-50"
              :disabled="isLoading"
              @click="requestCover"
            >
              <i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i>
              {{ isLoading ? 'Buscando…' : 'Descubrir otra portada' }}
            </button>
          </div>

          <form v-else class="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center" @submit.prevent="submitCoverVote">
            <label :for="`cover-vote-${cover.id}`" class="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300 shrink-0">
              <span>Tu nota de portada</span>
              <input
                :id="`cover-vote-${cover.id}`"
                v-model.number="coverVoteValue"
                type="number"
                min="1"
                max="10"
                step="0.5"
                inputmode="decimal"
                :aria-describedby="`cover-vote-help-${cover.id}`"
                class="w-24 px-3 py-2 text-base text-center font-bold border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-rv-darkCard text-rv-navy dark:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
              />
            </label>
            <span :id="`cover-vote-help-${cover.id}`" class="sr-only">Introduce una nota entre 1 y 10 en pasos de 0,5.</span>
            <button
              type="submit"
              class="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-rv-purple px-4 py-2 text-sm font-semibold text-white shadow transition-colors hover:bg-rv-purple/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="isSubmitting || !canSubmitVote || !cover.id"
            >
              <i v-if="isSubmitting" class="fa-solid fa-spinner animate-spin" aria-hidden="true"></i>
              <i v-else class="fa-solid fa-image" aria-hidden="true"></i>
              {{ isSubmitting ? 'Enviando…' : 'Votar portada' }}
            </button>
          </form>
        </div>
      </article>

      <div v-else-if="!isLoading && !loadError && hasSession" class="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center" data-test="cover-empty-state">
        <i class="fa-solid fa-image text-3xl text-rv-purple/60" aria-hidden="true"></i>
        <p class="text-sm text-gray-600 dark:text-gray-300">No quedan portadas destacadas pendientes de valorar.</p>
      </div>

      <div v-if="!cover && !isLoading && !loadError && !hasSession" class="flex flex-1 items-center justify-center px-6 py-12 text-center text-sm text-gray-600 dark:text-gray-300">
        Inicia sesión para descubrir una portada.
      </div>
    </div>
  </section>
</template>
