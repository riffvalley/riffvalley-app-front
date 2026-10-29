<template>
  <div ref="root" class="relative w-full">
    <span
      id="disc-list-search-label"
      class="mb-2 block text-sm font-semibold text-rv-navy dark:text-white"
    >
      Buscar discos o artistas
    </span>
    <div class="relative">
      <i
        class="fa-solid fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-300"
        aria-hidden="true"
      />
      <input
        :id="inputId"
        ref="input"
        data-testid="disc-list-search-input"
        aria-labelledby="disc-list-search-label"
        role="combobox"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        :aria-expanded="panelVisible"
        :aria-controls="panelVisible ? listboxId : undefined"
        :aria-activedescendant="activeOptionId"
        :value="modelValue"
        type="text"
        placeholder="Buscar discos o artistas…"
        autocomplete="off"
        class="w-full rounded-2xl border border-gray-300 bg-white py-3 pl-11 pr-14 text-base text-rv-navy shadow-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-navy dark:border-white/20 dark:bg-rv-darkCard dark:text-white dark:placeholder:text-gray-300 dark:focus-visible:ring-gray-200"
        @focus="openPanel"
        @input="onInput"
        @keydown.down.prevent.stop="moveActive(1)"
        @keydown.up.prevent.stop="moveActive(-1)"
        @keydown.enter.prevent.stop="selectActiveOrClose"
        @keydown.esc.prevent.stop="closePanel(true)"
      />
      <button
        v-if="modelValue"
        type="button"
        class="absolute right-1 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-transparent text-gray-600 hover:bg-rv-navy hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-navy dark:text-gray-200 dark:hover:bg-gray-200 dark:hover:text-rv-navy dark:focus-visible:ring-gray-200"
        aria-label="Limpiar búsqueda"
        @click="clearSearch"
      >
        <i class="fa-solid fa-xmark" aria-hidden="true" />
      </button>
    </div>

    <div
      v-if="selectedArtist"
      class="mt-2 inline-flex max-w-full items-center gap-2 rounded-full border border-rv-navy bg-rv-navy px-3 py-1 text-sm text-white dark:border-gray-200 dark:bg-gray-200 dark:text-rv-navy"
      data-testid="selected-artist-filter"
    >
      <span class="truncate">Artista: {{ selectedArtist.name }}</span>
      <button
        type="button"
        class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-white dark:focus-visible:outline-rv-navy"
        :aria-label="`Quitar filtro de artista ${selectedArtist.name}`"
        @click="emit('clear-artist')"
      >
        <i class="fa-solid fa-xmark" aria-hidden="true" />
      </button>
    </div>

    <Teleport to="body">
      <div
        v-if="panelVisible"
        ref="popup"
        class="disc-list-autocomplete-popup fixed z-[100] overflow-y-auto overscroll-contain rounded-xl border border-gray-200 bg-white shadow-xl dark:border-white/15 dark:bg-rv-darkCard"
        :style="popupStyle"
        @pointerdown="onPopupPointerDown"
      >
        <ul
          :id="listboxId"
          role="listbox"
          aria-label="Sugerencias de discos y artistas"
          class="max-h-full space-y-1 overflow-y-auto p-2"
        >
          <li v-if="artists.length" role="group" :aria-labelledby="artistsHeadingId">
            <h2
              :id="artistsHeadingId"
              class="px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-rv-navy dark:text-gray-200"
            >
              Artistas
            </h2>
            <ul>
              <li v-for="(artist, index) in artists" :key="`artist-${artist.id}`">
                <button
                  :id="artistOptionId(artist.id)"
                  type="button"
                  role="option"
                  :aria-selected="activeIndex === index"
                  class="group flex min-h-14 w-full items-center gap-3 rounded-lg bg-rv-navy px-3 py-2 text-left text-white outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rv-navy dark:bg-gray-200 dark:text-rv-navy dark:focus-visible:ring-gray-200"
                  :class="
                    activeIndex === index
                      ? 'bg-rv-navy text-white dark:bg-gray-200 dark:text-rv-navy'
                      : ''
                  "
                  @mousedown.prevent
                  @click="selectArtist(artist)"
                >
                  <img
                    v-if="artist.image"
                    :src="artist.image"
                    :alt="`Fotografía de ${artist.name}`"
                    class="h-10 w-10 shrink-0 rounded-full bg-gray-100 object-cover dark:bg-rv-darkSurface"
                  />
                  <span
                    v-else
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rv-navy text-white dark:bg-gray-200 dark:text-rv-navy"
                    aria-hidden="true"
                  >
                    <i class="fa-solid fa-user" />
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-semibold">{{ artist.name }}</span>
                    <span
                      v-if="artist.country"
                      class="block truncate text-xs text-white/80 dark:text-rv-navy/70"
                      :class="activeIndex === index ? 'text-white dark:text-rv-navy' : ''"
                    >
                      {{ artist.country.name }}
                    </span>
                  </span>
                </button>
              </li>
            </ul>
          </li>

          <li v-if="discs.length" role="group" :aria-labelledby="discsHeadingId">
            <h2
              :id="discsHeadingId"
              class="px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-rv-navy dark:text-gray-200"
            >
              Discos
            </h2>
            <ul>
              <li v-for="(disc, discIndex) in discs" :key="`disc-${disc.id}`">
                <button
                  :id="discOptionId(disc.id)"
                  type="button"
                  role="option"
                  :aria-selected="activeIndex === artists.length + discIndex"
                  class="group flex min-h-14 w-full items-center gap-3 rounded-lg bg-rv-navy px-3 py-2 text-left text-white outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rv-navy dark:bg-gray-200 dark:text-rv-navy dark:focus-visible:ring-gray-200"
                  :class="
                    activeIndex === artists.length + discIndex
                      ? 'bg-rv-navy text-white dark:bg-gray-200 dark:text-rv-navy'
                      : ''
                  "
                  @mousedown.prevent
                  @click="selectDisc(disc)"
                >
                  <img
                    :src="disc.image || discPlaceholder"
                    :alt="disc.image ? `Portada de ${disc.title}` : ''"
                    class="h-11 w-11 shrink-0 rounded-md bg-gray-100 object-cover dark:bg-rv-darkSurface"
                    :aria-hidden="disc.image ? undefined : 'true'"
                  />
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-semibold">{{ disc.title }}</span>
                    <span
                      class="block truncate text-xs text-white/80 dark:text-rv-navy/70"
                      :class="
                        activeIndex === artists.length + discIndex
                          ? 'text-white dark:text-rv-navy'
                          : ''
                      "
                    >
                      {{ disc.artistName }}
                    </span>
                  </span>
                </button>
              </li>
            </ul>
          </li>
        </ul>

        <p
          v-if="isDebouncing || isFetching"
          class="px-4 py-3 text-sm text-gray-500 dark:text-gray-300"
          role="status"
        >
          Buscando sugerencias…
        </p>
        <div
          v-else-if="error"
          class="px-4 py-3 text-sm text-gray-700 dark:text-gray-200"
          role="status"
        >
          <span>No se pudieron cargar las sugerencias.</span>
          <button
            type="button"
            class="ml-2 rounded px-2 py-1 font-semibold text-rv-navy underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-navy hover:bg-rv-navy hover:text-white dark:text-gray-200 dark:hover:bg-gray-200 dark:hover:text-rv-navy dark:focus-visible:outline-gray-200"
            @click="retrySuggestions"
          >
            Reintentar
          </button>
        </div>
        <p
          v-else-if="suggestions && !artists.length && !discs.length"
          class="px-4 py-3 text-sm text-gray-500 dark:text-gray-300"
          role="status"
        >
          No se han encontrado sugerencias.
          <button
            type="button"
            class="ml-1 rounded-full bg-rv-navy px-3 py-1 font-semibold text-white underline underline-offset-2 hover:bg-rv-navy/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink dark:bg-gray-200 dark:text-rv-navy dark:hover:bg-gray-300 dark:focus-visible:outline-rv-pink"
            @click="emit('create-disc')"
          >
            Añadir disco
          </button>
        </p>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useId, watch } from "vue";
