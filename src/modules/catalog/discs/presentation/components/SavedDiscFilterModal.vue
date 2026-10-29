<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import type { SavedDiscFilterCriteria } from "../../types/savedDiscFilter";

const props = defineProps<{
  mode: "save" | "rename";
  initialName: string;
  criteria: SavedDiscFilterCriteria;
  genres: Array<{ id: string; name: string }>;
  countries: Array<{ id: string; name: string }>;
  pending: boolean;
  errorMessage: string;
}>();
const emit = defineEmits<{ close: []; submit: [name: string] }>();
const name = ref("");
const dialogElement = ref<HTMLElement | null>(null);
const nameInput = ref<HTMLInputElement | null>(null);
let previouslyFocused: HTMLElement | null = null;
watch(() => props.initialName, (value) => { name.value = value; }, { immediate: true });
const nameError = computed(() => {
  const trimmed = name.value.trim();
  if (!trimmed) return "Escribe un nombre para el filtro.";
  if (trimmed.length > 60) return "El nombre admite un máximo de 60 caracteres.";
  return "";
});
const genreSummary = computed(() => {
  const names = props.criteria.genreIds.map((id) => props.genres.find((genre) => genre.id.toLowerCase() === id.toLowerCase())?.name ?? id);
  return names.length ? names.join(", ") : "Sin géneros";
});
const countrySummary = computed(() => props.criteria.countryId
  ? props.countries.find((country) => country.id.toLowerCase() === props.criteria.countryId?.toLowerCase())?.name ?? props.criteria.countryId
  : "Todos los países");
const yearSummary = computed(() => {
  const { yearFrom, yearTo } = props.criteria;
  if (yearFrom === null && yearTo === null) return "Todos los años";
  if (yearFrom !== null && yearTo !== null) return yearFrom === yearTo ? String(yearFrom) : `${yearFrom}–${yearTo}`;
  return yearFrom !== null ? `Desde ${yearFrom}` : `Hasta ${yearTo}`;
});
function submit() {
  if (!nameError.value && !props.pending) emit("submit", name.value.trim());
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && !props.pending) {
    emit("close");
    return;
  }
  if (event.key !== "Tab") return;
  const focusable = dialogElement.value?.querySelectorAll<HTMLElement>(
    'input:not(:disabled), button:not(:disabled)'
  );
  if (!focusable?.length) return;
  const first = focusable[0]!;
  const last = focusable[focusable.length - 1]!;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
onMounted(() => {
  previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  window.addEventListener("keydown", onKeydown);
  void nextTick(() => nameInput.value?.focus());
});
onUnmounted(() => {
  window.removeEventListener("keydown", onKeydown);
  previouslyFocused?.focus();
});
</script>

<template>
  <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
    <section ref="dialogElement" class="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-rv-darkCard" role="dialog" aria-modal="true" tabindex="-1" :aria-labelledby="mode === 'save' ? 'saved-filter-title' : 'rename-filter-title'">
      <h2 v-if="mode === 'save'" id="saved-filter-title" class="text-lg font-bold text-rv-navy dark:text-white">Guardar filtro</h2>
      <h2 v-else id="rename-filter-title" class="text-lg font-bold text-rv-navy dark:text-white">Renombrar filtro</h2>
      <form class="mt-4 space-y-4" @submit.prevent="submit">
        <div>
          <label for="saved-filter-name" class="mb-1 block text-sm font-medium text-gray-800 dark:text-gray-100">Nombre del filtro
            <input id="saved-filter-name" ref="nameInput" v-model="name" type="text" maxlength="60" required class="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-rv-navy placeholder:text-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:border-white/20 dark:bg-rv-darkSurface dark:text-white" />
          </label>
          <p v-if="nameError" class="mt-1 text-sm text-red-700 dark:text-red-300">{{ nameError }}</p>
        </div>
        <dl v-if="mode === 'save'" class="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm dark:border-white/10 dark:bg-rv-darkSurface">
          <div><dt class="font-semibold text-rv-navy dark:text-white">Géneros</dt><dd class="break-words text-gray-700 dark:text-gray-200">{{ genreSummary }}</dd></div>
          <div><dt class="font-semibold text-rv-navy dark:text-white">País</dt><dd class="text-gray-700 dark:text-gray-200">{{ countrySummary }}</dd></div>
          <div><dt class="font-semibold text-rv-navy dark:text-white">Años</dt><dd class="text-gray-700 dark:text-gray-200">{{ yearSummary }}</dd></div>
        </dl>
        <p v-if="errorMessage" class="text-sm text-red-700 dark:text-red-300" role="alert">{{ errorMessage }}</p>
        <div class="flex justify-end gap-2">
          <button type="button" class="min-h-10 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-rv-navy hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:border-white/20 dark:text-white dark:hover:bg-rv-darkSurface" :disabled="pending" @click="emit('close')">Cancelar</button>
          <button type="submit" class="min-h-10 rounded-lg bg-rv-pink px-4 text-sm font-semibold text-rv-navy hover:bg-rv-pink/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple disabled:cursor-not-allowed disabled:opacity-50" :disabled="Boolean(nameError) || pending">{{ pending ? 'Guardando…' : mode === 'save' ? 'Guardar filtro' : 'Guardar nombre' }}</button>
        </div>
      </form>
    </section>
  </div>
</template>
