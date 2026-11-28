<template>
  <main class="p-4 md:p-6">
    <div class="mx-auto max-w-3xl space-y-5">
      <!-- Misma cabecera que el resto de secciones: centrada, con icono y subtítulo gris. -->
      <header class="mb-8 text-center">
        <div>
          <h1
            class="mb-2 text-2xl font-extrabold tracking-tight text-rv-navy dark:text-white sm:text-3xl"
          >
            <i class="fa-solid fa-bug mr-3" aria-hidden="true"></i>Sugerencias y bugs
          </h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Ayúdanos a mejorar Riff Valley compartiendo tus ideas o comunicando errores
          </p>
        </div>
      </header>

      <FeedbackFormModal
        :open="submitModalOpen"
        :submitting="submitting"
        :error-message="submitError"
        @close="closeSubmitModal"
        @submit="handleSubmit"
      />

      <section aria-labelledby="feedback-history-title">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex min-w-0 items-baseline gap-2">
            <h2
              id="feedback-history-title"
              class="text-base font-bold text-gray-900 dark:text-white"
            >
              Mis aportaciones
            </h2>
            <span v-if="query.data.value" class="text-xs text-gray-500 dark:text-gray-400">
              {{ suggestions.length }}
              {{ suggestions.length === 1 ? "aportación" : "aportaciones" }}
            </span>
          </div>
          <button
            type="button"
            class="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-rv-navy px-3.5 py-2 text-sm font-semibold text-white hover:bg-rv-navy/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink focus-visible:ring-offset-2 dark:bg-rv-purple dark:focus-visible:ring-offset-rv-darkBg"
            @click="openSubmitModal"
          >
            <i class="fa-solid fa-plus" aria-hidden="true"></i>
            Nueva aportación
          </button>
        </div>

        <section
          v-if="query.data.value"
          aria-label="Resumen de aportaciones"
          class="mt-2 flex flex-wrap gap-2"
        >
          <div
            class="flex flex-wrap gap-2"
            role="group"
            aria-label="Filtrar mis aportaciones por estado"
          >
            <button
              v-for="option in statusOptions"
              :key="option.value"
              type="button"
              :aria-pressed="activeStatus === option.value"
              :class="statusPillClass(option.value)"
              class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink focus-visible:ring-offset-2 dark:focus-visible:ring-offset-rv-darkBg"
              @click="activeStatus = option.value"
            >
              {{ statusPillLabel(option.value) }}
              <span class="tabular-nums">({{ countByStatus(option.value) }})</span>
            </button>
          </div>
        </section>

        <div
          v-if="isInitialLoading"
          role="status"
          class="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-5 text-sm text-gray-600 dark:bg-rv-darkSurface dark:text-gray-300"
        >
          <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
          Cargando tus aportaciones...
        </div>

        <div v-else-if="isError" class="rounded-xl bg-red-50 px-4 py-4 dark:bg-red-900/20">
          <p class="text-sm text-red-700 dark:text-red-300">
            No se pudieron cargar tus aportaciones.
          </p>
          <button
            type="button"
            class="mt-2 text-sm font-semibold text-red-700 underline decoration-red-300 underline-offset-2 hover:text-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:text-red-300 dark:hover:text-red-200"
            @click="retry"
          >
            Reintentar
          </button>
        </div>

        <div
          v-else-if="suggestions.length === 0"
          class="rounded-xl bg-gray-50 px-4 py-5 dark:bg-rv-darkSurface"
        >
          <p class="text-sm font-semibold text-gray-900 dark:text-white">
            Sin aportaciones todavía
          </p>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Cuando envíes una sugerencia o un bug, aparecerá aquí.
          </p>
        </div>

        <ul v-else class="mt-3 space-y-2">
          <li v-for="entry in suggestions" :key="entry.id">
            <FeedbackHistoryCard :entry="entry" />
          </li>
        </ul>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef } from "vue";
import { useMyFeedbackQuery, useFeedbackMutations } from "../../application/useFeedback";
import { feedbackErrorMessage } from "../../application/feedbackErrorMessage";
import type { FeedbackStatus } from "../../types/feedback";
import FeedbackFormModal from "../components/FeedbackFormModal.vue";
import FeedbackHistoryCard from "../components/FeedbackHistoryCard.vue";
import type { CreateFeedbackDto } from "../../types/feedback";
import SwalService from "@services/swal/SwalService";

defineOptions({ name: "FeedbackView" });

type StatusFilter = FeedbackStatus | "all";

const activeStatus = shallowRef<StatusFilter>("all");
const query = useMyFeedbackQuery("all", activeStatus);
const mutations = useFeedbackMutations();
const suggestions = computed(() => query.data.value?.data ?? []);
const counts = computed(() => query.data.value?.counts ?? { in_progress: 0, done: 0, rejected: 0 });
const isInitialLoading = computed(() => query.isPending.value && !query.data.value);
const isError = computed(() => query.isError.value);
const retry = () => query.refetch();
const submitting = computed(() => mutations.create.isPending.value);
const submitModalOpen = ref(false);
const submitError = ref("");

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "in_progress", label: "Pendientes" },
  { value: "done", label: "Resueltos" },
  { value: "rejected", label: "Rechazados" },
];

function countByStatus(status: StatusFilter) {
  return status === "all"
    ? counts.value.in_progress + counts.value.done + counts.value.rejected
    : counts.value[status];
}

function statusPillLabel(status: StatusFilter) {
  if (status === "all") return "Todas";
  const labels: Record<FeedbackStatus, [singular: string, plural: string]> = {
    in_progress: ["Pendiente", "Pendientes"],
    done: ["Resuelto", "Resueltos"],
    rejected: ["Rechazado", "Rechazados"],
  };
  return labels[status][counts.value[status] === 1 ? 0 : 1];
}

function statusPillClass(status: StatusFilter) {
  if (status === "all") {
    return activeStatus.value === status
      ? "bg-rv-navy text-white dark:bg-rv-purple"
      : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-rv-darkSurface dark:text-gray-200 dark:hover:bg-white/10";
  }
  const palettes: Record<FeedbackStatus, { selected: string; idle: string }> = {
    in_progress: {
      selected:
        "bg-yellow-600 text-white hover:bg-yellow-700 dark:bg-yellow-700 dark:hover:bg-yellow-600",
      idle: "bg-yellow-100 text-yellow-900 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-200 dark:hover:bg-yellow-900/50",
    },
    done: {
      selected:
        "bg-green-700 text-white hover:bg-green-800 dark:bg-green-700 dark:hover:bg-green-600",
      idle: "bg-green-100 text-green-900 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-200 dark:hover:bg-green-900/50",
    },
    rejected: {
      selected: "bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600",
      idle: "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-900/50",
    },
  };
  const palette = palettes[status];
  return activeStatus.value === status ? palette.selected : palette.idle;
}

function openSubmitModal() {
  submitError.value = "";
  submitModalOpen.value = true;
}

function closeSubmitModal() {
  if (submitting.value) return;
  submitModalOpen.value = false;
  submitError.value = "";
}

async function handleSubmit(dto: CreateFeedbackDto) {
  if (submitting.value) return;
  submitError.value = "";
  try {
    await mutations.create.mutateAsync(dto);
    submitModalOpen.value = false;
    SwalService.success("Enviado correctamente");
  } catch (error: unknown) {
    submitError.value = feedbackErrorMessage(error, "Error al enviar la solicitud");
  }
}
</script>
