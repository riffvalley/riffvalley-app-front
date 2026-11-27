<script setup lang="ts">
import { computed, nextTick, onUnmounted, reactive, ref, watch } from "vue";
import { useQueryClient } from "@tanstack/vue-query";
import {
  useAdminFeedbackQuery,
  useCurrentFeedbackVersionItemsQuery,
  useFeedbackMutations,
} from "../../application/useFeedback";
import type {
  CreateFeedbackDto,
  FeedbackCategoryId,
  FeedbackCategoryFilter,
  FeedbackEntry,
  FeedbackListResponse,
  FeedbackPriority,
  FeedbackStatus,
  FeedbackType,
} from "../../types/feedback";
import { feedbackCategories } from "../../types/feedback";
import { useSupportStore } from "@stores/support/support";
import FeedbackFormModal from "../components/FeedbackFormModal.vue";
import FeedbackManagementCard from "../components/FeedbackManagementCard.vue";
import { feedbackErrorMessage } from "../../application/feedbackErrorMessage";
import SwalService from "@services/swal/SwalService";

defineOptions({ name: "FeedbackManagementView" });

type TypeFilter = FeedbackType | "all";
type StatusFilter = FeedbackStatus | "all";
type CategoryFilter = FeedbackCategoryFilter | "all";
type SortMode = "priority" | "newest" | "oldest";
type EditField = "category" | "priority";

const queryClient = useQueryClient();
const supportStore = useSupportStore();
const activeType = ref<TypeFilter>("all");
const activeStatus = ref<StatusFilter>("in_progress");
const activeCategory = ref<CategoryFilter>("all");
const activePriority = ref<FeedbackPriority | "all">("all");
const sortMode = ref<SortMode>("priority");
const query = useAdminFeedbackQuery(activeType, activeStatus, activeCategory);
const mutations = useFeedbackMutations();
const serverResponse = computed(() => query.data.value);
const entries = computed(() => serverResponse.value?.data ?? []);
const counts = computed(
  () => serverResponse.value?.counts ?? { in_progress: 0, done: 0, rejected: 0 }
);
const visibleEntries = computed(() => {
  const filtered = entries.value.filter(
    (entry) => activePriority.value === "all" || entry.priority === activePriority.value
  );
  return [...filtered].sort((a, b) => {
    const dateDifference = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    const stableDateDifference = Number.isNaN(dateDifference) ? 0 : dateDifference;
    if (sortMode.value === "newest") return stableDateDifference || a.id.localeCompare(b.id);
    if (sortMode.value === "oldest") return -stableDateDifference || a.id.localeCompare(b.id);
    const priorityRank: Record<FeedbackPriority, number> = { high: 0, medium: 1, low: 2 };
    return (
      priorityRank[a.priority] - priorityRank[b.priority] ||
      stableDateDifference ||
      a.id.localeCompare(b.id)
    );
  });
});
const isInitialLoading = computed(() => query.isPending.value && !serverResponse.value);
const isError = computed(() => query.isError.value);
const retry = () => query.refetch();

const createModalOpen = ref(false);
const createError = ref("");
const createSaving = computed(() => mutations.create.isPending.value);
const rejectSaving = computed(() => mutations.reject.isPending.value);
const doneSaving = computed(() => mutations.complete.isPending.value);
const rejectModal = reactive({ show: false, entry: null as FeedbackEntry | null, reason: "" });
const doneModal = reactive({
  show: false,
  entry: null as FeedbackEntry | null,
  versionItemId: "",
  internal: false,
});
const versionItemsQuery = useCurrentFeedbackVersionItemsQuery(
  () => doneModal.show && !doneModal.internal
);
const versionItems = computed(() => versionItemsQuery.data.value ?? []);
const retryVersionItems = () => versionItemsQuery.refetch();
const editModal = reactive({
  show: false,
  entry: null as FeedbackEntry | null,
  field: "category" as EditField,
  value: "",
});
const editSaving = computed(() => mutations.update.isPending.value);
const activeAdminDialog = ref<HTMLElement | null>(null);
const previousAdminDialogFocus = ref<HTMLElement | null>(null);
const adminDialogOpen = computed(() => rejectModal.show || doneModal.show || editModal.show);
const adminDialogFocusableSelector =
  'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

