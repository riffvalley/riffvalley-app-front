<script setup lang="ts">
import { computed } from "vue";
import { feedbackCategoryLabel, type FeedbackEntry } from "../../types/feedback";

const props = defineProps<{ entry: FeedbackEntry; isRead: boolean }>();
const emit = defineEmits<{
  resolve: [entry: FeedbackEntry];
  reject: [entry: FeedbackEntry];
  reopen: [entry: FeedbackEntry];
  markRead: [entry: FeedbackEntry];
  edit: [entry: FeedbackEntry, field: "category" | "priority"];
  remove: [entry: FeedbackEntry];
}>();

const statusLabel = computed(
  () =>
    ({
      in_progress: "Pendiente",
      done: "Resuelto",
      rejected: "Rechazado",
    })[props.entry.status]
);
const statusClass = computed(
  () =>
    ({
      in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      done: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    })[props.entry.status]
);
const typeClass = computed(() =>
  props.entry.type === "bug"
    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
    : "bg-blue-100 text-rv-blue dark:bg-blue-900/30 dark:text-blue-300"
);
const priorityLabel = computed(
  () => ({ low: "Baja", medium: "Media", high: "Alta" })[props.entry.priority]
);
const priorityClass = computed(
  () =>
    ({
      low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
      high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    })[props.entry.priority]
);

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
</script>

<template>
  <article
    class="rounded-xl border border-gray-200 bg-white p-3 text-left dark:border-white/10 dark:bg-rv-darkCard"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex min-w-0 items-center gap-2">
        <img
          v-if="entry.user?.image"
          :src="entry.user.image"
          :alt="entry.user.username ? `Avatar de ${entry.user.username}` : 'Avatar de usuario'"
          class="h-8 w-8 shrink-0 rounded-full object-cover"
        />
        <span
          v-else
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-300"
          aria-hidden="true"
        >
          <i class="fa-solid fa-user text-xs"></i>
        </span>
        <div class="min-w-0">
          <p class="truncate text-xs font-semibold text-gray-800 dark:text-gray-100">
            {{ entry.user?.username || "Usuario eliminado" }}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400">{{ formatDate(entry.createdAt) }}</p>
        </div>
      </div>
      <span :class="statusClass" class="shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold">{{
        statusLabel
      }}</span>
    </div>

    <div class="mt-2 flex flex-wrap items-center gap-1.5">
      <span
        :class="typeClass"
        class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold"
      >
        <i
          :class="entry.type === 'bug' ? 'fa-solid fa-bug' : 'fa-solid fa-lightbulb'"
          aria-hidden="true"
        ></i>
        {{ entry.type === "bug" ? "Bug" : "Sugerencia" }}
      </span>
      <span
        class="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-white/10 dark:text-gray-300"
        >{{ feedbackCategoryLabel(entry.category) }}</span
      >
      <span :class="priorityClass" class="rounded-md px-2 py-0.5 text-xs font-semibold"
        >Prioridad {{ priorityLabel }}</span
      >
    </div>

    <h3 class="mt-2 break-words text-sm font-bold leading-5 text-gray-900 dark:text-white">
      {{ entry.title }}
    </h3>
    <p
      class="mt-0.5 whitespace-pre-line break-words text-sm leading-5 text-gray-600 dark:text-gray-300"
    >
      {{ entry.description }}
    </p>

    <p
      v-if="entry.rejectionReason"
      class="mt-2 rounded-md bg-red-50 px-2.5 py-2 text-xs leading-relaxed text-red-800 dark:bg-red-900/20 dark:text-red-200"
    >
      <span class="font-semibold">Motivo del rechazo:</span> {{ entry.rejectionReason }}
    </p>
    <p
      v-if="entry.status === 'done'"
      class="mt-2 text-xs leading-relaxed text-green-700 dark:text-green-300"
    >
      <i class="fa-solid fa-code-branch mr-1" aria-hidden="true"></i>
      <template v-if="entry.versionItem"
        >Incluido en Versiones: {{ entry.versionItem.description }}</template
      >
      <template v-else>Resuelto como mejora interna</template>
    </p>

    <div class="mt-3 flex flex-wrap items-center gap-2">
      <button
        v-if="entry.status === 'in_progress'"
        type="button"
        class="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-800 hover:bg-green-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50"
        @click="emit('resolve', entry)"
      >
        <i class="fa-solid fa-check mr-1" aria-hidden="true"></i>Resolver
      </button>
      <button
        v-if="entry.status === 'in_progress'"
        type="button"
        class="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
        @click="emit('reject', entry)"
      >
        <i class="fa-solid fa-xmark mr-1" aria-hidden="true"></i>Rechazar
      </button>
      <button
        v-if="entry.status === 'rejected'"
        type="button"
        class="rounded-lg bg-yellow-100 px-3 py-1.5 text-xs font-semibold text-yellow-900 hover:bg-yellow-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:bg-yellow-900/30 dark:text-yellow-200 dark:hover:bg-yellow-900/50"
        @click="emit('reopen', entry)"
      >
        <i class="fa-solid fa-rotate-left mr-1" aria-hidden="true"></i>Reabrir
      </button>

      <details class="relative ml-auto">
        <summary
          class="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:text-gray-300 dark:hover:bg-white/10"
          aria-label="Más acciones"
        >
          <i class="fa-solid fa-ellipsis" aria-hidden="true"></i>
        </summary>
        <div
          class="absolute right-0 z-10 mt-1 w-48 rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-white/10 dark:bg-rv-darkSurface"
        >
          <button
            type="button"
            class="w-full rounded-md px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:text-gray-200 dark:hover:bg-white/10"
            @click="emit('edit', entry, 'category')"
          >
            Cambiar categoría
          </button>
          <button
            type="button"
            class="w-full rounded-md px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:text-gray-200 dark:hover:bg-white/10"
            @click="emit('edit', entry, 'priority')"
          >
            Cambiar prioridad
          </button>
          <button
            v-if="entry.status === 'in_progress' && !isRead"
            type="button"
            class="w-full rounded-md px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:text-gray-200 dark:hover:bg-white/10"
            @click="emit('markRead', entry)"
          >
            Marcar como leído
          </button>
          <button
            type="button"
            class="w-full rounded-md px-3 py-2 text-left text-xs text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:text-red-300 dark:hover:bg-red-900/20"
            @click="emit('remove', entry)"
          >
            Eliminar
          </button>
        </div>
      </details>
    </div>
  </article>
</template>
