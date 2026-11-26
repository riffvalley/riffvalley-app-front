<template>
  <div ref="root" class="relative min-w-0" @focusout="closeOnFocusLeave">
    <button
      ref="trigger"
      type="button"
      class="flex h-[50px] w-full items-center justify-between gap-2 whitespace-nowrap rounded-2xl border border-gray-300 bg-white px-4 text-left text-base text-rv-navy shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-navy aria-expanded:ring-2 aria-expanded:ring-rv-navy dark:aria-expanded:ring-gray-200 dark:border-white/20 dark:bg-rv-darkCard dark:text-white dark:focus-visible:ring-gray-200"
      :aria-expanded="open"
      aria-haspopup="listbox"
      aria-controls="disc-list-genres"
      :aria-label="triggerAriaLabel"
      @click="toggle"
      @keydown.down.prevent="openAndFocus"
    >
      <!-- truncate: si no cabe, el texto se corta con «…» en vez de salirse del botón. -->
      <span class="min-w-0 truncate">{{ triggerLabel }}</span>
      <i class="fa-solid fa-chevron-down shrink-0 text-xs text-gray-500 dark:text-gray-300" aria-hidden="true" />
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
          entries[activeIndex] ? optionId(entries[activeIndex]!.id) : undefined
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
        :aria-multiselectable="multiple"
        class="max-h-64 overflow-auto"
      >
        <li
          v-for="(genre, index) in entries"
          :id="optionId(genre.id)"
          :key="genre.id || ALL_GENRES_ID"
          role="option"
          :aria-selected="isSelected(genre.id)"
          tabindex="-1"
          class="flex min-h-11 cursor-pointer items-center rounded-lg px-3 py-2 text-sm text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:text-gray-100"
          :class="{
            'bg-rv-pink/10 dark:bg-rv-pink/20': isSelected(genre.id),
            'bg-gray-100 dark:bg-rv-darkSurface': index === activeIndex,
          }"
          @mouseenter="activeIndex = index"
          @focusin="activeIndex = index"
          @click="toggleGenre(genre.id)"
          @keydown.enter.prevent="toggleGenre(genre.id)"
          @keydown.space.prevent="toggleGenre(genre.id)"
        >
          <span
            v-if="genre.id"
            class="mr-2 inline-block h-2.5 w-2.5 rounded-full"
            :style="{ backgroundColor: genre.color || '#6b7280' }"
          />
          {{ genre.name }}
          <i
            v-if="isSelected(genre.id)"
            class="fa-solid fa-check ml-auto shrink-0 pl-3 text-xs"
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
      <p
        v-if="multiple || !selectedIds.length"
        class="px-3 pt-2 text-xs text-gray-500 dark:text-gray-300"
        aria-live="polite"
      >
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
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";

interface GenreOption {
  id: string;
  name: string;
  color?: string | null;
}

const props = withDefaults(
  defineProps<{
    modelValue: string[];
    options: GenreOption[];
    loading?: boolean;
    /** false: un solo género (Top Discos). Elegir uno sustituye al anterior y cierra la lista. */
    multiple?: boolean;
  }>(),
  { loading: false, multiple: true }
);
const emit = defineEmits<{ "update:modelValue": [value: string[]] }>();

/** Clave de la opción «Todos los géneros» del modo de un solo género. */
const ALL_GENRES_ID = "__all__";

const open = ref(false);
const searchQuery = ref("");
const activeIndex = ref(0);
const root = ref<HTMLElement | null>(null);
const trigger = ref<HTMLButtonElement | null>(null);
const search = ref<HTMLInputElement | null>(null);
const selectedIds = computed(() => [...new Set(props.modelValue.map((id) => id.toLowerCase()))]);
const visibleGenres = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase();
  return props.options.filter((genre) => !query || genre.name.toLocaleLowerCase().includes(query));
});
/** Lo que se recorre con el teclado. Con un solo género, «Todos los géneros» va primero para poder quitarlo. */
const entries = computed<GenreOption[]>(() =>
  !props.multiple && !searchQuery.value.trim()
    ? [{ id: "", name: "Todos los géneros" }, ...visibleGenres.value]
    : visibleGenres.value
);
const selectedGenreName = computed(() => {
  const id = selectedIds.value[0];
  return props.options.find((genre) => genre.id.toLowerCase() === id)?.name ?? "";
});
const triggerLabel = computed(() => {
  if (!selectedIds.value.length) return "Todos los géneros";
  if (!props.multiple) return selectedGenreName.value || "1 género seleccionado";
  const count = selectedIds.value.length;
  return `${count} ${count === 1 ? "género seleccionado" : "géneros seleccionados"}`;
});
const triggerAriaLabel = computed(() => {
  if (!selectedIds.value.length) return "Sin géneros seleccionados";
  if (!props.multiple) return `Género: ${triggerLabel.value}`;
  return `Géneros seleccionados: ${selectedIds.value.length}`;
});

function isSelected(id: string) {
  return id ? selectedIds.value.includes(id.toLowerCase()) : selectedIds.value.length === 0;
}

function optionId(id: string) {
  return `disc-list-genre-${(id || ALL_GENRES_ID).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
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

/** Pliega la lista sin mover el foco: el usuario ya está en otro sitio. */
function collapse() {
  open.value = false;
}

function isInside(target: EventTarget | null) {
  return target instanceof Node && Boolean(root.value?.contains(target));
}

/** Pinchar fuera del selector lo pliega. */
function onDocumentPointerDown(event: PointerEvent) {
  if (!isInside(event.target)) collapse();
}

/** Salir con Tab hacia otro control también lo pliega. */
function closeOnFocusLeave(event: FocusEvent) {
  if (open.value && event.relatedTarget && !isInside(event.relatedTarget)) collapse();
}

watch(open, (isOpen) => {
  if (isOpen) document.addEventListener("pointerdown", onDocumentPointerDown, true);
  else document.removeEventListener("pointerdown", onDocumentPointerDown, true);
});

onBeforeUnmount(() => document.removeEventListener("pointerdown", onDocumentPointerDown, true));

function move(direction: number) {
  if (!entries.value.length) return;
  activeIndex.value =
    (activeIndex.value + direction + entries.value.length) % entries.value.length;
}

function toggleGenre(id: string) {
  const normalized = id.toLowerCase();
  if (!props.multiple) {
    // Un solo género: elegir otro lo sustituye y la lista se cierra, como un selector normal.
    emit("update:modelValue", normalized ? [normalized] : []);
    searchQuery.value = "";
    close();
    return;
  }
  emit(
    "update:modelValue",
    selectedIds.value.includes(normalized)
      ? selectedIds.value.filter((selectedId) => selectedId !== normalized)
      : [...selectedIds.value, normalized]
  );
}

function toggleActive() {
  const genre = entries.value[activeIndex.value];
  if (genre) toggleGenre(genre.id);
}

watch(searchQuery, () => {
  activeIndex.value = 0;
});

watch(entries, (list) => {
  if (activeIndex.value >= list.length) activeIndex.value = Math.max(0, list.length - 1);
});
</script>
