<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import { getAvailableYears } from "@helpers/dateConstants";
import SearchableSelect from "@components/SearchableSelect.vue";
import DiscListGenreSelect from "../DiscListGenreSelect.vue";
import DiscListSelect from "../DiscListSelect.vue";
import { isEmptySavedDiscFilterCriteria } from "../../../application/savedDiscFilterCriteria";
import type { SavedDiscFilter, SavedDiscFilterCriteria } from "../../../types/savedDiscFilter";

export interface SavedDiscFilterEditorValue {
  name: string;
  filters: SavedDiscFilterCriteria;
}

const props = defineProps<{
  /** Filtro a editar; null para crear uno nuevo. */
  filter: SavedDiscFilter | null;
  genres: Array<{ id: string; name: string; color?: string | null }>;
  countries: Array<{ id: string; name: string }>;
  optionsLoading: boolean;
  pending: boolean;
  errorMessage: string;
}>();
const emit = defineEmits<{ cancel: []; submit: [value: SavedDiscFilterEditorValue] }>();

const name = ref(props.filter?.name ?? "");
// Los géneros o el país que ya no existen se descartan al editar.
const missingGenres = new Set((props.filter?.missingGenreIds ?? []).map((id) => id.toLowerCase()));
const genreIds = ref<string[]>(
  (props.filter?.filters.genreIds ?? [])
    .map((id) => id.toLowerCase())
    .filter((id) => !missingGenres.has(id))
);
const countryId = ref<string>(
  props.filter?.countryMissing ? "" : (props.filter?.filters.countryId ?? "")
);
const yearFrom = ref<number | null>(props.filter?.filters.yearFrom ?? null);
const yearTo = ref<number | null>(props.filter?.filters.yearTo ?? null);
const submitted = ref(false);
const nameInput = ref<HTMLInputElement | null>(null);

const yearOptions = computed(() => {
  const years = new Set<number>(getAvailableYears());
  // Un filtro antiguo puede tener años fuera de la lista actual: se conservan.
  for (const year of [props.filter?.filters.yearFrom, props.filter?.filters.yearTo])
    if (typeof year === "number") years.add(year);
  return [...years].sort((a, b) => a - b);
});

const yearSelectOptions = computed(() => [
  { value: "", label: "Sin límite" },
  ...yearOptions.value.map((year) => ({ value: year, label: String(year) })),
]);

const criteria = computed<SavedDiscFilterCriteria>(() => ({
  genreIds: [...genreIds.value],
  countryId: countryId.value || null,
  yearFrom: yearFrom.value,
  yearTo: yearTo.value,
}));

const nameError = computed(() => {
  const trimmed = name.value.trim();
  if (!trimmed) return "Escribe un nombre para el filtro.";
  if (trimmed.length > 60) return "El nombre admite un máximo de 60 caracteres.";
  return "";
});
const criteriaError = computed(() => {
  if (isEmptySavedDiscFilterCriteria(criteria.value))
    return "Elige al menos un género, un país o un año.";
  if (yearFrom.value !== null && yearTo.value !== null && yearFrom.value > yearTo.value)
    return "El año «Desde» no puede ser posterior al año «Hasta».";
  return "";
});

function parseYear(value: string): number | null {
  return value ? Number(value) : null;
}

function submit() {
  submitted.value = true;
  if (nameError.value || criteriaError.value || props.pending) return;
  emit("submit", { name: name.value.trim(), filters: criteria.value });
}

onMounted(() => void nextTick(() => nameInput.value?.focus()));
</script>

