<script setup lang="ts">
import { computed } from "vue";
import type { SavedDiscFilter } from "../../types/savedDiscFilter";
import DiscListSelect from "./DiscListSelect.vue";

const props = defineProps<{
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
const options = computed(() => [
  { value: "", label: props.emptyLabel ?? "Sin filtros activos" },
  ...props.filters.map((filter) => ({
    value: filter.id,
    // «Filtro - nombre»; el aplicado lo marca un check verde (y «aplicado» para lectores de pantalla).
    label: `Filtro - ${filter.name}`,
    applied: filter.id === props.appliedId,
  })),
]);
function onChange(id: string) {
  emit("update:selectedId", id);
  emit("apply", id);
}
</script>

<template>
  <div class="min-w-0 w-full">
    <span
      id="saved-disc-filter-label"
      class="sr-only"
    >
      Mis filtros
    </span>
    <div class="flex min-w-0 gap-2">
      <DiscListSelect
        id="saved-disc-filter"
        class="flex-1"
        labelledby="saved-disc-filter-label"
        :model-value="selectedId"
        :options="options"
        :disabled="disabled"
        @update:model-value="onChange"
      />
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
