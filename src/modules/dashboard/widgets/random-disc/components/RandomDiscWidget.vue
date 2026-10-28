<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef, watch } from "vue";
import DiscCard from "@components/DiscCardComponent.vue";
import { getDiscs, getRandomDiscs, type Disc, type RandomDiscsParams } from "@services/discs/discs";

type RandomDiscMode = "free" | NonNullable<RandomDiscsParams["difficulty"]>;

const modes: Array<{ id: RandomDiscMode; label: string; image: string }> = [
  { id: "free", label: "Libre", image: "/doomguy/5.png" },
  { id: "easy", label: "Fácil", image: "/doomguy/1.png" },
  { id: "normal", label: "Normal", image: "/doomguy/3.png" },
  { id: "hard", label: "Difícil", image: "/doomguy/42.png" },
];

const modeDescriptions: Record<RandomDiscMode, string> = {
  free: "Cualquier disco que aún no hayas votado. ¡Que hable el azar!",
  easy: "Un disco popular entre tus géneros favoritos. ¡Vas sobre seguro!",
  normal: "Un disco poco votado de tus géneros favoritos. ¿Joya oculta?",
  hard: "¡Descubre música nueva que puede volarte la mente!",
};

const diceFaces = [
  "fa-dice-one",
  "fa-dice-two",
  "fa-dice-three",
  "fa-dice-four",
  "fa-dice-five",
  "fa-dice-six",
];
const dicePhrases = [
  "¡El dado ha hablado!",
  "¿Tu próximo favorito?",
  "¡Dale una escucha!",
  "El destino lo eligió.",
  "¡El universo decidió!",
  "La ruleta ha girado.",
  "¿Te atreves con él?",
  "El azar tiene gusto.",
  "¡Sorpresa musical!",
  "¿Lo conocías ya?",
];

const selectedMode = shallowRef<RandomDiscMode>("free");
const currentDisc = shallowRef<Disc | null>(null);
const lastDiscByMode = shallowRef<Partial<Record<RandomDiscMode, string>>>({});
const isRolling = shallowRef(false);
const isHovering = shallowRef(false);
const hasAttempted = shallowRef(false);
const errorMessage = shallowRef<string | null>(null);
const emptyMessage = shallowRef(false);
const dicePhrase = shallowRef(dicePhrases[0]);
const currentDiceFace = shallowRef("fa-dice-five");
const currentDiceFace2 = shallowRef("fa-dice-three");
const modeDescription = computed(() => modeDescriptions[selectedMode.value]);
const missingDiscIdError = "El disco aleatorio no contiene un identificador válido.";
const emptyStateCopy = computed(() =>
  selectedMode.value === "free"
    ? "No tienes discos pendientes de valoración musical."
    : "No hay discos disponibles para esta dificultad."
);

let unvotedDiscCount: number | null = null;
let diceInterval: ReturnType<typeof setInterval> | null = null;
let hoverInterval: ReturnType<typeof setInterval> | null = null;
let requestController: AbortController | null = null;
let requestGeneration = 0;
let isUnmounted = false;

function randomFace(): string {
  return diceFaces[Math.floor(Math.random() * diceFaces.length)];
}

function stopDiceHover(): void {
  isHovering.value = false;
  if (hoverInterval) {
    clearInterval(hoverInterval);
    hoverInterval = null;
  }
}

function stopDiceRoll(): void {
  if (diceInterval) {
    clearInterval(diceInterval);
    diceInterval = null;
  }
  currentDiceFace.value = randomFace();
  currentDiceFace2.value = randomFace();
}

function animateDice(): void {
  if (isRolling.value || hoverInterval) return;
  isHovering.value = true;
  hoverInterval = setInterval(() => {
    currentDiceFace.value = randomFace();
    currentDiceFace2.value = randomFace();
  }, 500);
}

function startDiceRoll(): void {
  stopDiceHover();
  diceInterval = setInterval(() => {
    currentDiceFace.value = randomFace();
    currentDiceFace2.value = randomFace();
  }, 80);
}

function normalizeDisc(disc: Disc | null | undefined): Disc | null {
  if (!disc) return null;
  if (typeof disc.id !== "string" || !disc.id.trim()) {
    throw new Error(missingDiscIdError);
  }
  const userRate = disc.userRate as
    { id?: string; rate?: unknown; cover?: unknown } | null | undefined;

  return {
    ...disc,
    artist: { ...disc.artist, country: disc.artist?.country ?? null },
    userRate: userRate
      ? {
          ...userRate,
          rate: userRate.rate != null ? Number(userRate.rate) : null,
          cover: userRate.cover != null ? Number(userRate.cover) : null,
        }
      : null,
  };
}