<template>
  <form class="space-y-5" novalidate data-testid="saved-filter-editor" @submit.prevent="submit">
    <div>
      <label
        for="manage-filter-name"
        class="mb-1 block text-sm font-semibold text-rv-navy dark:text-white"
      >
        Nombre del filtro
      </label>
      <input
        id="manage-filter-name"
        ref="nameInput"
        v-model="name"
        type="text"
        maxlength="60"
        autocomplete="off"
        class="h-[50px] w-full rounded-2xl border border-gray-300 bg-white px-4 text-base text-rv-navy shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-navy dark:border-white/20 dark:bg-rv-darkCard dark:text-white dark:focus-visible:ring-gray-200"
        :aria-invalid="submitted && Boolean(nameError)"
        :aria-describedby="submitted && nameError ? 'manage-filter-name-error' : undefined"
      />
      <p
        v-if="submitted && nameError"
        id="manage-filter-name-error"
        class="mt-1 text-sm text-red-700 dark:text-red-300"
      >
        {{ nameError }}
      </p>
    </div>

    <div>
      <span class="mb-1 block text-sm font-semibold text-rv-navy dark:text-white">Géneros</span>
      <DiscListGenreSelect v-model="genreIds" :options="genres" :loading="optionsLoading" />
    </div>

    <div class="country-control" role="group" aria-labelledby="manage-filter-country-label">
      <span
        id="manage-filter-country-label"
        class="mb-1 block text-sm font-semibold text-rv-navy dark:text-white"
      >
        País
      </span>
      <SearchableSelect
        v-model="countryId"
        :options="countries"
        placeholder="Buscar país..."
        trigger-placeholder="Todos los países"
        all-label="Todos los países"
        title="name"
        trackby="id"
        :max="150"
        menu-variant="panel"
        class="w-full"
      />
    </div>

    <fieldset>
      <legend id="manage-filter-years-legend" class="mb-1 block text-sm font-semibold text-rv-navy dark:text-white">Años</legend>
      <div class="grid grid-cols-2 gap-3">
        <div class="min-w-0">
          <span
            id="manage-filter-year-from-label"
            class="mb-1 block text-sm text-gray-700 dark:text-gray-200"
          >
            Desde
          </span>
          <DiscListSelect
            id="manage-filter-year-from"
            data-testid="manage-filter-year-from"
            labelledby="manage-filter-years-legend manage-filter-year-from-label"
            :model-value="yearFrom ?? ''"
            :options="yearSelectOptions"
            @update:model-value="yearFrom = parseYear($event)"
          />
        </div>
        <div class="min-w-0">
          <span
            id="manage-filter-year-to-label"
            class="mb-1 block text-sm text-gray-700 dark:text-gray-200"
          >
            Hasta
          </span>
          <DiscListSelect
            id="manage-filter-year-to"
            data-testid="manage-filter-year-to"
            labelledby="manage-filter-years-legend manage-filter-year-to-label"
            :model-value="yearTo ?? ''"
            :options="yearSelectOptions"
            @update:model-value="yearTo = parseYear($event)"
          />
        </div>
      </div>
    </fieldset>

    <p
      v-if="submitted && criteriaError"
      class="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/15 dark:text-amber-100"
      role="alert"
    >
      {{ criteriaError }}
    </p>
    <p
      v-if="errorMessage"
      class="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-500/15 dark:text-red-100"
      role="alert"
    >
      {{ errorMessage }}
    </p>

    <div class="flex flex-wrap justify-end gap-2 pt-1">
      <button
        type="button"
        class="!rounded-full !border !border-gray-300 !bg-white !px-5 !py-2 !text-sm !font-semibold !text-rv-navy hover:!bg-gray-50 focus-visible:!outline focus-visible:!outline-2 focus-visible:!outline-offset-2 focus-visible:!outline-rv-pink dark:!border-white/20 dark:!bg-transparent dark:!text-white dark:hover:!bg-white/10"
        :disabled="pending"
        @click="emit('cancel')"
      >
        Cancelar
      </button>
      <button
        type="submit"
        class="!rounded-full !border-0 !bg-rv-pink !px-5 !py-2 !text-sm !font-semibold !text-white hover:!bg-rv-pink/90 focus-visible:!outline focus-visible:!outline-2 focus-visible:!outline-offset-2 focus-visible:!outline-rv-pink disabled:!cursor-not-allowed disabled:!opacity-60"
        :disabled="pending"
      >
        {{ pending ? "Guardando…" : filter ? "Guardar cambios" : "Crear filtro" }}
      </button>
    </div>
  </form>
</template>

<style scoped>
/* SearchableSelect trae estilo de píldora global: aquí se iguala al resto de
   controles (50px, rounded-2xl, foco navy) sin tocar otras pantallas. */
.country-control :deep(.search_input_trigger) {
  height: 50px;
  line-height: 1.5rem;
  padding: 0 1rem;
  font-size: 1rem;
  @apply rounded-2xl border-gray-300 bg-white text-rv-navy shadow-sm;
}
.country-control :deep(.search_input_trigger:hover) {
  @apply border-gray-300;
}
.country-control :deep(.search_input_trigger:focus-visible),
.country-control :deep(.search_input_trigger[aria-expanded="true"]) {
  @apply border-gray-300 outline-none ring-2 ring-rv-navy;
}
.country-control :deep(.search_input_trigger i) {
  font-size: 0.75rem;
  @apply text-gray-500;
}
.dark .country-control :deep(.search_input_trigger i) {
  @apply !text-gray-300;
}
.country-control :deep(.search_input_trigger p) {
  @apply font-normal text-rv-navy;
}
.dark .country-control :deep(.search_input_trigger) {
  @apply !border-white/20 !bg-rv-darkCard !text-white;
}
.dark .country-control :deep(.search_input_trigger:focus-visible),
.dark .country-control :deep(.search_input_trigger[aria-expanded="true"]) {
  @apply ring-gray-200;
}
</style>
