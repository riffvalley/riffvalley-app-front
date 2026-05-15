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
    <div v-if="loading" class="flex items-center justify-center gap-2 py-16 text-gray-400 dark:text-gray-500 text-sm">
      <i class="fa-solid fa-spinner fa-spin"></i>Cargando...
    </div>

    <!-- Vacío -->
    <div v-else-if="suggestions.length === 0"
      class="text-center py-14 bg-white dark:bg-rv-darkCard rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
      <i class="fa-solid fa-inbox text-3xl mb-3 block text-gray-300 dark:text-gray-600"></i>
      <p class="text-sm text-gray-400 dark:text-gray-500">
        No hay {{ activeType === 'bug' ? 'bugs' : activeType === 'suggestion' ? 'sugerencias' : 'entradas' }} en este estado.
      </p>
    </div>

    <!-- Lista -->
    <ul v-else class="space-y-3">
      <li v-for="s in suggestions" :key="s.id"
        class="bg-white dark:bg-rv-darkCard rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden">

        <!-- Franja de color según tipo -->
        <div :class="s.type === 'bug' ? 'bg-red-500' : 'bg-blue-500'" class="h-1 w-full"></div>

        <div class="px-5 py-4 flex items-start gap-4">
          <!-- Avatar -->
          <img v-if="s.user?.image" :src="s.user.image"
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
        @click.self="createModal.show = false">
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
              <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Título *</label>
              <input v-model="createModal.form.title" type="text" maxlength="200"
                :placeholder="createModal.form.type === 'bug' ? 'Describe el problema...' : 'Describe tu sugerencia...'"
                class="w-full border border-gray-200 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rv-pink" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Descripción *</label>
              <textarea v-model="createModal.form.description" rows="4"
                :placeholder="createModal.form.type === 'bug' ? 'Explica el problema con detalle...' : 'Explica tu idea con detalle...'"
                class="w-full border border-gray-200 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rv-pink resize-none"></textarea>
            </div>

            <button type="submit" :disabled="createModal.saving || !createModal.form.title.trim() || !createModal.form.description.trim()"
              class="w-full bg-rv-navy dark:bg-rv-purple text-white py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40">
              {{ createModal.saving ? 'Guardando...' : 'Crear' }}
            </button>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Modal: rechazar -->
    <Teleport to="body">
      <div v-if="rejectModal.show"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
        @click.self="rejectModal.show = false">
        <div class="bg-white dark:bg-rv-darkCard rounded-2xl shadow-xl w-full max-w-md p-6 relative border border-gray-100 dark:border-white/10">
          <button @click="rejectModal.show = false"
            class="absolute top-3 right-3 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-600 dark:text-gray-300 rounded-full w-8 h-8 flex items-center justify-center text-base font-bold">&times;</button>
          <h3 class="text-lg font-bold mb-1 text-gray-900 dark:text-white">Rechazar</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">{{ rejectModal.suggestion?.title }}</p>
          <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Motivo *</label>
          <textarea v-model="rejectModal.reason" rows="3" maxlength="500" placeholder="Explica por qué se rechaza..."
            class="w-full border border-gray-200 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rv-pink resize-none mb-4"></textarea>
          <button @click="handleReject" :disabled="rejectModal.saving || !rejectModal.reason.trim()"
            class="w-full bg-red-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40">
            {{ rejectModal.saving ? 'Guardando...' : 'Rechazar' }}
          </button>
        </div>
      </div>
    </Teleport>

    <!-- Modal: marcar como hecho -->
    <Teleport to="body">
      <div v-if="doneModal.show"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
        @click.self="doneModal.show = false">
        <div class="bg-white dark:bg-rv-darkCard rounded-2xl shadow-xl w-full max-w-md p-6 relative border border-gray-100 dark:border-white/10">
          <button @click="doneModal.show = false"
            class="absolute top-3 right-3 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-600 dark:text-gray-300 rounded-full w-8 h-8 flex items-center justify-center text-base font-bold">&times;</button>
          <h3 class="text-lg font-bold mb-1 text-gray-900 dark:text-white">Marcar como hecho</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">{{ doneModal.suggestion?.title }}</p>
          <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Vincular a item de versión *</label>
          <div v-if="doneModal.loadingItems" class="text-sm text-gray-400 py-4 text-center">Cargando items...</div>
          <select v-else v-model="doneModal.versionItemId"
            class="w-full border border-gray-200 dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rv-pink mb-4">
            <option value="">Selecciona un item</option>
            <option v-for="item in doneModal.versionItems" :key="item.id" :value="item.id">
              [{{ item.type }}] {{ item.description }}
            </option>
          </select>
          <button @click="handleDone" :disabled="doneModal.saving || !doneModal.versionItemId"
            class="w-full bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40">
            {{ doneModal.saving ? 'Guardando...' : 'Confirmar' }}
          </button>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import {
  getSuggestions,
  createSuggestion,
  updateSuggestion,
  progressSuggestion,
  rejectSuggestion,
  doneSuggestion,
  deleteSuggestion,
  getCurrentVersionItems,
  type Suggestion,
  type SuggestionType,
  type SuggestionPriority,
} from '@services/suggestions/suggestions';
import type { VersionItem } from '@services/versions/versions';
import SwalService from '@services/swal/SwalService';
import { useSupportStore } from '@stores/support/support';

