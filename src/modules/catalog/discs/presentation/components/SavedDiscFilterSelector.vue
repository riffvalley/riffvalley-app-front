<script setup lang="ts">
import type { SavedDiscFilter } from "../../types/savedDiscFilter";

defineProps<{
  filters: SavedDiscFilter[];
  selectedId: string;
  appliedId: string;
  disabled: boolean;
  /** Texto de la opción vacía: indica si hay o no filtros de género/país puestos. */
  emptyLabel?: string;
}>();
const emit = defineEmits<{
  "update:selectedId": [id: string];
  apply: [id: string];
  manage: [];
}>();
function onChange(event: Event) {
  const id = (event.target as HTMLSelectElement).value;
  emit("update:selectedId", id);
  emit("apply", id);
}
</script>

<template>
  <div class="min-w-0 w-full">
    <span
      id="saved-disc-filter-label"
      class="mb-2 block text-sm font-semibold text-rv-navy dark:text-white"
    >
      Mis filtros
    </span>
    <div class="flex min-w-0 gap-2">
      <select
        id="saved-disc-filter"
        aria-labelledby="saved-disc-filter-label"
        class="min-h-[50px] min-w-0 flex-1 rounded-2xl border border-gray-300 bg-white px-4 text-base text-rv-navy shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-navy disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/20 dark:bg-rv-darkCard dark:text-white dark:focus-visible:ring-gray-200"
        :value="selectedId"
        :disabled="disabled"
        @change="onChange"
      >
        <option value="">{{ emptyLabel ?? "Sin filtros activos" }}</option>
        <option v-for="filter in filters" :key="filter.id" :value="filter.id">
          {{ filter.name }}{{ filter.id === appliedId ? " · aplicado" : "" }}
        </option>
      </select>
      <button
        type="button"
        data-testid="saved-filters-manage-discs"
        aria-label="Gestionar mis filtros"
        title="Gestionar mis filtros"
        class="!inline-flex !h-[50px] !w-[50px] !shrink-0 !items-center !justify-center !rounded-2xl !border !border-gray-300 !bg-white !p-0 !text-rv-navy !shadow-sm hover:!bg-gray-100 focus-visible:!outline-none focus-visible:!ring-2 focus-visible:!ring-rv-navy dark:!border-white/20 dark:!bg-rv-darkCard dark:!text-white dark:hover:!bg-rv-darkSurface dark:focus-visible:!ring-gray-200"
        @click="emit('manage')"
      >
        <i class="fa-solid fa-sliders" aria-hidden="true"></i>
      </button>
    </div>
  </div>
</template>