watch(adminDialogOpen, async (open) => {
  if (!open) {
    activeAdminDialog.value?.removeEventListener("keydown", handleAdminDialogKeydown);
    await nextTick();
    previousAdminDialogFocus.value?.focus();
    previousAdminDialogFocus.value = null;
    return;
  }

  previousAdminDialogFocus.value =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  await nextTick();
  const initialFocus = activeAdminDialog.value?.querySelector<HTMLElement>(
    adminDialogFocusableSelector
  );
  (initialFocus ?? activeAdminDialog.value)?.focus();
  activeAdminDialog.value?.addEventListener("keydown", handleAdminDialogKeydown);
});

onUnmounted(() =>
  activeAdminDialog.value?.removeEventListener("keydown", handleAdminDialogKeydown)
);

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "in_progress", label: "Pendientes" },
  { value: "done", label: "Resueltos" },
  { value: "rejected", label: "Rechazados" },
];
const typeOptions: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "Todos los tipos" },
  { value: "suggestion", label: "Sugerencias" },
  { value: "bug", label: "Bugs" },
];
const priorityOptions: { value: FeedbackPriority | "all"; label: string }[] = [
  { value: "all", label: "Todas las prioridades" },
  { value: "high", label: "Alta" },
  { value: "medium", label: "Media" },
  { value: "low", label: "Baja" },
];
const sortOptions: { value: SortMode; label: string }[] = [
  { value: "priority", label: "Prioridad" },
  { value: "newest", label: "Más recientes" },
  { value: "oldest", label: "Más antiguas" },
];
const hasCustomFilters = computed(
  () =>
    activeType.value !== "all" ||
    activeStatus.value !== "in_progress" ||
    activeCategory.value !== "all" ||
    activePriority.value !== "all" ||
    sortMode.value !== "priority"
);

function countByStatus(status: FeedbackStatus | "all") {
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

function setStatusFilter(status: StatusFilter) {
  activeStatus.value = status;
}

function closeAdminDialog() {
  rejectModal.show = false;
  doneModal.show = false;
  editModal.show = false;
}

function handleAdminDialogKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    closeAdminDialog();
    return;
  }
  if (event.key !== "Tab" || !activeAdminDialog.value) return;

  const focusable = Array.from(
    activeAdminDialog.value.querySelectorAll<HTMLElement>(adminDialogFocusableSelector)
  );
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!first || !last) {
    event.preventDefault();
    activeAdminDialog.value.focus();
  } else if (
    event.shiftKey &&
    (document.activeElement === first || !activeAdminDialog.value.contains(document.activeElement))
  ) {
    event.preventDefault();
    last.focus();
  } else if (
    !event.shiftKey &&
    (document.activeElement === last || !activeAdminDialog.value.contains(document.activeElement))
  ) {
    event.preventDefault();
    first.focus();
  }
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

function resetFilters() {
  activeType.value = "all";
  activeStatus.value = "in_progress";
  activeCategory.value = "all";
  activePriority.value = "all";
  sortMode.value = "priority";
}

function openCreateModal() {
  createError.value = "";
  createModalOpen.value = true;
}

function closeCreateModal() {
  if (createSaving.value) return;
  createModalOpen.value = false;
  createError.value = "";
}

async function handleCreate(dto: CreateFeedbackDto) {
  if (createSaving.value) return;
  createError.value = "";
  try {
    await mutations.create.mutateAsync(dto);
    createModalOpen.value = false;
    SwalService.success("Enviado correctamente");
  } catch (error: unknown) {
    createError.value = feedbackErrorMessage(error, "Error al enviar la solicitud");
  }
}

function openRejectModal(entry: FeedbackEntry) {
  rejectModal.entry = entry;
  rejectModal.reason = "";
  rejectModal.show = true;
}

async function handleReject() {
  if (!rejectModal.entry || !rejectModal.reason.trim() || rejectSaving.value) return;
  try {
    await mutations.reject.mutateAsync({
      id: rejectModal.entry.id,
      rejectionReason: rejectModal.reason.trim(),
    });
    rejectModal.show = false;
    SwalService.success("Aportación rechazada");
  } catch {
    SwalService.error("No se pudo rechazar la aportación");
  }
}

function openDoneModal(entry: FeedbackEntry) {
  doneModal.entry = entry;
  doneModal.versionItemId = "";
  doneModal.internal = false;
  doneModal.show = true;
}

async function handleDone() {
  const { entry, internal, versionItemId } = doneModal;
  if (!entry || (!internal && !versionItemId) || doneSaving.value) return;
  try {
    await mutations.complete.mutateAsync({
      id: entry.id,
      versionItemId: internal ? undefined : versionItemId,
    });
    doneModal.show = false;
    SwalService.success("Aportación resuelta");
  } catch {
    SwalService.error("No se pudo resolver la aportación");
  }
}