export default defineComponent({
  name: 'SuggestionsManagement',
  setup() {
    const supportStore = useSupportStore();
    const suggestions = ref<Suggestion[]>([]);
    const loading = ref(false);
    const activeType = ref<SuggestionType | 'all'>('all');
    const activeStatus = ref('in_progress');

    const typeTabs = [
      { value: 'all', label: 'Todas', icon: 'fa-solid fa-list', activeClass: 'bg-rv-pink text-white' },
      { value: 'bug', label: 'Bugs', icon: 'fa-solid fa-bug', activeClass: 'bg-red-500 text-white' },
      { value: 'suggestion', label: 'Sugerencias', icon: 'fa-solid fa-lightbulb', activeClass: 'bg-blue-500 text-white' },
    ];

    const statusTabs = [
      { value: 'in_progress', label: 'Pendientes' },
      { value: 'done', label: 'Hechas' },
      { value: 'rejected', label: 'Rechazadas' },
      { value: 'all', label: 'Todas' },
    ];

    const countByStatus = (status: string) =>
      status === 'all' ? suggestions.value.length : suggestions.value.filter(s => s.status === status).length;

    const createModal = ref({
      show: false,
      saving: false,
      form: { title: '', description: '', type: 'suggestion' as SuggestionType, priority: 'medium' as SuggestionPriority },
    });

    const rejectModal = ref({
      show: false, saving: false,
      suggestion: null as Suggestion | null,
      reason: '',
    });

    const doneModal = ref({
      show: false, saving: false, loadingItems: false,
      suggestion: null as Suggestion | null,
      versionItems: [] as VersionItem[],
      versionItemId: '',
    });

    const fetchAll = async () => {
      loading.value = true;
      try {
        const params: any = {};
        if (activeType.value !== 'all') params.type = activeType.value;
        if (activeStatus.value !== 'all') params.status = activeStatus.value;
        const result = await getSuggestions(params);
        suggestions.value = Array.isArray(result) ? result : ((result as any).data ?? []);
        // Actualizar el store con los IDs pendientes para el badge del sidebar
        const pendingIds = suggestions.value
          .filter(s => s.status === 'in_progress')
          .map(s => s.id);
        supportStore.setPendingIds(pendingIds);
      } finally {
        loading.value = false;
      }
    };

    const setFilter = (key: 'type' | 'status', value: string) => {
      if (key === 'type') activeType.value = value as SuggestionType | 'all';
      if (key === 'status') activeStatus.value = value;
      fetchAll();
    };

    const openCreateModal = () => {
      createModal.value.form = { title: '', description: '', type: 'suggestion', priority: 'medium' };
      createModal.value.show = true;
    };

    const handleCreate = async () => {
      const { form } = createModal.value;
      if (!form.title.trim() || !form.description.trim()) return;
      createModal.value.saving = true;
      try {
        await createSuggestion(form);
        createModal.value.show = false;
        SwalService.success('Creado correctamente');
        await fetchAll();
      } catch {
        SwalService.error('Error al crear');
      } finally {
        createModal.value.saving = false;
      }
    };

    const openRejectModal = (s: Suggestion) => {
      rejectModal.value.suggestion = s;
      rejectModal.value.reason = '';
      rejectModal.value.show = true;
    };

    const handleReject = async () => {
      if (!rejectModal.value.suggestion || !rejectModal.value.reason.trim()) return;
      rejectModal.value.saving = true;
      try {
        const updated = await rejectSuggestion(rejectModal.value.suggestion.id, rejectModal.value.reason);
        updateInList(updated);
        rejectModal.value.show = false;
        SwalService.success('Rechazada');
      } catch {
        SwalService.error('Error al rechazar');
      } finally {
        rejectModal.value.saving = false;
      }
    };

    const openDoneModal = async (s: Suggestion) => {
      doneModal.value.suggestion = s;
      doneModal.value.versionItemId = '';
      doneModal.value.show = true;
      doneModal.value.loadingItems = true;
      try {
        doneModal.value.versionItems = await getCurrentVersionItems();
      } catch {
        doneModal.value.versionItems = [];
      } finally {
        doneModal.value.loadingItems = false;
      }
    };

    const handleDone = async () => {
      if (!doneModal.value.suggestion || !doneModal.value.versionItemId) return;
      doneModal.value.saving = true;
      try {
        const updated = await doneSuggestion(doneModal.value.suggestion.id, doneModal.value.versionItemId);
        updateInList(updated);
        doneModal.value.show = false;
        SwalService.success('Marcada como hecha');
      } catch {
        SwalService.error('Error al marcar como hecha');
      } finally {
        doneModal.value.saving = false;
      }
    };

    const handleMarkAsRead = (s: Suggestion) => {
      supportStore.markAsRead(s.id);
    };

    const cyclePriority = async (s: Suggestion) => {
      const order: SuggestionPriority[] = ['low', 'medium', 'high'];
      const next = order[(order.indexOf(s.priority) + 1) % order.length];
      const prev = s.priority;
      s.priority = next;
      try {
        await updateSuggestion(s.id, { priority: next });
      } catch {
        s.priority = prev;
        SwalService.error('Error al cambiar la prioridad');
      }
    };

    const handleProgress = async (s: Suggestion) => {
      try {
        const updated = await progressSuggestion(s.id);
        updateInList(updated);
        SwalService.success('Vuelta a pendiente');
      } catch {
        SwalService.error('Error');
      }
    };

    const handleDelete = async (s: Suggestion) => {
      const result = await SwalService.confirm('¿Eliminar esta entrada?', 'Esta acción no se puede deshacer.', 'Sí, eliminar', 'Cancelar');
      if (!result.isConfirmed) return;
      try {
        await deleteSuggestion(s.id);
        suggestions.value = suggestions.value.filter(x => x.id !== s.id);
        SwalService.success('Eliminada');
      } catch {
        SwalService.error('Error al eliminar');
      }
    };

    const updateInList = (updated: Suggestion) => {
      const idx = suggestions.value.findIndex(s => s.id === updated.id);
      if (idx !== -1) suggestions.value[idx] = updated;
    };

    const typeOptions = [
      { value: 'suggestion', label: 'Sugerencia', icon: 'fa-solid fa-lightbulb', activeClass: 'bg-blue-500 text-white' },
      { value: 'bug', label: 'Bug', icon: 'fa-solid fa-bug', activeClass: 'bg-red-500 text-white' },
    ];

    const priorityOptions = [
      { value: 'low', label: 'Baja', activeClass: 'bg-green-500 text-white' },
      { value: 'medium', label: 'Media', activeClass: 'bg-amber-500 text-white' },
      { value: 'high', label: 'Alta', activeClass: 'bg-red-500 text-white' },
    ];

    const formatDate = (iso: string) =>
      new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

    const typeLabel = (t: SuggestionType) => t === 'bug' ? 'Bug' : 'Sugerencia';
    const typeIcon = (t: SuggestionType) => t === 'bug' ? 'fa-solid fa-bug' : 'fa-solid fa-lightbulb';
    const typeClass = (t: SuggestionType) => t === 'bug'
      ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';

    const priorityLabel = (p: SuggestionPriority) => ({ low: 'Baja', medium: 'Media', high: 'Alta' }[p]);
    const priorityClass = (p: SuggestionPriority) => ({
      low: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
      medium: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
      high: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    }[p]);

    const statusLabel = (s: string) => ({ in_progress: 'Pendiente', done: 'Hecho', rejected: 'Rechazado' }[s] ?? s);
    const statusClass = (s: string) => ({
      in_progress: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
      done: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
      rejected: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    }[s] ?? '');

    onMounted(fetchAll);

    return {
      suggestions, loading, activeType, activeStatus,
      typeTabs, statusTabs,
      createModal, rejectModal, doneModal,
      typeOptions, priorityOptions,
      countByStatus, setFilter,
      openCreateModal, handleCreate,
      openRejectModal, handleReject,
      openDoneModal, handleDone,
      handleProgress, handleDelete, cyclePriority, handleMarkAsRead,
      supportStore,
      formatDate,
      typeLabel, typeIcon, typeClass,
      priorityLabel, priorityClass,
      statusLabel, statusClass,
    };
  },
});
</script>
