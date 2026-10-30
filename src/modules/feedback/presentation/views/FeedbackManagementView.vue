<template>
  <div class="p-6 max-w-4xl mx-auto">

    <!-- Cabecera -->
    <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
      <div>
        <h1 class="text-2xl md:text-3xl font-bold dark:text-white">
          <i class="fa-solid fa-bug mr-2"></i>Soporte
        </h1>
        <p class="text-gray-400 dark:text-gray-500 text-sm mt-0.5">
          {{ suggestions.length }} entrada{{ suggestions.length !== 1 ? 's' : '' }} · bugs y sugerencias de los usuarios
        </p>
      </div>
      <button
        @click="openCreateModal"
        class="flex items-center gap-2 bg-gradient-to-r from-rv-pink to-rv-purple text-white px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
      >
        <i class="fa-solid fa-plus"></i>Nueva entrada
      </button>
    </div>

    <!-- Filtros -->
    <div class="bg-white dark:bg-rv-darkCard rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm p-4 mb-6 space-y-3">
      <!-- Tipo -->
      <div class="flex gap-2 flex-wrap">
        <button
          v-for="t in typeTabs"
          :key="t.value"
          @click="setFilter('type', t.value)"
          :class="activeType === t.value ? t.activeClass : 'bg-gray-100 dark:bg-rv-darkSurface text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'"
          class="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
        >
          <i :class="t.icon" class="mr-1.5"></i>{{ t.label }}
        </button>
      </div>
      <!-- Estado -->
      <div class="flex gap-2 flex-wrap">
        <button
          v-for="st in statusTabs"
          :key="st.value"
          @click="setFilter('status', st.value)"
          :class="activeStatus === st.value ? 'bg-rv-pink text-white' : 'bg-gray-100 dark:bg-rv-darkSurface text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'"
          class="px-3 py-1 rounded-full text-xs font-medium transition-colors"
        >
          {{ st.label }}
          <span class="ml-1 opacity-70">({{ countByStatus(st.value) }})</span>
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isInitialLoading" class="flex items-center justify-center gap-2 py-16 text-gray-400 dark:text-gray-500 text-sm">
      <i class="fa-solid fa-spinner fa-spin"></i>Cargando...
    </div>

    <div v-if="isError" role="alert" class="mb-4 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
      <span>No se pudieron cargar las entradas de soporte.</span>
      <button type="button" @click="retry" class="ml-2 font-semibold underline">Reintentar</button>
    </div>

    <!-- Vacío -->
    <div v-if="!isInitialLoading && !isError && suggestions.length === 0"
      class="text-center py-14 bg-white dark:bg-rv-darkCard rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
      <i class="fa-solid fa-inbox text-3xl mb-3 block text-gray-300 dark:text-gray-600"></i>
      <p class="text-sm text-gray-400 dark:text-gray-500">
        No hay {{ activeType === 'bug' ? 'bugs' : activeType === 'suggestion' ? 'sugerencias' : 'entradas' }} en este estado.
      </p>
    </div>

    <!-- Lista -->
    <ul v-if="!isInitialLoading && suggestions.length > 0" class="space-y-3">
      <li v-for="s in suggestions" :key="s.id"
        class="bg-white dark:bg-rv-darkCard rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden">

        <!-- Franja de color según tipo -->
        <div :class="s.type === 'bug' ? 'bg-red-500' : 'bg-blue-500'" class="h-1 w-full"></div>

        <div class="px-5 py-4 flex items-start gap-4">
          <!-- Avatar -->
          <img v-if="s.user?.image" :src="s.user.image" :alt="s.user?.username || 'Avatar de usuario'"
            class="w-9 h-9 rounded-full object-cover flex-shrink-0 mt-0.5 ring-2 ring-gray-100 dark:ring-white/10" />
          <div v-else
            class="w-9 h-9 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <i class="fa-solid fa-user text-gray-400 dark:text-white/30 text-sm"></i>
          </div>

          <div class="flex-1 min-w-0">
            <!-- Fila de meta: usuario + fecha -->
            <div class="flex items-center gap-1.5 mb-2">
              <span class="text-xs font-semibold text-gray-700 dark:text-gray-200">{{ s.user?.username }}</span>
              <span class="text-gray-300 dark:text-white/20 text-xs">·</span>
              <span class="text-xs text-gray-400 dark:text-gray-500">{{ formatDate(s.createdAt) }}</span>
            </div>

            <!-- Título -->
            <p class="font-semibold text-gray-800 dark:text-white mb-1.5">{{ s.title }}</p>

            <!-- Descripción -->
            <p class="text-sm text-gray-500 dark:text-gray-400 whitespace-pre-line leading-relaxed">{{ s.description }}</p>

            <!-- Chips de estado -->
            <div class="flex items-center gap-2 flex-wrap mt-3">
              <span :class="typeClass(s.type)" class="text-xs font-semibold px-2 py-0.5 rounded-full">
                <i :class="typeIcon(s.type)" class="mr-1"></i>{{ typeLabel(s.type) }}
              </span>
              <button
                type="button"
                @click="cyclePriority(s)"
                :class="priorityClass(s.priority)"
                class="text-xs font-semibold px-2 py-0.5 rounded-full hover:opacity-75 transition-opacity"
                title="Click para cambiar prioridad"
              >
                <i class="fa-solid fa-arrow-up-wide-short mr-1"></i>{{ priorityLabel(s.priority) }}
              </button>
              <span :class="statusClass(s.status)" class="text-xs font-semibold px-2 py-0.5 rounded-full">
                {{ statusLabel(s.status) }}
              </span>
            </div>

            <!-- Motivo de rechazo -->
            <div v-if="s.rejectionReason"
              class="mt-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-3 py-2 text-xs text-red-600 dark:text-red-400">
              <i class="fa-solid fa-circle-xmark mr-1.5"></i>{{ s.rejectionReason }}
            </div>

            <!-- Vinculado a versión -->
            <div v-if="s.versionItem"
              class="mt-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-xl px-3 py-2 text-xs text-green-700 dark:text-green-400">
              <i class="fa-solid fa-code-branch mr-1.5"></i>{{ s.versionItem.description }}
            </div>

            <!-- Mejora interna (hecha sin vincular a versión) -->
            <div v-else-if="s.status === 'done'"
              class="mt-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
              <i class="fa-solid fa-wrench mr-1.5"></i>Mejora interna
            </div>

            <!-- Acciones -->
            <div class="flex gap-2 mt-4 flex-wrap">
              <button v-if="s.status === 'in_progress'" @click="openDoneModal(s)"
                class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors">
                <i class="fa-solid fa-check mr-1"></i>Marcar como hecho
              </button>
              <button v-if="s.status === 'in_progress'" @click="openRejectModal(s)"
                class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">
                <i class="fa-solid fa-xmark mr-1"></i>Rechazar
              </button>
              <button v-if="s.status === 'rejected'" @click="handleProgress(s)"
                class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors">
                <i class="fa-solid fa-rotate-left mr-1"></i>Volver a pendiente
              </button>
              <button
                v-if="s.status === 'in_progress' && !supportStore.isRead(s.id)"
                @click="handleMarkAsRead(s)"
                class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                <i class="fa-solid fa-eye mr-1"></i>Marcar como leído
              </button>
              <button @click="handleDelete(s)"
                class="ml-auto text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                <i class="fa-solid fa-trash mr-1"></i>Eliminar
              </button>
            </div>
          </div>
        </div>
      </li>
    </ul>

    <!-- Modal: crear -->
    <Teleport to="body">
      <div v-if="createModal.show"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
        role="presentation" @click.self="createModal.show = false" @keydown.esc="createModal.show = false">
        <div class="bg-white dark:bg-rv-darkCard rounded-2xl shadow-xl w-full max-w-lg p-6 relative border border-gray-100 dark:border-white/10">
          <button @click="createModal.show = false"
            class="absolute top-3 right-3 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-600 dark:text-gray-300 rounded-full w-8 h-8 flex items-center justify-center text-base font-bold">&times;</button>
          <h3 class="text-lg font-bold mb-4 text-gray-900 dark:text-white">Nueva sugerencia / bug</h3>
          <form @submit.prevent="handleCreate" class="space-y-4">

            <!-- Tipo -->
            <div class="flex gap-2">
              <button type="button" v-for="t in typeOptions" :key="t.value"
                @click="createModal.form.type = t.value"
                :class="createModal.form.type === t.value ? t.activeClass : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/20'"
                class="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors">
                <i :class="t.icon" class="mr-1"></i>{{ t.label }}
              </button>
            </div>

            <!-- Prioridad -->
            <div class="flex gap-2">
              <button type="button" v-for="p in priorityOptions" :key="p.value"
                @click="createModal.form.priority = p.value"
                :class="createModal.form.priority === p.value ? p.activeClass : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/20'"
                class="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors">
                {{ p.label }}
              </button>
            </div>

            <div>
              <label for="feedback-admin-title" class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Título *
                <input id="feedback-admin-title" v-model="createModal.form.title" type="text" maxlength="200"
                :placeholder="createModal.form.type === 'bug' ? 'Describe el problema...' : 'Describe tu sugerencia...'"
                class="w-full border border-gray-200 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rv-pink" />
              </label>
            </div>

            <div>
              <label for="feedback-admin-description" class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Descripción *
                <textarea id="feedback-admin-description" v-model="createModal.form.description" rows="4"
                :placeholder="createModal.form.type === 'bug' ? 'Explica el problema con detalle...' : 'Explica tu idea con detalle...'"
                class="w-full border border-gray-200 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rv-pink resize-none"></textarea>
              </label>
            </div>

            <button type="submit" :disabled="createSaving || !createModal.form.title.trim() || !createModal.form.description.trim()"
              class="w-full bg-rv-navy dark:bg-rv-purple text-white py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40">
              {{ createSaving ? 'Guardando...' : 'Crear' }}
            </button>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Modal: rechazar -->
    <Teleport to="body">
      <div v-if="rejectModal.show"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
        role="presentation" @click.self="rejectModal.show = false" @keydown.esc="rejectModal.show = false">
        <div class="bg-white dark:bg-rv-darkCard rounded-2xl shadow-xl w-full max-w-md p-6 relative border border-gray-100 dark:border-white/10">
          <button @click="rejectModal.show = false"
            class="absolute top-3 right-3 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-600 dark:text-gray-300 rounded-full w-8 h-8 flex items-center justify-center text-base font-bold">&times;</button>
          <h3 class="text-lg font-bold mb-1 text-gray-900 dark:text-white">Rechazar</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">{{ rejectModal.suggestion?.title }}</p>
          <label for="feedback-reject-reason" class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Motivo *
            <textarea id="feedback-reject-reason" v-model="rejectModal.reason" rows="3" maxlength="500" placeholder="Explica por qué se rechaza..."
            class="w-full border border-gray-200 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rv-pink resize-none mb-4"></textarea>
          </label>
          <button @click="handleReject" :disabled="rejectSaving || !rejectModal.reason.trim()"
            class="w-full bg-red-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40">
            {{ rejectSaving ? 'Guardando...' : 'Rechazar' }}
          </button>
        </div>
      </div>
    </Teleport>

    <!-- Modal: marcar como hecho -->
    <Teleport to="body">
      <div v-if="doneModal.show"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
        role="presentation" @click.self="doneModal.show = false" @keydown.esc="doneModal.show = false">
        <div class="bg-white dark:bg-rv-darkCard rounded-2xl shadow-xl w-full max-w-md p-6 relative border border-gray-100 dark:border-white/10">
          <button @click="doneModal.show = false"
            class="absolute top-3 right-3 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-600 dark:text-gray-300 rounded-full w-8 h-8 flex items-center justify-center text-base font-bold">&times;</button>
          <h3 class="text-lg font-bold mb-1 text-gray-900 dark:text-white">Marcar como hecho</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">{{ doneModal.suggestion?.title }}</p>

          <label for="feedback-internal-done" class="flex items-center gap-2 mb-4 cursor-pointer select-none">
            <input id="feedback-internal-done" type="checkbox" v-model="doneModal.internal"
              class="w-4 h-4 rounded border-gray-300 dark:border-white/20 text-rv-pink focus:ring-rv-pink" />
            <span class="text-sm text-gray-700 dark:text-gray-300">Mejora interna (no se vincula a ningún item de versión)</span>
          </label>

          <template v-if="!doneModal.internal">
            <div v-if="versionItemsQuery.isPending.value" class="text-sm text-gray-400 py-4 text-center">Cargando items...</div>
            <div v-else-if="versionItemsQuery.isError.value" role="alert" class="text-sm text-red-600 dark:text-red-400 py-2">
              No se pudieron cargar los items de versión.
              <button type="button" @click="retryVersionItems" class="ml-1 font-semibold underline">Reintentar</button>
            </div>
            <label v-else for="feedback-version-item" class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Vincular a item de versión *
              <select id="feedback-version-item" v-model="doneModal.versionItemId"
                class="w-full border border-gray-200 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rv-pink mb-4">
                <option value="">Selecciona un item</option>
                <option v-for="item in versionItems" :key="item.id" :value="item.id">
                  [{{ item.type }}] {{ item.description }}
                </option>
              </select>
            </label>
          </template>

          <button @click="handleDone" :disabled="doneSaving || (!doneModal.internal && !doneModal.versionItemId)"
            class="w-full bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40">
            {{ doneSaving ? 'Guardando...' : 'Confirmar' }}
          </button>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useQueryClient } from "@tanstack/vue-query";