function openEditModal(entry: FeedbackEntry, field: EditField) {
  editModal.entry = entry;
  editModal.field = field;
  editModal.value = field === "category" ? (entry.category ?? "uncategorized") : entry.priority;
  editModal.show = true;
}

async function saveEdit() {
  const { entry, field, value } = editModal;
  if (!entry || !value || editSaving.value) return;
  const dto =
    field === "category"
      ? { category: value === "uncategorized" ? null : (value as FeedbackCategoryId) }
      : { priority: value as FeedbackPriority };
  const key = query.queryKey.value;
  const previous = queryClient.getQueryData<FeedbackListResponse>(key);
  if (previous) {
    queryClient.setQueryData<FeedbackListResponse>(key, {
      ...previous,
      data: previous.data.map((item) => (item.id === entry.id ? { ...item, ...dto } : item)),
    });
  }
  try {
    await mutations.update.mutateAsync({ id: entry.id, dto });
    editModal.show = false;
    SwalService.success(field === "category" ? "Categoría actualizada" : "Prioridad actualizada");
  } catch {
    if (previous) queryClient.setQueryData(key, previous);
    SwalService.error(
      field === "category" ? "No se pudo cambiar la categoría" : "No se pudo cambiar la prioridad"
    );
  }
}

function handleMarkAsRead(entry: FeedbackEntry) {
  supportStore.markAsRead(entry.id);
}

async function handleReopen(entry: FeedbackEntry) {
  try {
    await mutations.reopen.mutateAsync(entry.id);
    SwalService.success("Aportación reabierta");
  } catch {
    SwalService.error("No se pudo reabrir la aportación");
  }
}

async function handleDelete(entry: FeedbackEntry) {
  const result = await SwalService.confirm(
    "¿Eliminar esta aportación?",
    "Esta acción no se puede deshacer.",
    "Sí, eliminar",
    "Cancelar"
  );
  if (!result.isConfirmed) return;
  try {
    await mutations.remove.mutateAsync(entry.id);
    SwalService.success("Aportación eliminada");
  } catch {
    SwalService.error("No se pudo eliminar la aportación");
  }
}
</script>

