<template>
  <main class="p-4 md:p-6">
    <div class="mx-auto max-w-3xl space-y-5">
      <header class="border-b border-gray-200 pb-4 text-left dark:border-white/10">
        <div>
          <h1
            class="text-2xl font-extrabold tracking-tight text-rv-navy dark:text-white sm:text-3xl"
          >
            Sugerencias y bugs
          </h1>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
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
          <span
            class="inline-flex items-center gap-1.5 rounded-lg bg-yellow-100 px-2.5 py-1.5 text-xs font-semibold text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
          >
            <i class="fa-solid fa-clock" aria-hidden="true"></i>
            {{ counts.in_progress }} pendiente{{ counts.in_progress === 1 ? "" : "s" }}
          </span>
          <span
            class="inline-flex items-center gap-1.5 rounded-lg bg-green-100 px-2.5 py-1.5 text-xs font-semibold text-green-800 dark:bg-green-900/30 dark:text-green-300"
          >
            <i class="fa-solid fa-check" aria-hidden="true"></i>
            {{ counts.done }} resuelto{{ counts.done === 1 ? "" : "s" }}
          </span>
          <span
            class="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-2.5 py-1.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300"
          >
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
            {{ counts.rejected }} rechazado{{ counts.rejected === 1 ? "" : "s" }}
          </span>
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
import { computed, ref } from "vue";
import { useMyFeedbackQuery, useFeedbackMutations } from "../../application/useFeedback";
import { feedbackErrorMessage } from "../../application/feedbackErrorMessage";
import FeedbackFormModal from "../components/FeedbackFormModal.vue";
import FeedbackHistoryCard from "../components/FeedbackHistoryCard.vue";
import type { CreateFeedbackDto } from "../../types/feedback";
import SwalService from "@services/swal/SwalService";

defineOptions({ name: "FeedbackView" });

const query = useMyFeedbackQuery();
const mutations = useFeedbackMutations();
const suggestions = computed(() => query.data.value?.data ?? []);
const counts = computed(() => query.data.value?.counts ?? { in_progress: 0, done: 0, rejected: 0 });
const isInitialLoading = computed(() => query.isPending.value && !query.data.value);
const isError = computed(() => query.isError.value);
const retry = () => query.refetch();
const submitting = computed(() => mutations.create.isPending.value);
const submitModalOpen = ref(false);
const submitError = ref("");

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