import {
  useAdminFeedbackQuery,
  useCurrentFeedbackVersionItemsQuery,
  useFeedbackMutations,
} from "../../application/useFeedback";
import type { FeedbackEntry, FeedbackPriority, FeedbackStatus, FeedbackType } from "../../types/feedback";
import { useSupportStore } from "@stores/support/support";
import SwalService from "@services/swal/SwalService";

defineOptions({ name: "SuggestionsManagement" });

const queryClient = useQueryClient();
const supportStore = useSupportStore();
const activeType = ref<FeedbackType | "all">("all");
const activeStatus = ref<FeedbackStatus | "all">("in_progress");
const query = useAdminFeedbackQuery(activeType, activeStatus);
const mutations = useFeedbackMutations();
const suggestions = computed(() => query.data.value ?? []);
const isInitialLoading = computed(() => query.isPending.value && !query.data.value);
const isError = computed(() => query.isError.value);
const retry = () => query.refetch();

const createModal = reactive({
  show: false,
  form: { title: "", description: "", type: "suggestion" as FeedbackType, priority: "medium" as FeedbackPriority },
});
const rejectModal = reactive({ show: false, suggestion: null as FeedbackEntry | null, reason: "" });
const doneModal = reactive({
  show: false,
  suggestion: null as FeedbackEntry | null,
  versionItemId: "",
  internal: false,
});
const versionItemsQuery = useCurrentFeedbackVersionItemsQuery(() => doneModal.show && !doneModal.internal);
const versionItems = computed(() => versionItemsQuery.data.value ?? []);
const retryVersionItems = () => versionItemsQuery.refetch();
const createSaving = computed(() => mutations.create.isPending.value);
const rejectSaving = computed(() => mutations.reject.isPending.value);
const doneSaving = computed(() => mutations.complete.isPending.value);

