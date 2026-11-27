<script setup lang="ts">
import type {
  EventImportReviewCounts,
  EventImportReviewFilter,
} from "../../application/eventImportReview";

defineProps<{
  counts: EventImportReviewCounts;
  modelValue: EventImportReviewFilter;
  search: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: EventImportReviewFilter];
  "update:search": [value: string];
}>();

const filters: Array<{ id: EventImportReviewFilter; label: string }> = [
  { id: "needs-review", label: "Necesitan revisión" },
  { id: "prepared", label: "Preparados" },
  { id: "conflicts", label: "Conflictos" },
  { id: "invalid", label: "Inválidos" },
  { id: "duplicates", label: "Duplicados del archivo" },
  { id: "all", label: "Todos" },
];
</script>

<template>
  <section
    class="shrink-0 rounded-lg border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-rv-darkCard"
    aria-label="Buscar y filtrar eventos del archivo"
  >
    <div>
      <span
        id="event-import-review-search-label"
        class="mb-1 block text-sm font-semibold text-rv-navy dark:text-white"
      >
        Buscar eventos
      </span>
      <input
        id="event-import-review-search"
        aria-labelledby="event-import-review-search-label"
        :value="search"
        type="search"
        autocomplete="off"
        placeholder="Artista, lineup, festival, localidad, recinto o fecha"
        class="mt-1 min-h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rv-purple dark:border-white/20 dark:bg-rv-darkSurface dark:text-white dark:placeholder:text-gray-400"
        @input="emit('update:search', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <div class="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filtrar eventos por estado">
      <button
        v-for="filter in filters"
        :key="filter.id"
        type="button"
        :aria-pressed="modelValue === filter.id"
        class="min-h-9 rounded-full border px-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
        :class="
          modelValue === filter.id
            ? 'border-rv-navy bg-rv-navy text-white dark:border-gray-200 dark:bg-gray-200 dark:text-rv-navy'
            : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-100 dark:hover:bg-white/5'
        "
        @click="emit('update:modelValue', filter.id)"
      >
        {{ filter.label }} <span class="ml-1 tabular-nums">{{ counts[filter.id] }}</span>
      </button>
    </div>
  </section>
</template>
