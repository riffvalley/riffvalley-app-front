<template>
  <div class="p-6 max-w-4xl mx-auto">

    <!-- Cabecera -->
    <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold">Gestión de Bugs / Sugerencias</h1>
        <p class="text-gray-400 text-sm mt-0.5">{{ counts.in_progress + counts.done + counts.rejected }} en total</p>
      </div>
      <button
        @click="openCreateModal"
        class="flex items-center gap-2 bg-rv-navy text-white px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        <i class="fa-solid fa-plus"></i> Nueva
      </button>
    </div>

    <!-- Tabs tipo -->
    <div class="flex gap-2 mb-4 flex-wrap">
      <button
        v-for="t in typeTabs"
        :key="t.value"
        @click="setFilter('type', t.value)"
        :class="activeType === t.value ? t.activeClass : 'bg-white text-gray-500 hover:text-rv-navy border border-gray-200'"
        class="px-4 py-1.5 rounded-full text-sm font-medium transition-colors shadow-sm"
      >
        <i :class="t.icon" class="mr-1.5"></i>{{ t.label }}
      </button>
    </div>

    <!-- Tabs estado -->
    <div class="flex gap-2 mb-6 flex-wrap">
      <button
        v-for="s in statusTabs"
        :key="s.value"
        @click="setFilter('status', s.value)"
        :class="activeStatus === s.value ? 'bg-rv-navy text-white' : 'bg-white text-gray-500 hover:text-rv-navy border border-gray-200'"
        class="px-3 py-1 rounded-full text-xs font-medium transition-colors shadow-sm"
      >
        {{ s.label }}
        <span class="ml-1 opacity-70">({{ countByStatus(s.value) }})</span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12 text-gray-400">Cargando...</div>

    <!-- Vacío -->
    <div v-else-if="suggestions.length === 0" class="text-center py-12 text-gray-400 bg-white rounded-2xl shadow-rv">
      <i class="fa-solid fa-inbox text-3xl mb-3 block text-gray-300"></i>
      No hay {{ activeType === 'bug' ? 'bugs' : activeType === 'suggestion' ? 'sugerencias' : 'entradas' }} en este estado.
    </div>

    <!-- Lista -->
    <ul v-else class="space-y-3">
      <li v-for="s in suggestions" :key="s.id" class="bg-white rounded-2xl shadow-rv px-5 py-4">
        <div class="flex items-start gap-4">
          <img v-if="s.user?.image" :src="s.user.image" class="w-9 h-9 rounded-full object-cover flex-shrink-0 mt-0.5" />
          <div v-else class="w-9 h-9 rounded-full bg-rv-navy/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <i class="fa-solid fa-user text-rv-navy/50 text-sm"></i>
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap mb-1.5">
              <span :class="typeClass(s.type)" class="text-xs font-semibold px-2 py-0.5 rounded-full">
                <i :class="typeIcon(s.type)" class="mr-1"></i>{{ typeLabel(s.type) }}
              </span>
              <span :class="priorityClass(s.priority)" class="text-xs font-semibold px-2 py-0.5 rounded-full">
                {{ priorityLabel(s.priority) }}
              </span>
              <span :class="statusClass(s.status)" class="text-xs font-semibold px-2 py-0.5 rounded-full">
                {{ statusLabel(s.status) }}
              </span>
              <span class="text-xs text-gray-400">{{ s.user?.username }}</span>
              <span class="text-xs text-gray-400">· {{ formatDate(s.createdAt) }}</span>
            </div>

            <p class="font-semibold text-gray-800">{{ s.title }}</p>
            <p class="text-sm text-gray-500 mt-1 whitespace-pre-line">{{ s.description }}</p>

            <p v-if="s.rejectionReason" class="text-xs text-red-400 mt-2 italic">
              <i class="fa-solid fa-circle-xmark mr-1"></i>{{ s.rejectionReason }}
            </p>
            <p v-if="s.versionItem" class="text-xs text-green-600 mt-2">
              <i class="fa-solid fa-code-branch mr-1"></i>{{ s.versionItem.description }}
            </p>

            <div class="flex gap-2 mt-3 flex-wrap">
              <button v-if="s.status === 'in_progress'" @click="openDoneModal(s)"
                class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors">
                <i class="fa-solid fa-check mr-1"></i>Marcar como hecho
              </button>
              <button v-if="s.status === 'in_progress'" @click="openRejectModal(s)"
                class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors">
                <i class="fa-solid fa-xmark mr-1"></i>Rechazar
              </button>
              <button v-if="s.status === 'rejected'" @click="handleProgress(s)"
                class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors">
                <i class="fa-solid fa-rotate-left mr-1"></i>Volver a pendiente
              </button>
              <button @click="handleDelete(s)"
                class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-500 transition-colors">
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
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 relative">
          <button @click="createModal.show = false"
            class="absolute top-3 right-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full w-8 h-8 flex items-center justify-center text-base font-bold">&times;</button>
          <h3 class="text-lg font-bold mb-4">Nueva sugerencia / bug</h3>
          <form @submit.prevent="handleCreate" class="space-y-4">

            <!-- Tipo -->
            <div class="flex gap-2">
              <button type="button" v-for="t in typeOptions" :key="t.value"
                @click="createModal.form.type = t.value"
                :class="createModal.form.type === t.value ? t.activeClass : 'bg-gray-100 text-gray-500 hover:bg-gray-200'"
                class="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors">
                <i :class="t.icon" class="mr-1"></i>{{ t.label }}
              </button>
            </div>

            <!-- Prioridad -->
            <div class="flex gap-2">
              <button type="button" v-for="p in priorityOptions" :key="p.value"
                @click="createModal.form.priority = p.value"
                :class="createModal.form.priority === p.value ? p.activeClass : 'bg-gray-100 text-gray-500 hover:bg-gray-200'"
                class="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors">
                {{ p.label }}
              </button>
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Título *</label>
              <input v-model="createModal.form.title" type="text" maxlength="200"
                :placeholder="createModal.form.type === 'bug' ? 'Describe el problema...' : 'Describe tu sugerencia...'"
                class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rv-pink" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Descripción *</label>
              <textarea v-model="createModal.form.description" rows="4"
                :placeholder="createModal.form.type === 'bug' ? 'Explica el problema con detalle...' : 'Explica tu idea con detalle...'"
                class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rv-pink resize-none"></textarea>
            </div>

            <button type="submit" :disabled="createModal.saving || !createModal.form.title.trim() || !createModal.form.description.trim()"
              class="w-full bg-rv-navy text-white py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40">
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
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
          <button @click="rejectModal.show = false"
            class="absolute top-3 right-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full w-8 h-8 flex items-center justify-center text-base font-bold">&times;</button>
          <h3 class="text-lg font-bold mb-1">Rechazar</h3>
          <p class="text-sm text-gray-500 mb-4">{{ rejectModal.suggestion?.title }}</p>
          <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Motivo *</label>
          <textarea v-model="rejectModal.reason" rows="3" maxlength="500" placeholder="Explica por qué se rechaza..."
            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rv-pink resize-none mb-4"></textarea>
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
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
          <button @click="doneModal.show = false"
            class="absolute top-3 right-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full w-8 h-8 flex items-center justify-center text-base font-bold">&times;</button>
          <h3 class="text-lg font-bold mb-1">Marcar como hecho</h3>
          <p class="text-sm text-gray-500 mb-4">{{ doneModal.suggestion?.title }}</p>
          <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Vincular a item de versión *</label>
          <div v-if="doneModal.loadingItems" class="text-sm text-gray-400 py-4 text-center">Cargando items...</div>
          <select v-else v-model="doneModal.versionItemId"
            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rv-pink mb-4">
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
  progressSuggestion,
  rejectSuggestion,
  doneSuggestion,
  deleteSuggestion,
  getCurrentVersionItems,
  type Suggestion,
  type SuggestionType,
  type SuggestionPriority,
  type SuggestionCounts,
} from '@services/suggestions/suggestions';
import type { VersionItem } from '@services/versions/versions';
import SwalService from '@services/swal/SwalService';