const typeTabs = [
  { value: "all" as const, label: "Todas", icon: "fa-solid fa-list", activeClass: "bg-rv-pink text-white" },
  { value: "bug" as const, label: "Bugs", icon: "fa-solid fa-bug", activeClass: "bg-red-500 text-white" },
  { value: "suggestion" as const, label: "Sugerencias", icon: "fa-solid fa-lightbulb", activeClass: "bg-blue-500 text-white" },
];
const statusTabs: { value: FeedbackStatus | "all"; label: string }[] = [
  { value: "in_progress", label: "Pendientes" },
  { value: "done", label: "Hechas" },
  { value: "rejected", label: "Rechazadas" },
  { value: "all", label: "Todas" },
];

function countByStatus(status: FeedbackStatus | "all") {
  return status === "all" ? suggestions.value.length : suggestions.value.filter((entry) => entry.status === status).length;
}

function setFilter(key: "type" | "status", value: FeedbackType | FeedbackStatus | "all") {
  if (key === "type") activeType.value = value as FeedbackType | "all";
  else activeStatus.value = value as FeedbackStatus | "all";
}

function openCreateModal() {
  createModal.form = { title: "", description: "", type: "suggestion", priority: "medium" };
  createModal.show = true;
}

async function handleCreate() {
  const form = { ...createModal.form };
  if (!form.title.trim() || !form.description.trim()) return;
  try {
    await mutations.create.mutateAsync(form);
    createModal.show = false;
    SwalService.success("Creado correctamente");
  } catch {
    SwalService.error("Error al crear");
  }
}