async function getFreeDisc(signal: AbortSignal): Promise<Disc | null> {
  const fetchPage = (offset: number) =>
    getDiscs(
      1,
      offset,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      false,
      undefined,
      signal
    );

  if (unvotedDiscCount === null) {
    const countResponse = await fetchPage(0);
    unvotedDiscCount = countResponse.totalItems;
  }
  if (unvotedDiscCount <= 0) return null;

  const offset = Math.floor(Math.random() * unvotedDiscCount);
  const response = await fetchPage(offset);
  const first = response.data[0];
  if (!first) return null;
  const disc = "discs" in first ? first.discs[0] : first;
  return normalizeDisc(disc);
}

async function rollDice(): Promise<void> {
  if (isRolling.value || isUnmounted) return;

  const mode = selectedMode.value;
  const generation = ++requestGeneration;
  const controller = new AbortController();
  requestController = controller;
  isRolling.value = true;
  hasAttempted.value = true;
  currentDisc.value = null;
  errorMessage.value = null;
  emptyMessage.value = false;
  dicePhrase.value = dicePhrases[Math.floor(Math.random() * dicePhrases.length)];
  startDiceRoll();

  const isCurrentRequest = () =>
    !isUnmounted &&
    generation === requestGeneration &&
    mode === selectedMode.value &&
    !controller.signal.aborted;

  try {
    let disc: Disc | null;
    if (mode === "free") {
      disc = await getFreeDisc(controller.signal);
    } else {
      const response = await getRandomDiscs(
        {
          difficulty: mode,
          limit: 1,
          ...(lastDiscByMode.value[mode] ? { previousDiscId: lastDiscByMode.value[mode] } : {}),
        },
        { signal: controller.signal }
      );
      disc = normalizeDisc(response[0]);
    }

    if (!isCurrentRequest()) return;
    currentDisc.value = disc;
    emptyMessage.value = !disc;
    if (disc && mode !== "free") {
      lastDiscByMode.value = { ...lastDiscByMode.value, [mode]: disc.id };
    }
  } catch (error: unknown) {
    if (isCurrentRequest()) {
      errorMessage.value =
        error instanceof Error && error.message === missingDiscIdError
          ? "Catalog no incluyó el identificador del disco. No se puede mostrar su ficha."
          : "No se pudo obtener un disco. Inténtalo de nuevo.";
    }
  } finally {
    if (generation === requestGeneration && !isUnmounted) {
      stopDiceRoll();
      isRolling.value = false;
      requestController = null;
    }
  }
}

watch(selectedMode, () => {
  requestGeneration++;
  requestController?.abort();
  requestController = null;
  stopDiceHover();
  stopDiceRoll();
  isRolling.value = false;
  currentDisc.value = null;
  errorMessage.value = null;
  emptyMessage.value = false;
  hasAttempted.value = false;
});

onBeforeUnmount(() => {
  isUnmounted = true;
  requestGeneration++;
  requestController?.abort();
  requestController = null;
  stopDiceHover();
  stopDiceRoll();
});
</script>

