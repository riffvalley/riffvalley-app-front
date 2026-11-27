<script setup lang="ts">
import type { EventListingFilters } from "../../application/useEventListing";

const props = defineProps<{ filters: EventListingFilters; busy: boolean; idPrefix: string }>();
const emit = defineEmits<{
  updateFilter: [key: keyof EventListingFilters, value: string];
  clear: [];
}>();
</script>

<template>
  <form
    class="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-rv-darkCard sm:grid-cols-[1fr_1fr_auto] sm:items-end"
    aria-label="Filtrar eventos por fecha de inicio"
    @submit.prevent
  >
    <label
      :for="`${props.idPrefix}-date-from`"
      class="text-sm font-semibold text-gray-700 dark:text-gray-200"
    >
      Inicio desde
      <input
        :id="`${props.idPrefix}-date-from`"
        type="date"
        :value="props.filters.dateFrom"
        :disabled="props.busy"
        class="mt-1 min-h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple disabled:opacity-60 dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
        @input="emit('updateFilter', 'dateFrom', ($event.target as HTMLInputElement).value)"
      />
    </label>
    <label
      :for="`${props.idPrefix}-date-to`"
      class="text-sm font-semibold text-gray-700 dark:text-gray-200"
    >
      Inicio hasta
      <input
        :id="`${props.idPrefix}-date-to`"
        type="date"
        :value="props.filters.dateTo"
        :min="props.filters.dateFrom || undefined"
        :disabled="props.busy"
        class="mt-1 min-h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple disabled:opacity-60 dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
        @input="emit('updateFilter', 'dateTo', ($event.target as HTMLInputElement).value)"
      />
    </label>
    <button
      type="button"
      class="min-h-10 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-rv-navy hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple disabled:opacity-60 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
      :disabled="props.busy || (!props.filters.dateFrom && !props.filters.dateTo)"
      @click="emit('clear')"
    >
      Limpiar fechas
    </button>
  </form>
</template>