function openRejectModal(entry: FeedbackEntry) {
  rejectModal.suggestion = entry;
  rejectModal.reason = "";
  rejectModal.show = true;
}

async function handleReject() {
  if (!rejectModal.suggestion || !rejectModal.reason.trim()) return;
  try {
    await mutations.reject.mutateAsync({ id: rejectModal.suggestion.id, rejectionReason: rejectModal.reason });
    rejectModal.show = false;
    SwalService.success("Rechazada");
  } catch {
    SwalService.error("Error al rechazar");
  }
}

function openDoneModal(entry: FeedbackEntry) {
  doneModal.suggestion = entry;
  doneModal.versionItemId = "";
  doneModal.internal = false;
  doneModal.show = true;
}

async function handleDone() {
  const { suggestion, internal, versionItemId } = doneModal;
  if (!suggestion || (!internal && !versionItemId)) return;
  try {
    await mutations.complete.mutateAsync({ id: suggestion.id, versionItemId: internal ? undefined : versionItemId });
    doneModal.show = false;
    SwalService.success("Marcada como hecha");
  } catch {
    SwalService.error("Error al marcar como hecha");
  }
}

function handleMarkAsRead(entry: FeedbackEntry) {
  supportStore.markAsRead(entry.id);
}

async function cyclePriority(entry: FeedbackEntry) {
  const order: FeedbackPriority[] = ["low", "medium", "high"];
  const next = order[(order.indexOf(entry.priority) + 1) % order.length];
  const previous = entry.priority;
  const key = query.queryKey.value;
  queryClient.setQueryData<FeedbackEntry[]>(key, (current) => current?.map((item) =>
    item.id === entry.id ? { ...item, priority: next } : item));
  try {
    await mutations.update.mutateAsync({ id: entry.id, dto: { priority: next } });
  } catch {
    queryClient.setQueryData<FeedbackEntry[]>(key, (current) => current?.map((item) =>
      item.id === entry.id ? { ...item, priority: previous } : item));
    SwalService.error("Error al cambiar la prioridad");
  }
}