import discPlaceholder from "@/assets/disco.png";
import { useDiscListSuggestions } from "../../application/useDiscListSuggestions";
import type {
  DiscListArtistSuggestion,
  DiscListDiscSuggestion,
  DiscListSelectedArtist,
} from "../../types/discList";

const props = defineProps<{
  modelValue: string;
  selectedArtist: DiscListSelectedArtist | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [query: string];
  "select-artist": [artist: DiscListSelectedArtist];
  "clear-artist": [];
  "select-disc": [disc: DiscListDiscSuggestion];
  "create-disc": [];
}>();

const root = ref<HTMLElement | null>(null);
const input = ref<HTMLInputElement | null>(null);
const popup = ref<HTMLElement | null>(null);
const panelOpen = ref(false);
const activeIndex = ref(-1);
const componentId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
const inputId = "disc-list-search-input";
const listboxId = `disc-list-suggestions-${componentId}`;
const artistsHeadingId = `${listboxId}-artists`;
const discsHeadingId = `${listboxId}-discs`;
const popupStyle = ref<Record<string, string>>({});
const { suggestions, isFetching, isDebouncing, error, canQuery, retry } = useDiscListSuggestions(
  () => props.modelValue,
  panelOpen
);

const artists = computed(() => suggestions.value?.artists.slice(0, 3) ?? []);
const discs = computed(() => suggestions.value?.discs.slice(0, 5) ?? []);
const panelVisible = computed(() => panelOpen.value && (canQuery.value || isDebouncing.value));
const activeOptionId = computed(() => {
  if (activeIndex.value < 0) return undefined;
  const artist = artists.value[activeIndex.value];
  if (artist) return artistOptionId(artist.id);
  const discIndex = activeIndex.value - artists.value.length;
  const disc = discs.value[discIndex];
  return disc ? discOptionId(disc.id) : undefined;
});

