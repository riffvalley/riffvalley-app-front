<template>
  <div class="relative min-w-0">
    <button
      ref="trigger"
      type="button"
      class="flex h-11 w-full items-center justify-between gap-2 whitespace-nowrap rounded-full border border-gray-300 bg-white px-4 text-left text-rv-navy shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:border-white/20 dark:bg-rv-darkCard dark:text-white"
      :aria-expanded="open"
      aria-haspopup="listbox"
      aria-controls="disc-list-genres"
      :aria-label="
        selectedIds.length
          ? `Géneros seleccionados: ${selectedIds.length}`
          : 'Sin géneros seleccionados'
      "
      @click="toggle"
      @keydown.down.prevent="openAndFocus"
    >
      <span v-if="selectedIds.length" class="font-medium">
        {{ selectedIds.length }}
        {{ selectedIds.length === 1 ? "género seleccionado" : "géneros seleccionados" }}
      </span>
      <span v-else class="text-gray-600 dark:text-gray-300">Todos los géneros</span>
      <i class="fa-solid fa-chevron-down shrink-0 text-xs text-gray-500" aria-hidden="true" />
    </button>

    <div
      v-if="open"
      class="absolute z-40 mt-1 w-full rounded-2xl border border-gray-200 bg-white p-2 shadow-xl dark:border-white/20 dark:bg-rv-darkCard"
    >
      <input
        ref="search"
        v-model="searchQuery"
        type="search"
        role="combobox"
        aria-label="Buscar géneros"
        aria-controls="disc-list-genres"
        aria-autocomplete="list"
        :aria-expanded="true"
        :aria-activedescendant="
          visibleGenres[activeIndex] ? optionId(visibleGenres[activeIndex]!.id) : undefined
        "
        class="mb-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
        placeholder="Buscar géneros..."
        @keydown.down.prevent="move(1)"
        @keydown.up.prevent="move(-1)"
        @keydown.enter.prevent="toggleActive"
        @keydown.space.prevent="toggleActive"
        @keydown.esc.prevent="close"
      />
      <ul
        id="disc-list-genres"
        role="listbox"
        aria-label="Géneros"
        aria-multiselectable="true"
        class="max-h-64 overflow-auto"
      >
        <li
          v-for="(genre, index) in visibleGenres"
          :id="optionId(genre.id)"
          :key="genre.id"
          role="option"
          :aria-selected="selectedIds.includes(genre.id)"
          tabindex="-1"
          class="flex min-h-11 cursor-pointer items-center rounded-lg px-3 py-2 text-sm text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:text-gray-100"
          :class="{
            'bg-rv-pink/10 dark:bg-rv-pink/20': selectedIds.includes(genre.id),
            'bg-gray-100 dark:bg-rv-darkSurface': index === activeIndex,
          }"
          @mouseenter="activeIndex = index"
          @focusin="activeIndex = index"
          @click="toggleGenre(genre.id)"
          @keydown.enter.prevent="toggleGenre(genre.id)"
          @keydown.space.prevent="toggleGenre(genre.id)"
        >
          <span
            class="mr-2 inline-block h-2.5 w-2.5 rounded-full"
            :style="{ backgroundColor: genre.color || '#6b7280' }"
          />
          {{ genre.name }}
          <i
            v-if="selectedIds.includes(genre.id)"
            class="fa-solid fa-check float-right mt-1 text-xs"
            aria-hidden="true"
          />
        </li>
        <li
          v-if="visibleGenres.length === 0"
          class="px-3 py-2 text-sm text-gray-600 dark:text-gray-300"
          role="status"
        >
          {{
            loading
              ? "Cargando géneros..."
              : searchQuery
                ? `No hay géneros que coincidan con “${searchQuery}”`
                : "No hay géneros disponibles"
          }}
        </li>
      </ul>
      <button
        v-if="searchQuery"
        type="button"
        class="mt-1 min-h-10 px-3 text-sm font-medium underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink"
        @click="
          searchQuery = '';
          search?.focus();
        "
      >
        Borrar búsqueda
      </button>
      <p class="px-3 pt-2 text-xs text-gray-500 dark:text-gray-300" aria-live="polite">
        {{
          selectedIds.length
            ? `${selectedIds.length} seleccionados · se combinan con OR`
            : "No se aplicará filtro de género"
        }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";

interface GenreOption {
  id: string;
  name: string;
  color?: string | null;
}

const props = defineProps<{
  modelValue: string[];
  options: GenreOption[];
  loading?: boolean;
}>();
const emit = defineEmits<{ "update:modelValue": [value: string[]] }>();

const open = ref(false);
const searchQuery = ref("");
const activeIndex = ref(0);
const trigger = ref<HTMLButtonElement | null>(null);
const search = ref<HTMLInputElement | null>(null);
const selectedIds = computed(() => [...new Set(props.modelValue.map((id) => id.toLowerCase()))]);
const visibleGenres = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase();
  return props.options.filter((genre) => !query || genre.name.toLocaleLowerCase().includes(query));
});

function optionId(id: string) {
  return `disc-list-genre-${id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function toggle() {
  open.value = !open.value;
  if (open.value) void nextTick(() => search.value?.focus());
}

function openAndFocus() {
  if (!open.value) toggle();
  else void nextTick(() => search.value?.focus());
}

function close() {
  open.value = false;
  trigger.value?.focus();
}

function move(direction: number) {
  if (!visibleGenres.value.length) return;
  activeIndex.value =
    (activeIndex.value + direction + visibleGenres.value.length) % visibleGenres.value.length;
}

function toggleGenre(id: string) {
  const normalized = id.toLowerCase();
  emit(
    "update:modelValue",
    selectedIds.value.includes(normalized)
      ? selectedIds.value.filter((selectedId) => selectedId !== normalized)
      : [...selectedIds.value, normalized]
  );
}

function toggleActive() {
  const genre = visibleGenres.value[activeIndex.value];
  if (genre) toggleGenre(genre.id);
}

watch(searchQuery, () => {
  activeIndex.value = 0;
});

watch(visibleGenres, (genres) => {
  if (activeIndex.value >= genres.length) activeIndex.value = Math.max(0, genres.length - 1);
});
</script>
