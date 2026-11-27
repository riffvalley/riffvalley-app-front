<script setup lang="ts">
import type { EventImportResolutionPhase } from "../../application/useEventImportRows";

defineProps<{ phases: EventImportResolutionPhase[] }>();

const statusLabels = {
  pending: "Pendiente",
  "in-progress": "En curso",
  complete: "Completada",
  error: "Error parcial",
} as const;
</script>

<template>
  <ol
    class="mt-3 divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-white/10 dark:border-white/10"
    aria-label="Fases de resolución"
  >
    <li
      v-for="phase in phases"
      :key="phase.id"
      class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2"
    >
      <span
        class="flex items-center gap-2 font-medium"
        :class="phase.status === 'in-progress' ? 'text-rv-navy dark:text-white' : ''"
      >
        <i
          class="fa-solid"
          :class="
            phase.status === 'complete'
              ? 'fa-circle-check text-green-700 dark:text-green-300'
              : phase.status === 'error'
                ? 'fa-triangle-exclamation text-amber-700 dark:text-amber-300'
                : phase.status === 'in-progress'
                  ? 'fa-spinner fa-spin text-rv-purple'
                  : 'fa-circle text-gray-400 dark:text-gray-500'
          "
          aria-hidden="true"
        ></i>
        <span>{{ phase.label }}</span>
        <span v-if="phase.status === 'in-progress'" class="sr-only">(fase activa)</span>
      </span>
      <span class="text-xs text-gray-600 dark:text-gray-300">
        {{ statusLabels[phase.status] }}
        <template v-if="phase.total">
          · {{ phase.processed }}/{{ phase.total }} referencias</template
        >
        <template v-else-if="phase.status === 'complete'"> · Sin referencias pendientes</template>
        <template v-if="phase.errors"> · {{ phase.errors }} con error</template>
      </span>
    </li>
  </ol>
</template>