export default defineComponent({
  name: 'SuggestionsManagement',
  setup() {
    const suggestions = ref<Suggestion[]>([]);
    const counts = ref<SuggestionCounts>({ in_progress: 0, done: 0, rejected: 0 });
    const loading = ref(false);
    const activeType = ref<SuggestionType | 'all'>('all');
    const activeStatus = ref('in_progress');

    const typeTabs = [
      { value: 'all', label: 'Todas', icon: 'fa-solid fa-list', activeClass: 'bg-rv-navy text-white' },
      { value: 'bug', label: 'Bugs', icon: 'fa-solid fa-bug', activeClass: 'bg-red-500 text-white' },
      { value: 'suggestion', label: 'Sugerencias', icon: 'fa-solid fa-lightbulb', activeClass: 'bg-blue-500 text-white' },
    ];

    const statusTabs = [
      { value: 'in_progress', label: 'Pendientes' },
      { value: 'done', label: 'Hechas' },
      { value: 'rejected', label: 'Rechazadas' },
      { value: 'all', label: 'Todas' },
    ];

    const countByStatus = (status: string) => {
      if (status === 'all') return counts.value.in_progress + counts.value.done + counts.value.rejected;
      return counts.value[status as keyof SuggestionCounts] ?? 0;
    };

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
        const params: { type?: SuggestionType; status?: SuggestionStatus } = {};
        if (activeType.value !== 'all') params.type = activeType.value;
        if (activeStatus.value !== 'all') params.status = activeStatus.value as SuggestionStatus;
        const res = await getSuggestions(params);
        suggestions.value = res.data;
        counts.value = res.counts;
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
        const created = await createSuggestion(form);
        suggestions.value.unshift(created);
        createModal.value.show = false;
        SwalService.success('Creado correctamente');
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
      const result = await SwalService.confirm('¿Eliminar esta entrada?', 'Sí, eliminar', 'Cancelar');
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
    const typeClass = (t: SuggestionType) => t === 'bug' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600';

    const priorityLabel = (p: SuggestionPriority) => ({ low: 'Baja', medium: 'Media', high: 'Alta' }[p]);
    const priorityClass = (p: SuggestionPriority) =>
      ({ low: 'bg-green-100 text-green-600', medium: 'bg-amber-100 text-amber-600', high: 'bg-red-100 text-red-600' }[p]);

    const statusLabel = (s: string) => ({ in_progress: 'Pendiente', done: 'Hecho', rejected: 'Rechazado' }[s] ?? s);
    const statusClass = (s: string) =>
      ({ in_progress: 'bg-amber-100 text-amber-600', done: 'bg-green-100 text-green-600', rejected: 'bg-red-100 text-red-600' }[s] ?? '');

    onMounted(fetchAll);

    return {
      suggestions, counts, loading, activeType, activeStatus,
      typeTabs, statusTabs,
      createModal, rejectModal, doneModal,
      typeOptions, priorityOptions,
      countByStatus, setFilter,
      openCreateModal, handleCreate,
      openRejectModal, handleReject,
      openDoneModal, handleDone,
      handleProgress, handleDelete,
      formatDate,
      typeLabel, typeIcon, typeClass,
      priorityLabel, priorityClass,
      statusLabel, statusClass,
    };
  },
});
</script>
