<template>
  <article
    class="feedback-history-card rounded-xl border border-gray-200 bg-white p-3 text-left dark:border-white/10 dark:bg-rv-darkCard"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="flex min-w-0 flex-wrap items-center gap-1.5">
        <span
          :class="typeClass"
          class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold"
        >
          <i :class="typeIcon" aria-hidden="true"></i>
          {{ typeLabel }}
        </span>
        <span
          class="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-white/10 dark:text-gray-300"
        >
          {{ feedbackCategoryLabel(entry.category) }}
        </span>
      </div>
      <span
        :class="statusClass"
        class="feedback-history-card__status shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold"
      >
        {{ statusLabel }}
      </span>
    </div>

    <h3 class="mt-2 break-words text-sm font-bold leading-5 text-gray-900 dark:text-white">
      {{ entry.title }}
    </h3>
    <p
      class="mt-0.5 whitespace-pre-line break-words text-sm leading-5 text-gray-600 dark:text-gray-300"
    >
      {{ entry.description }}
    </p>

    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
      Enviado el {{ formatDate(entry.createdAt) }}
    </p>

    <p
      v-if="entry.rejectionReason"
      class="mt-2 rounded-md bg-red-50 px-2.5 py-2 text-xs leading-relaxed text-red-800 dark:bg-red-900/20 dark:text-red-200"
    >
      <span class="font-semibold">Motivo del rechazo:</span>
      {{ entry.rejectionReason }}
    </p>
    <p
      v-if="entry.status === 'done'"
      class="mt-2 text-xs leading-relaxed text-green-700 dark:text-green-300"
    >
      <i class="fa-solid fa-code-branch mr-1" aria-hidden="true"></i>
      <template v-if="entry.versionItem">
        Incluido en Versiones: {{ entry.versionItem.description }}
      </template>
      <template v-else>Resuelto como mejora interna</template>
    </p>
  </article>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { feedbackCategoryLabel, type FeedbackEntry } from "../../types/feedback";

const props = defineProps<{ entry: FeedbackEntry }>();

const typeLabel = computed(() => (props.entry.type === "bug" ? "Bug" : "Sugerencia"));
const typeIcon = computed(() =>
  props.entry.type === "bug" ? "fa-solid fa-bug" : "fa-solid fa-lightbulb"
);
const typeClass = computed(() =>
  props.entry.type === "bug"
    ? "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300"
    : "bg-blue-100 text-rv-blue dark:bg-blue-900/50 dark:text-blue-300"
);

const statusLabels: Record<FeedbackEntry["status"], string> = {
  in_progress: "Pendiente",
  done: "Resuelto",
  rejected: "Rechazado",
};
const statusClasses: Record<FeedbackEntry["status"], string> = {
  in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  done: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};
const statusLabel = computed(() => statusLabels[props.entry.status]);
const statusClass = computed(() => statusClasses[props.entry.status]);

function formatDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
</script>