async function handleProgress(entry: FeedbackEntry) {
  try {
    await mutations.reopen.mutateAsync(entry.id);
    SwalService.success("Vuelta a pendiente");
  } catch {
    SwalService.error("Error");
  }
}

async function handleDelete(entry: FeedbackEntry) {
  const result = await SwalService.confirm("¿Eliminar esta entrada?", "Esta acción no se puede deshacer.", "Sí, eliminar", "Cancelar");
  if (!result.isConfirmed) return;
  try {
    await mutations.remove.mutateAsync(entry.id);
    SwalService.success("Eliminada");
  } catch {
    SwalService.error("Error al eliminar");
  }
}

const typeOptions = [
  { value: "suggestion" as const, label: "Sugerencia", icon: "fa-solid fa-lightbulb", activeClass: "bg-blue-500 text-white" },
  { value: "bug" as const, label: "Bug", icon: "fa-solid fa-bug", activeClass: "bg-red-500 text-white" },
];
const priorityOptions = [
  { value: "low" as const, label: "Baja", activeClass: "bg-green-500 text-white" },
  { value: "medium" as const, label: "Media", activeClass: "bg-amber-500 text-white" },
  { value: "high" as const, label: "Alta", activeClass: "bg-red-500 text-white" },
];

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
const typeLabel = (type: FeedbackType) => type === "bug" ? "Bug" : "Sugerencia";
const typeIcon = (type: FeedbackType) => type === "bug" ? "fa-solid fa-bug" : "fa-solid fa-lightbulb";
const typeClass = (type: FeedbackType) => type === "bug"
  ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
  : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400";
const priorityLabel = (priority: FeedbackPriority) => ({ low: "Baja", medium: "Media", high: "Alta" })[priority];
const priorityClass = (priority: FeedbackPriority) => ({
  low: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
  medium: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
  high: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
})[priority];
const statusLabel = (status: string) => ({ in_progress: "Pendiente", done: "Hecho", rejected: "Rechazado" }[status] ?? status);
const statusClass = (status: string) => ({
  in_progress: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
  done: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
  rejected: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
})[status] ?? "";
</script>