function artistOptionId(id: string): string {
  return `${listboxId}-artist-${id}`;
}

function discOptionId(id: string): string {
  return `${listboxId}-disc-${id}`;
}

function updatePopupPosition() {
  const bounds = input.value?.getBoundingClientRect();
  if (!bounds) return;
  const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
  const width = Math.min(bounds.width, viewportWidth - 16);
  const left = Math.min(Math.max(8, bounds.left), viewportWidth - width - 8);
  const below = window.innerHeight - bounds.bottom - 8;
  const above = bounds.top - 8;
  const placeAbove = below < 180 && above > below;
  const maxHeight = Math.max(120, Math.min(320, placeAbove ? above : below));
  popupStyle.value = {
    left: `${left}px`,
    width: `${width}px`,
    maxHeight: `${maxHeight}px`,
    ...(placeAbove
      ? { bottom: `${window.innerHeight - bounds.top + 8}px` }
      : { top: `${bounds.bottom + 8}px` }),
  };
}

function openPanel() {
  panelOpen.value = true;
}

function closePanel(returnFocus = false) {
  panelOpen.value = false;
  activeIndex.value = -1;
  if (returnFocus) {
    void nextTick(() => {
      input.value?.focus();
      panelOpen.value = false;
    });
  }
}

function onInput(event: Event) {
  emit("update:modelValue", (event.target as HTMLInputElement).value);
  activeIndex.value = -1;
  openPanel();
}

function clearSearch() {
  emit("update:modelValue", "");
  activeIndex.value = -1;
  closePanel();
  void nextTick(() => input.value?.focus());
}

function moveActive(direction: 1 | -1) {
  openPanel();
  const total = artists.value.length + discs.value.length;
  if (!total) {
    activeIndex.value = -1;
    return;
  }
  if (activeIndex.value < 0) activeIndex.value = direction === 1 ? 0 : total - 1;
  else activeIndex.value = (activeIndex.value + direction + total) % total;
  void nextTick(() => {
    if (activeOptionId.value) {
      document.getElementById(activeOptionId.value)?.scrollIntoView?.({ block: "nearest" });
    }
  });
}

function selectArtist(artist: DiscListArtistSuggestion) {
  emit("select-artist", { id: artist.id, name: artist.name });
  closePanel(true);
}

function selectDisc(disc: DiscListDiscSuggestion) {
  emit("select-disc", disc);
  closePanel();
}

function selectActiveOrClose() {
  if (activeIndex.value < artists.value.length) {
    const artist = artists.value[activeIndex.value];
    if (artist) {
      selectArtist(artist);
      return;
    }
  } else if (activeIndex.value >= artists.value.length) {
    const disc = discs.value[activeIndex.value - artists.value.length];
    if (disc) {
      selectDisc(disc);
      return;
    }
  }
  closePanel();
}

function onDocumentPointerDown(event: PointerEvent) {
  const target = event.target as Node | null;
  if (target && (root.value?.contains(target) || popup.value?.contains(target))) return;
  closePanel();
}

function onPopupPointerDown(event: PointerEvent) {
  // Keep the combobox input focused while pointer/touch selection runs.
  if (event.pointerType === "mouse") event.preventDefault();
}

function retrySuggestions() {
  void retry();
}

watch(
  () => props.modelValue,
  () => {
    activeIndex.value = -1;
  }
);

watch(panelVisible, async (visible) => {
  if (visible) {
    await nextTick();
    updatePopupPosition();
  }
});

watch([artists, discs], () => {
  const count = artists.value.length + discs.value.length;
  if (activeIndex.value >= count) activeIndex.value = -1;
});

onMounted(() => {
  document.addEventListener("pointerdown", onDocumentPointerDown, true);
  window.addEventListener("resize", updatePopupPosition);
  window.addEventListener("scroll", updatePopupPosition, true);
});

onUnmounted(() => {
  document.removeEventListener("pointerdown", onDocumentPointerDown, true);
  window.removeEventListener("resize", updatePopupPosition);
  window.removeEventListener("scroll", updatePopupPosition, true);
});
</script>
