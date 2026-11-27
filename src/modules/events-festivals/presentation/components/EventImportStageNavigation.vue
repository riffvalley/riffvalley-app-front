<script setup lang="ts">
export type EventImportStageId = "load" | "resolve" | "review" | "import";
export type EventImportStageStatus = "complete" | "current" | "pending" | "skipped";

export interface EventImportStageItem {
  id: EventImportStageId;
  label: string;
  status: EventImportStageStatus;
  disabled: boolean;
  disabledReason?: string;
}

defineProps<{ stages: EventImportStageItem[] }>();

const emit = defineEmits<{
  navigate: [stage: EventImportStageId];
}>();

const statusLabel: Record<EventImportStageStatus, string> = {
  complete: "Completada",
  current: "Etapa actual",
  pending: "Pendiente",
  skipped: "No necesaria",
};
</script>

<template>
  <nav aria-label="Etapas de importación" class="shrink-0">
    <ol class="grid grid-cols-2 gap-2 md:grid-cols-4">
      <li v-for="(stage, index) in stages" :key="stage.id">
        <button
          type="button"
          class="flex min-h-12 w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
          :class="
            stage.status === 'current'
              ? 'border-rv-navy bg-rv-navy text-white dark:border-gray-200 dark:bg-gray-200 dark:text-rv-navy'
              : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/20 dark:bg-rv-darkCard dark:text-gray-100 dark:hover:bg-white/5'
          "
          :disabled="stage.disabled"
          :aria-current="stage.status === 'current' ? 'step' : undefined"
          :aria-label="`${index + 1}. ${stage.label}: ${statusLabel[stage.status]}`"
          :aria-description="stage.disabled ? stage.disabledReason : undefined"
          :title="stage.disabled ? stage.disabledReason : undefined"
          @click="emit('navigate', stage.id)"
        >
          <span
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold"
            aria-hidden="true"
          >
            {{ stage.status === "complete" ? "✓" : index + 1 }}
          </span>
          <span class="min-w-0">
            <span class="block font-semibold">{{ stage.label }}</span>
            <span class="block text-xs opacity-80">{{ statusLabel[stage.status] }}</span>
          </span>
        </button>
      </li>
    </ol>
  </nav>
</template>
