<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { faCircleInfo } from "@fortawesome/free-solid-svg-icons";
import { buildGenreLegend, type LegendGenre } from "../artistGenreLegend";
import { artistGenrePillBackground } from "../artistGenreColor";

const props = defineProps<{ genres: readonly LegendGenre[] }>();

const open = ref(false);
const root = ref<HTMLElement | null>(null);
const blocks = computed(() => buildGenreLegend(props.genres));

function toggle(): void {
  open.value = !open.value;
}

function onDocumentClick(event: MouseEvent): void {
  if (open.value && root.value && !root.value.contains(event.target as Node)) open.value = false;
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") open.value = false;
}

onMounted(() => document.addEventListener("click", onDocumentClick));
onBeforeUnmount(() => document.removeEventListener("click", onDocumentClick));
</script>

<template>
  <!-- La ventanita se posiciona respecto a la cabecera (relative) para no salirse en móvil. -->
  <span ref="root" class="inline-flex" @keydown="onKeydown">
    <button
      type="button"
      class="!inline-flex !h-6 !w-6 !items-center !justify-center !rounded-full !border-0 !bg-transparent !p-0 !text-gray-400 !shadow-none transition-colors hover:!text-rv-pink focus-visible:!outline focus-visible:!outline-2 focus-visible:!outline-offset-2 focus-visible:!outline-rv-pink dark:!text-gray-400 dark:hover:!text-rv-pink"
      aria-label="Qué significan los colores de género"
      :aria-expanded="open"
      aria-controls="artist-genre-legend"
      data-testid="genre-legend-button"
      @click.stop="toggle"
    >
      <font-awesome-icon :icon="faCircleInfo" aria-hidden="true" />
    </button>
    <Transition name="info-pop">
      <div
        v-if="open"
        id="artist-genre-legend"
        role="note"
        class="absolute left-1/2 top-full -translate-x-1/2 z-30 mt-2 max-h-[70vh] w-[min(36rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-rv-pink/20 bg-white p-4 text-left text-xs leading-relaxed text-gray-600 shadow-lg dark:border-white/10 dark:bg-rv-darkCard dark:text-gray-300"
        data-testid="genre-legend"
      >
        <p class="mb-1 font-bold text-rv-navy dark:text-white">¿Qué significan los colores?</p>
        <p class="mb-3">
          Cada color agrupa un bloque de géneros afines, así de un vistazo sabes por dónde va un artista o un disco.
        </p>

        <p v-if="blocks.length === 0" class="text-gray-500 dark:text-gray-400">Cargando géneros…</p>

        <ul class="divide-y divide-gray-100 dark:divide-white/10">
          <li v-for="block in blocks" :key="block.key" class="py-2.5 first:pt-0 last:pb-0" data-testid="genre-legend-block">
            <p class="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-rv-navy dark:text-white">
              <span
                class="inline-block h-3 w-3 shrink-0 rounded-full"
                :style="{ backgroundColor: artistGenrePillBackground(block.color, block.label) }"
                aria-hidden="true"
              ></span>
              {{ block.label }}
              <span class="font-normal normal-case tracking-normal text-gray-500 dark:text-gray-400">({{ block.genres.length }})</span>
            </p>
            <ul class="flex flex-wrap gap-1.5" :aria-label="`Géneros de ${block.label}`">
              <li
                v-for="genre in block.genres"
                :key="genre.id"
                class="rounded-full px-2 py-0.5 text-[11px] font-medium text-white shadow-sm"
                :style="{ backgroundColor: artistGenrePillBackground(genre.color, genre.name) }"
              >
                {{ genre.name }}
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </Transition>
  </span>
</template>

<style scoped>
.info-pop-enter-active,
.info-pop-leave-active {
  transition: opacity 0.15s ease;
}
.info-pop-enter-from,
.info-pop-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .info-pop-enter-active,
  .info-pop-leave-active { transition: none; }
}
</style>