<template>
  <section
    class="random-disc-widget bg-white dark:bg-rv-darkSurface rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden flex flex-col flex-1"
    aria-labelledby="random-disc-title"
  >
    <header
      class="flex items-center gap-2 px-6 py-4 bg-gradient-to-r from-amber-400/10 to-rv-pink/8 dark:from-amber-400/10 dark:to-rv-pink/10 border-b border-gray-100 dark:border-white/10"
    >
      <i class="fa-solid fa-shuffle text-amber-500" aria-hidden="true"></i>
      <h3 id="random-disc-title" class="font-bold text-gray-900 dark:text-white">
        Disco aleatorio
      </h3>
    </header>

    <div
      class="flex flex-wrap justify-center gap-1.5 px-4 pt-4 sm:px-6"
      role="group"
      aria-label="Modo de selección del disco"
    >
      <button
        v-for="mode in modes"
        :key="mode.id"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink"
        :class="
          selectedMode === mode.id
            ? 'bg-rv-navy text-white dark:bg-rv-pink'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10'
        "
        :aria-pressed="selectedMode === mode.id"
        @click="selectedMode = mode.id"
      >
        <img :src="mode.image" alt="" aria-hidden="true" class="h-5 w-4 object-contain" />
        {{ mode.label }}
      </button>
    </div>
    <div
      v-if="!hasAttempted"
      class="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-8"
    >
      <button
        data-test="roll-dice"
        type="button"
        class="inline-flex flex-col items-center gap-2 rounded-3xl border-0 bg-rv-pink px-10 py-6 text-lg font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97] active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-navy disabled:pointer-events-none disabled:opacity-50 dark:bg-rv-purple"
        :disabled="isRolling"
        @click="rollDice"
        @mouseenter="animateDice"
        @mouseleave="stopDiceHover"
        @focus="animateDice"
        @blur="stopDiceHover"
      >
        <span class="flex items-center gap-2" aria-hidden="true">
          <i
            class="fa-solid text-4xl transition-transform duration-100"
            :class="[
              isRolling || isHovering ? currentDiceFace : 'fa-dice-five',
              isHovering && !isRolling ? 'dice-wobble' : '',
            ]"
          ></i>
          <i
            class="fa-solid text-4xl transition-transform duration-100"
            :class="[
              isRolling || isHovering ? currentDiceFace2 : 'fa-dice-three',
              isHovering && !isRolling ? 'dice-wobble dice-wobble-delay' : '',
            ]"
          ></i>
        </span>
        {{ isRolling ? "Lanzando…" : "Tira los dados" }}
      </button>
      <p
        class="text-center text-base text-gray-500 dark:text-gray-400"
        data-test="random-disc-description"
      >
        {{ modeDescription }}
      </p>
    </div>

    <div v-else class="p-4 sm:p-6" aria-live="polite">
      <div
        v-if="currentDisc"
        class="mb-6 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400"
        data-test="random-disc-result-phrase"
      >
        <i class="fa-solid fa-dice text-amber-400" aria-hidden="true"></i>
        {{ dicePhrase }}
      </div>
      <p
        v-if="isRolling"
        class="py-5 text-center text-sm text-gray-500 dark:text-gray-400"
        role="status"
      >
        Lanzando los dados…
      </p>
      <p
        v-else-if="errorMessage"
        class="py-5 text-center text-sm text-rose-600 dark:text-rose-400"
        role="alert"
        data-test="random-disc-error"
      >
        {{ errorMessage }}
      </p>
      <p
        v-else-if="emptyMessage"
        class="py-5 text-center text-sm text-gray-500 dark:text-gray-400"
        role="status"
        data-test="random-disc-empty"
      >
        {{ emptyStateCopy }}
      </p>

      <div v-if="currentDisc" class="mx-auto flex max-w-xs justify-center">
        <DiscCard
          :key="currentDisc.id"
          :id="currentDisc.id"
          :ep="currentDisc.ep ?? currentDisc.EP"
          :image="currentDisc.image"
          :name="currentDisc.name"
          :releaseDate="currentDisc.releaseDate"
          :artistName="currentDisc.artist?.name"
          :genreName="currentDisc.genre?.name"
          :genreColor="currentDisc.genre?.color"
          :link="currentDisc.link"
          :averageRate="currentDisc.averageRate"
          :averageCover="currentDisc.averageCover"
          :rate="currentDisc.userRate?.rate"
          :cover="currentDisc.userRate?.cover"
          :isNew="!currentDisc.userRate"
          :userDiscRate="currentDisc.userRate?.id"
          :favoriteId="currentDisc.favoriteId"
          :pendingId="currentDisc.pendingId"
          :comment-count="currentDisc.commentCount"
          :rateCount="currentDisc.voteCount"
          :artistCountry="currentDisc.artist?.country"
          :debut="currentDisc.debut"
        />
      </div>

      <div class="mt-5 flex justify-center">
        <button
          data-test="roll-dice"
          type="button"
          class="inline-flex items-center gap-2 rounded-2xl border-0 bg-rv-pink px-5 py-1.5 text-xs font-semibold text-white shadow transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-navy disabled:pointer-events-none disabled:opacity-50 dark:bg-rv-purple"
          :disabled="isRolling"
          @click="rollDice"
          @mouseenter="animateDice"
          @mouseleave="stopDiceHover"
          @focus="animateDice"
          @blur="stopDiceHover"
        >
          <i
            class="fa-solid text-sm transition-transform duration-100"
            :class="[
              isRolling || isHovering ? currentDiceFace : 'fa-dice-five',
              isHovering && !isRolling ? 'dice-wobble' : '',
            ]"
            aria-hidden="true"
          ></i>
          {{
            isRolling
              ? "Lanzando…"
              : errorMessage || emptyMessage
                ? "Intentar de nuevo"
                : "Vuelve a tirar"
          }}
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
@keyframes dice-wobble {
  0%,
  100% {
    transform: rotate(0deg) scale(1);
  }
  25% {
    transform: rotate(-12deg) scale(1.08);
  }
  50% {
    transform: rotate(0deg) scale(1.15);
  }
  75% {
    transform: rotate(12deg) scale(1.08);
  }
}

.dice-wobble {
  animation: dice-wobble 0.5s ease-in-out infinite;
}

.dice-wobble-delay {
  animation-delay: 0.15s;
}
</style>
