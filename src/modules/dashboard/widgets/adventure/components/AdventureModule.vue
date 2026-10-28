<template>
  <div
    data-test="adventure-root"
    class="flex flex-col flex-1 bg-white dark:bg-rv-darkSurface"
    :aria-busy="isBusy ? 'true' : 'false'"
  >
    <!-- Intro -->
    <div v-if="phase === 'intro'" class="flex flex-col items-center justify-center gap-4 flex-1 px-6 py-8 text-center">
      <i class="fa-solid fa-book-open text-5xl text-rv-purple dark:text-rv-pink" aria-hidden="true"></i>
      <p class="font-serif text-gray-500 dark:text-gray-400 text-sm italic leading-relaxed max-w-xs">
        El destino baraja las cartas de tu colección. Responde a sus preguntas y descubrirás el disco que te aguarda...
      </p>
      <button
        data-test="adventure-start"
        type="button"
        :disabled="isBusy"
        class="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold tracking-wide shadow-md
               bg-rv-navy dark:bg-rv-purple text-white
               hover:bg-rv-pink hover:-translate-y-0.5 hover:shadow-lg
               active:scale-[0.97] active:translate-y-0
               transition-all duration-200 border-0
               focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink
               disabled:cursor-not-allowed disabled:opacity-60"
        @click="startAdventure"
      >
        <i class="fa-solid fa-scroll" aria-hidden="true"></i>
        Comenzar la aventura
      </button>
    </div>

    <!-- Pregunta -->
    <div v-else-if="phase === 'question' && currentQuestion" class="flex flex-col gap-4 flex-1 px-6 py-6">
      <p class="font-sans text-[11px] uppercase tracking-widest text-rv-pink/80 dark:text-rv-pink/70 text-center font-semibold">
        Elección {{ stepIndex + 1 }} de {{ categoryOrder.length }}
      </p>
      <p class="font-serif text-gray-500 dark:text-gray-400 text-sm italic leading-relaxed text-center">
        {{ currentQuestion.flavor }}
      </p>
      <p class="text-gray-900 dark:text-white font-bold text-center text-base">{{ currentQuestion.label }}</p>

      <div class="flex flex-col gap-2 max-w-xs mx-auto w-full">
        <button
          data-test="adventure-option"
          v-for="opt in currentQuestion.options"
          :key="String(opt.value)"
          type="button"
          :disabled="isBusy"
          class="group flex items-center gap-3 pl-3 pr-4 py-3 rounded-md text-left text-sm font-semibold shadow-sm
                 bg-gray-50 dark:bg-white/5 border-l-4 border-rv-purple/50 dark:border-rv-pink/40
                 text-gray-800 dark:text-gray-200
                 hover:bg-rv-navy hover:text-white hover:border-rv-pink dark:hover:bg-rv-pink
                 active:scale-[0.98] transition-all duration-150
                 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink
                 disabled:cursor-not-allowed disabled:opacity-60"
          @click="choose(opt)"
        >
          <i class="fa-solid fa-feather-pointed text-rv-purple/60 dark:text-rv-pink/50 group-hover:text-white text-xs shrink-0 transition-colors" aria-hidden="true"></i>
          <CircleFlags
            v-if="currentQuestion.category === 'pais' && opt.extra"
            :country="opt.extra.toLowerCase()"
            :show-flag-name="false"
            class="w-4 h-4 shrink-0"
            aria-hidden="true"
          />
          <span class="truncate flex-1">{{ opt.label }}</span>
          <i class="fa-solid fa-chevron-right text-rv-purple/40 dark:text-rv-pink/30 group-hover:text-white text-xs shrink-0 transition-colors" aria-hidden="true"></i>
        </button>
      </div>
    </div>

    <!-- Consultando el oráculo -->
    <div
      v-else-if="phase === 'loading'"
      data-test="adventure-loading"
      class="flex flex-col items-center justify-center gap-3 flex-1 px-6 py-16"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <i class="fa-solid fa-spinner animate-spin text-2xl text-rv-purple dark:text-rv-pink" aria-hidden="true"></i>
      <span class="font-serif text-sm text-gray-500 dark:text-gray-400 italic">Consultando el oráculo…</span>
    </div>

    <!-- Error de Catalog -->
    <div
      v-else-if="phase === 'error'"
      data-test="adventure-error"
      class="flex flex-col items-center justify-center gap-3 flex-1 px-6 py-10 text-center"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <i class="fa-solid fa-triangle-exclamation text-3xl text-rv-pink" aria-hidden="true"></i>
      <p class="font-serif text-gray-600 dark:text-gray-300 text-sm italic leading-relaxed max-w-xs">
        No se pudo consultar el catálogo. Tus elecciones siguen guardadas; puedes reintentar este paso.
      </p>
      <div class="flex flex-wrap justify-center gap-3">
        <button
          data-test="adventure-retry"
          type="button"
          :disabled="isBusy"
          class="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold shadow
                 bg-rv-navy dark:bg-rv-purple text-white
                 hover:bg-rv-pink hover:-translate-y-0.5 hover:shadow-md
                 active:scale-[0.97] active:translate-y-0 transition-all duration-200 border-0
                 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink
                 disabled:cursor-not-allowed disabled:opacity-60"
          @click="retry"
        >
          <i class="fa-solid fa-rotate-right" aria-hidden="true"></i>
          Reintentar
        </button>
        <button
          type="button"
          :disabled="isBusy"
          class="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold
                 text-rv-navy dark:text-white underline underline-offset-4
                 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink
                 disabled:cursor-not-allowed disabled:opacity-60"
          @click="restart"
        >
          Empezar otra aventura
        </button>
      </div>
    </div>

    <!-- Resultado -->
    <div v-else-if="phase === 'result' && resultDisc" class="flex flex-col gap-4 flex-1 px-4 py-5">
      <p class="font-serif text-gray-500 dark:text-gray-400 text-sm italic leading-relaxed text-center">
        El destino ha hablado. Este es el disco que te esperaba:
      </p>
      <div class="flex justify-center">
        <DiscCard
          :key="resultDisc.id"
          :id="resultDisc.id"
          :ep="resultDisc.ep"
          :image="resultDisc.image"
          :name="resultDisc.name"
          :releaseDate="resultDisc.releaseDate"
          :artistName="resultDisc.artist?.name"
          :genreName="resultDisc.genre?.name"
          :genreColor="resultDisc.genre?.color"
          :link="resultDisc.link"
          :averageRate="resultDisc.averageRate"
          :averageCover="resultDisc.averageCover"
          :rate="resultDisc.userRate?.rate"
          :cover="resultDisc.userRate?.cover"
          :isNew="!resultDisc.userRate"
          :userDiscRate="resultDisc.userRate?.id"
          :favoriteId="resultDisc.userFavoriteId"
          :pendingId="resultDisc.pendingId"
          :comment-count="resultDisc.commentCount"
          :rateCount="resultDisc.voteCount"
          :artistCountry="resultDisc.artist?.country"
          :debut="resultDisc.debut"
        />
      </div>
      <button
        type="button"
        class="self-center inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold shadow
               bg-rv-navy dark:bg-rv-purple text-white
               hover:bg-rv-pink hover:-translate-y-0.5 hover:shadow-md
               active:scale-[0.97] active:translate-y-0
               transition-all duration-200 border-0
               focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink"
        @click="restart"
      >
        <i class="fa-solid fa-arrows-rotate" aria-hidden="true"></i>
        Vivir otra aventura
      </button>
    </div>

    <!-- Sin resultados -->
    <div
      v-else-if="phase === 'empty'"
      data-test="adventure-empty"
      class="flex flex-col items-center justify-center gap-3 flex-1 px-6 py-10 text-center"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <i class="fa-solid fa-book-skull text-3xl text-gray-300 dark:text-gray-600" aria-hidden="true"></i>
      <p class="font-serif text-gray-500 dark:text-gray-400 text-sm italic leading-relaxed max-w-xs">
        El oráculo permanece en silencio... ningún disco responde a esa combinación del destino.
      </p>
      <button
        type="button"
        class="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold shadow
               bg-rv-navy dark:bg-rv-purple text-white
               hover:bg-rv-pink hover:-translate-y-0.5 hover:shadow-md
               active:scale-[0.97] active:translate-y-0
               transition-all duration-200 border-0
               focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink"
        @click="restart"
      >
        <i class="fa-solid fa-arrows-rotate" aria-hidden="true"></i>
        Reintentar
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import DiscCard from '@components/DiscCardComponent.vue';
import { useAdventureFlow } from '../composables/useAdventureFlow';

const {
  phase,
  isBusy,
  categoryOrder,
  stepIndex,
  currentQuestion,
  resultDisc,
  startAdventure,
  choose,
  retry,
  restart,
} = useAdventureFlow();
</script>