<template>
  <main class="p-4 md:p-6">
    <div class="mx-auto max-w-5xl space-y-5">
      <header class="border-b border-gray-200 pb-4 text-left dark:border-white/10">
        <h1 class="text-2xl font-extrabold tracking-tight text-rv-navy dark:text-white sm:text-3xl">
          Soporte
        </h1>
      </header>

      <FeedbackFormModal
        :open="createModalOpen"
        :submitting="createSaving"
        :error-message="createError"
        @close="closeCreateModal"
        @submit="handleCreate"
      />

      <section aria-labelledby="feedback-management-title" class="space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="feedback-management-title"
            class="text-base font-bold text-gray-900 dark:text-white"
          >
            Aportaciones
          </h2>
          <button
            type="button"
            class="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-rv-navy px-3.5 py-2 text-sm font-semibold text-white hover:bg-rv-navy/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink focus-visible:ring-offset-2 dark:bg-rv-purple dark:focus-visible:ring-offset-rv-darkBg"
            @click="openCreateModal"
          >
            <i class="fa-solid fa-plus" aria-hidden="true"></i>Nueva aportación
          </button>
        </div>

        <div
          v-if="serverResponse"
          class="flex flex-wrap gap-2"
          role="group"
          aria-label="Filtrar aportaciones por estado"
        >
          <button
            v-for="option in statusOptions"
            :key="option.value"
            type="button"
            :aria-pressed="activeStatus === option.value"
            :class="statusPillClass(option.value)"
            class="rounded-lg px-2.5 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink focus-visible:ring-offset-2 dark:focus-visible:ring-offset-rv-darkBg"
            @click="setStatusFilter(option.value)"
          >
            {{ statusPillLabel(option.value) }}
            <span class="tabular-nums">({{ countByStatus(option.value) }})</span>
          </button>
        </div>

        <div
          class="grid grid-cols-1 gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-rv-darkSurface sm:grid-cols-2 xl:grid-cols-4"
        >
          <label
            for="feedback-filter-type"
            class="min-w-0 text-xs font-semibold text-gray-700 dark:text-gray-300"
            >Tipo
            <select
              id="feedback-filter-type"
              v-model="activeType"
              class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm font-normal text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:border-white/20 dark:bg-rv-darkCard dark:text-white"
            >
              <option v-for="option in typeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <label
            for="feedback-filter-category"
            class="min-w-0 text-xs font-semibold text-gray-700 dark:text-gray-300"
            >Apartado
            <select
              id="feedback-filter-category"
              v-model="activeCategory"
              class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm font-normal text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:border-white/20 dark:bg-rv-darkCard dark:text-white"
            >
              <option value="all">Todas las categorías</option>
              <option
                v-for="category in feedbackCategories"
                :key="category.id"
                :value="category.id"
              >
                {{ category.label }}
              </option>
              <option value="uncategorized">Sin categorizar</option>
            </select>
          </label>
          <label
            for="feedback-filter-priority"
            class="min-w-0 text-xs font-semibold text-gray-700 dark:text-gray-300"
            >Prioridad
            <select
              id="feedback-filter-priority"
              v-model="activePriority"
              class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm font-normal text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:border-white/20 dark:bg-rv-darkCard dark:text-white"
            >
              <option v-for="option in priorityOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <label
            for="feedback-filter-sort"
            class="min-w-0 text-xs font-semibold text-gray-700 dark:text-gray-300"
            >Orden
            <select
              id="feedback-filter-sort"
              v-model="sortMode"
              class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm font-normal text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:border-white/20 dark:bg-rv-darkCard dark:text-white"
            >
              <option v-for="option in sortOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <button
            v-if="hasCustomFilters"
            type="button"
            class="self-end justify-self-start rounded-lg px-2.5 py-2 text-xs font-semibold text-rv-navy underline underline-offset-2 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:text-white dark:hover:bg-white/10 xl:col-start-4"
            @click="resetFilters"
          >
            Restablecer filtros
          </button>
        </div>

        <div
          v-if="isInitialLoading"
          role="status"
          class="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-5 text-sm text-gray-600 dark:bg-rv-darkSurface dark:text-gray-300"
        >
          <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>Cargando aportaciones...
        </div>
        <div
          v-else-if="isError"
          role="alert"
          class="rounded-xl bg-red-50 px-4 py-4 dark:bg-red-900/20"
        >
          <p class="text-sm text-red-700 dark:text-red-300">
            No se pudieron cargar las aportaciones.
          </p>
          <button
            type="button"
            class="mt-2 text-sm font-semibold text-red-700 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:text-red-300"
            @click="retry"
          >
            Reintentar
          </button>
        </div>
        <div
          v-else-if="visibleEntries.length === 0"
          class="rounded-xl bg-gray-50 px-4 py-5 dark:bg-rv-darkSurface"
        >
          <p class="text-sm font-semibold text-gray-900 dark:text-white">Sin resultados</p>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            No hay aportaciones que coincidan con los filtros seleccionados.
          </p>
        </div>
        <ul v-else class="space-y-2">
          <li v-for="entry in visibleEntries" :key="entry.id">
            <FeedbackManagementCard
              :entry="entry"
              :is-read="supportStore.isRead(entry.id)"
              @resolve="openDoneModal"
              @reject="openRejectModal"
              @reopen="handleReopen"
              @mark-read="handleMarkAsRead"
              @edit="openEditModal"
              @remove="handleDelete"
            />
          </li>
        </ul>
      </section>

      <Teleport to="body">
        <div
          v-if="rejectModal.show"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3"
          role="presentation"
          @click.self="rejectModal.show = false"
          @keydown.esc="rejectModal.show = false"
        >
          <section
            ref="activeAdminDialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-reject-title"
            tabindex="-1"
            class="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-rv-darkCard"
          >
            <h2 id="feedback-reject-title" class="text-lg font-bold text-gray-900 dark:text-white">
              Rechazar aportación
            </h2>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {{ rejectModal.entry?.title }}
            </p>
            <label
              for="feedback-reject-reason"
              class="mt-4 block text-sm font-semibold text-gray-800 dark:text-gray-200"
              >Motivo del rechazo
              <textarea
                id="feedback-reject-reason"
                v-model="rejectModal.reason"
                rows="3"
                maxlength="500"
                class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
              ></textarea>
            </label>
            <div class="mt-4 flex justify-end gap-2">
              <button
                type="button"
                class="rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:text-gray-200 dark:hover:bg-white/10"
                @click="rejectModal.show = false"
              >
                Cancelar
              </button>
              <button
                type="button"
                :disabled="rejectSaving || !rejectModal.reason.trim()"
                class="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink"
                @click="handleReject"
              >
                {{ rejectSaving ? "Guardando..." : "Rechazar" }}
              </button>
            </div>
          </section>
        </div>

        <div
          v-if="doneModal.show"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3"
          role="presentation"
          @click.self="doneModal.show = false"
          @keydown.esc="doneModal.show = false"
        >
          <section
            ref="activeAdminDialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-resolve-title"
            tabindex="-1"
            class="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-rv-darkCard"
          >
            <h2 id="feedback-resolve-title" class="text-lg font-bold text-gray-900 dark:text-white">
              Resolver aportación
            </h2>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {{ doneModal.entry?.title }}
            </p>
            <label
              for="feedback-internal-done"
              class="mt-4 flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200"
            >
              <input
                id="feedback-internal-done"
                v-model="doneModal.internal"
                type="checkbox"
                class="rounded border-gray-300 text-rv-pink focus:ring-rv-pink"
              />
              Mejora interna (sin vincular a Versiones)
            </label>
            <div v-if="!doneModal.internal" class="mt-3">
              <div
                v-if="versionItemsQuery.isPending.value"
                role="status"
                class="py-3 text-sm text-gray-600 dark:text-gray-300"
              >
                Cargando elementos de Versiones...
              </div>
              <div
                v-else-if="versionItemsQuery.isError.value"
                role="alert"
                class="text-sm text-red-700 dark:text-red-300"
              >
                No se pudieron cargar los elementos.
                <button type="button" class="underline" @click="retryVersionItems">
                  Reintentar
                </button>
              </div>
              <label
                v-else
                for="feedback-version-item"
                class="block text-sm font-semibold text-gray-800 dark:text-gray-200"
                >Elemento de Versiones
                <select
                  id="feedback-version-item"
                  v-model="doneModal.versionItemId"
                  class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
                >
                  <option value="">Selecciona un elemento</option>
                  <option v-for="item in versionItems" :key="item.id" :value="item.id">
                    [{{ item.type }}] {{ item.description }}
                  </option>
                </select>
              </label>
            </div>
            <div class="mt-4 flex justify-end gap-2">
              <button
                type="button"
                class="rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:text-gray-200 dark:hover:bg-white/10"
                @click="doneModal.show = false"
              >
                Cancelar
              </button>
              <button
                type="button"
                :disabled="doneSaving || (!doneModal.internal && !doneModal.versionItemId)"
                class="rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink"
                @click="handleDone"
              >
                {{ doneSaving ? "Guardando..." : "Confirmar resolución" }}
              </button>
            </div>
          </section>
        </div>

        <div
          v-if="editModal.show"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3"
          role="presentation"
          @click.self="editModal.show = false"
          @keydown.esc="editModal.show = false"
        >
          <section
            ref="activeAdminDialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-edit-title"
            tabindex="-1"
            class="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-rv-darkCard"
          >
            <h2 id="feedback-edit-title" class="text-lg font-bold text-gray-900 dark:text-white">
              Cambiar {{ editModal.field === "category" ? "categoría" : "prioridad" }}
            </h2>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {{ editModal.entry?.title }}
            </p>
            <label
              for="feedback-edit-value"
              class="mt-4 block text-sm font-semibold text-gray-800 dark:text-gray-200"
              >{{ editModal.field === "category" ? "Apartado" : "Prioridad" }}
              <select
                id="feedback-edit-value"
                v-model="editModal.value"
                class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
              >
                <template v-if="editModal.field === 'category'">
                  <option
                    v-for="category in feedbackCategories"
                    :key="category.id"
                    :value="category.id"
                  >
                    {{ category.label }}
                  </option>
                  <option value="uncategorized">Sin categorizar</option>
                </template>
                <template v-else>
                  <option value="high">Alta</option>
                  <option value="medium">Media</option>
                  <option value="low">Baja</option>
                </template>
              </select>
            </label>
            <div class="mt-4 flex justify-end gap-2">
              <button
                type="button"
                class="rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:text-gray-200 dark:hover:bg-white/10"
                @click="editModal.show = false"
              >
                Cancelar
              </button>
              <button
                type="button"
                :disabled="editSaving"
                class="rounded-lg bg-rv-navy px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:bg-rv-purple"
                @click="saveEdit"
              >
                {{ editSaving ? "Guardando..." : "Guardar" }}
              </button>
            </div>
          </section>
        </div>
      </Teleport>
    </div>
  </main>
</template>
