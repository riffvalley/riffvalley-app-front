<template>
  <div class="p-6 max-w-5xl mx-auto">

    <!-- Cabecera -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl font-bold">Peticiones de discos</h1>
      <span class="text-sm text-gray-400">{{ filteredRequests.length }} peticiones</span>
    </div>

    <!-- Filtros de estado -->
    <div class="flex gap-2 mb-6 flex-wrap">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        @click="activeTab = tab.value"
        :class="activeTab === tab.value
          ? 'bg-rv-navy text-white'
          : 'bg-white text-gray-500 hover:text-rv-navy border border-gray-200'"
        class="px-4 py-1.5 rounded-full text-sm font-medium transition-colors shadow-sm"
      >
        {{ tab.label }}
        <span class="ml-1 text-xs opacity-70">({{ countByStatus(tab.value) }})</span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12 text-gray-400">Cargando...</div>

    <!-- Vacío -->
    <div v-else-if="filteredRequests.length === 0"
      class="text-center py-12 text-gray-400 bg-white rounded-2xl shadow-rv">
      <i class="fas fa-inbox text-3xl mb-3 block text-gray-300"></i>
      No hay peticiones {{ activeTab !== 'all' ? tabLabel(activeTab) + 's' : '' }}.
    </div>

    <!-- Lista -->
    <ul v-else class="space-y-3">
      <li
        v-for="req in filteredRequests"
        :key="req.id"
        class="bg-white rounded-2xl shadow-rv px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4"
      >
        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <p class="font-semibold text-gray-800">
              {{ req.artistName }} — {{ req.discName }}
            </p>
            <span v-if="req.ep" class="text-xs bg-rv-pink/10 text-rv-pink font-semibold px-2 py-0.5 rounded-full">EP</span>
            <span v-if="req.debut" class="text-xs bg-rv-purple/10 text-rv-purple font-semibold px-2 py-0.5 rounded-full">Debut</span>
          </div>
          <p class="text-xs text-gray-400 mt-1 flex flex-wrap gap-x-3">
            <span v-if="req.releaseDate"><i class="far fa-calendar mr-1"></i>{{ formatDate(req.releaseDate) }}</span>
            <span v-if="req.genre"><i class="fas fa-tag mr-1"></i>{{ req.genre.name }}</span>
            <span v-if="req.country"><i class="fas fa-flag mr-1"></i>{{ req.country.name }}</span>
            <span><i class="far fa-clock mr-1"></i>{{ formatDate(req.createdAt) }}</span>
          </p>
          <p v-if="req.adminNotes" class="text-xs text-gray-500 mt-1.5 italic">
            <i class="fas fa-comment-dots mr-1"></i>"{{ req.adminNotes }}"
          </p>
        </div>

        <!-- Estado + acciones -->
        <div class="flex items-center gap-2 flex-shrink-0">
          <span :class="statusClass(req.status)"
            class="text-xs font-semibold px-3 py-1 rounded-full">
            {{ statusLabel(req.status) }}
          </span>
          <template v-if="req.status !== 'approved'">
            <button @click="openEdit(req)" title="Editar"
              class="w-8 h-8 flex items-center justify-center rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors">
              <i class="fas fa-pen text-xs"></i>
            </button>
            <template v-if="req.status === 'pending'">
              <button @click="handleApprove(req)" title="Aprobar"
                class="w-8 h-8 flex items-center justify-center rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                <i class="fas fa-check text-xs"></i>
              </button>
              <button @click="openReject(req)" title="Rechazar"
                class="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                <i class="fas fa-xmark text-xs"></i>
              </button>
            </template>
            <button v-if="req.status === 'rejected'" @click="handleReopen(req)" title="Reabrir"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-50 text-yellow-600 hover:bg-yellow-100 text-xs font-semibold transition-colors">
              <i class="fas fa-rotate-left text-xs"></i>
              Reabrir
            </button>
          </template>
        </div>
      </li>
    </ul>

    <!-- Modal editar -->
    <div v-if="editingRequest"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="editingRequest = null">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <h2 class="text-xl font-bold mb-5">Editar petición</h2>
        <div class="space-y-4">

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Artista</label>
              <input v-model="editForm.artistName" type="text"
                class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rv-pink" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Disco</label>
              <input v-model="editForm.discName" type="text"
                class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rv-pink" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Fecha de lanzamiento</label>
            <input v-model="editForm.releaseDate" type="date"
              class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rv-pink" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Género</label>
              <SearchableSelect
                v-model="editForm.genreId"
                :options="catalogStore.genres"
                title="name" trackby="id"
                triggerPlaceholder="Género"
                allLabel="Sin género"
                placeholder="Buscar..."
                :max="4000"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">País</label>
              <SearchableSelect
                v-model="editForm.countryId"
                :options="catalogStore.countries"
                title="name" trackby="id"
                triggerPlaceholder="País"
                allLabel="Sin país"
                placeholder="Buscar..."
                :max="4000"
              />
            </div>
          </div>

          <div class="flex gap-3">
            <button type="button" @click="editForm.ep = !editForm.ep"
              :class="editForm.ep ? 'bg-rv-pink text-white border-rv-pink' : 'bg-white text-gray-500 border-gray-200'"
              class="flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-medium transition-colors">
              <i class="fas fa-compact-disc text-xs"></i> EP
            </button>
            <button type="button" @click="editForm.debut = !editForm.debut"
              :class="editForm.debut ? 'bg-rv-pink text-white border-rv-pink' : 'bg-white text-gray-500 border-gray-200'"
              class="flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-medium transition-colors">
              <i class="fas fa-star text-xs"></i> Debut
            </button>
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notas admin</label>
            <textarea v-model="editForm.adminNotes" rows="2" placeholder="Correcciones realizadas..."
              class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rv-pink resize-none" />
          </div>

        </div>

        <div class="flex justify-end gap-2 mt-6">
          <button @click="editingRequest = null"
            class="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-colors">
            Cancelar
          </button>
          <button @click="handleSaveEdit" :disabled="saving"
            class="px-5 py-2 rounded-xl text-sm font-bold bg-rv-navy text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
            <span v-if="saving">Guardando...</span>
            <span v-else>Guardar</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal rechazar -->
    <div v-if="rejectingRequest"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="rejectingRequest = null">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 class="text-xl font-bold mb-2">Rechazar petición</h2>
        <p class="text-sm text-gray-500 mb-4">
          <span class="font-medium text-gray-700">{{ rejectingRequest.artistName }} — {{ rejectingRequest.discName }}</span>
        </p>

        <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Motivo rápido
        </label>
        <select @change="onRejectPreset" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600
          focus:outline-none focus:ring-2 focus:ring-rv-pink mb-3">
          <option value="">— Selecciona un motivo —</option>
          <option v-for="reason in REJECT_REASONS" :key="reason.value" :value="reason.value">
            {{ reason.label }}
          </option>
        </select>

        <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Mensaje para el usuario <span class="text-rv-pink">*</span>
        </label>
        <textarea v-model="rejectNotes" rows="3" placeholder="Escribe o edita el motivo del rechazo..."
          class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rv-pink resize-none" />
        <p v-if="rejectError" class="text-rv-pink text-xs mt-1">{{ rejectError }}</p>

        <div class="flex justify-end gap-2 mt-5">
          <button @click="rejectingRequest = null"
            class="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-colors">
            Cancelar
          </button>
          <button @click="handleReject" :disabled="rejecting"
            class="px-5 py-2 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors">
            <span v-if="rejecting">Rechazando...</span>
            <span v-else>Rechazar</span>
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, reactive } from 'vue';
import {
  getAllRequests,
  updateRequest,
  approveRequest,
  rejectRequest,
  type DiscRequest,
} from '@services/requests/requests';
import { useCatalogStore } from '@stores/catalog/catalog';
import SwalService from '@services/swal/SwalService';
import SearchableSelect from '@components/SearchableSelect.vue';
import { REJECT_REASONS } from '@helpers/rejectReasons';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

export default defineComponent({
  name: 'PetitionsPage',
  components: { SearchableSelect },
  setup() {
    const catalogStore = useCatalogStore();
    const requests = ref<DiscRequest[]>([]);
    const loading = ref(false);
    const activeTab = ref<StatusFilter>('pending');

    const tabs: { value: StatusFilter; label: string }[] = [
      { value: 'pending', label: 'Pendientes' },
      { value: 'approved', label: 'Aprobadas' },
      { value: 'rejected', label: 'Rechazadas' },
      { value: 'all', label: 'Todas' },
    ];

    const filteredRequests = computed(() =>
      activeTab.value === 'all'
        ? requests.value
        : requests.value.filter(r => r.status === activeTab.value)
    );

    const countByStatus = (status: StatusFilter) =>
      status === 'all'
        ? requests.value.length
        : requests.value.filter(r => r.status === status).length;

    // --- Editar ---
    const editingRequest = ref<DiscRequest | null>(null);
    const saving = ref(false);
    const editForm = reactive({
      artistName: '',
      discName: '',
      releaseDate: '',
      genreId: '',
      countryId: '',
      ep: false,
      debut: false,
      adminNotes: '',
    });

    const openEdit = (req: DiscRequest) => {
      editingRequest.value = req;
      editForm.artistName = req.artistName;
      editForm.discName = req.discName;
      editForm.releaseDate = req.releaseDate ?? '';
      editForm.genreId = req.genre?.id ?? '';
      editForm.countryId = req.country?.id ?? '';
      editForm.ep = req.ep;
      editForm.debut = req.debut;
      editForm.adminNotes = req.adminNotes ?? '';
    };

    const handleSaveEdit = async () => {
      if (!editingRequest.value) return;
      saving.value = true;
      try {
        const dto: any = {};
        if (editForm.artistName !== editingRequest.value.artistName) dto.artistName = editForm.artistName;
        if (editForm.discName !== editingRequest.value.discName) dto.discName = editForm.discName;
        if (editForm.releaseDate !== (editingRequest.value.releaseDate ?? '')) dto.releaseDate = editForm.releaseDate;
        if (editForm.genreId !== (editingRequest.value.genre?.id ?? '')) dto.genreId = editForm.genreId || null;
        if (editForm.countryId !== (editingRequest.value.country?.id ?? '')) dto.countryId = editForm.countryId || null;
        if (editForm.ep !== editingRequest.value.ep) dto.ep = editForm.ep;
        if (editForm.debut !== editingRequest.value.debut) dto.debut = editForm.debut;
        if (editForm.adminNotes !== (editingRequest.value.adminNotes ?? '')) dto.adminNotes = editForm.adminNotes;

        const updated = await updateRequest(editingRequest.value.id, dto);
        const idx = requests.value.findIndex(r => r.id === updated.id);
        if (idx !== -1) requests.value[idx] = updated;
        editingRequest.value = null;
        SwalService.success('Petición actualizada');
      } catch (error: any) {
        SwalService.error(error.response?.data?.message || 'Error al guardar');
      } finally {
        saving.value = false;
      }
    };

    // --- Aprobar ---
    const handleApprove = async (req: DiscRequest) => {
      try {
        await approveRequest(req.id);
        const idx = requests.value.findIndex(r => r.id === req.id);
        if (idx !== -1) requests.value[idx] = { ...requests.value[idx], status: 'approved' };
        SwalService.success('Petición aprobada y disco creado');
      } catch (error: any) {
        SwalService.error(error.response?.data?.message || 'Error al aprobar');
      }
    };

    // --- Reabrir ---
    const handleReopen = async (req: DiscRequest) => {
      try {
        const updated = await updateRequest(req.id, { status: 'pending' });
        const idx = requests.value.findIndex(r => r.id === req.id);
        if (idx !== -1) requests.value[idx] = updated;
        SwalService.success('Petición reabierta');
      } catch (error: any) {
        SwalService.error(error.response?.data?.message || 'Error al reabrir');
      }
    };

    // --- Rechazar ---
    const rejectingRequest = ref<DiscRequest | null>(null);
    const rejectNotes = ref('');
    const rejectError = ref('');
    const rejecting = ref(false);

    const openReject = (req: DiscRequest) => {
      rejectingRequest.value = req;
      rejectNotes.value = '';
      rejectError.value = '';
    };

    const onRejectPreset = (e: Event) => {
      const value = (e.target as HTMLSelectElement).value;
      if (value) rejectNotes.value = value;
    };

    const handleReject = async () => {
      if (!rejectNotes.value.trim()) {
        rejectError.value = 'El motivo es obligatorio.';
        return;
      }
      rejecting.value = true;
      try {
        const updated = await rejectRequest(rejectingRequest.value!.id, rejectNotes.value.trim());
        const idx = requests.value.findIndex(r => r.id === updated.id);
        if (idx !== -1) requests.value[idx] = updated;
        rejectingRequest.value = null;
        SwalService.success('Petición rechazada');
      } catch (error: any) {
        SwalService.error(error.response?.data?.message || 'Error al rechazar');
      } finally {
        rejecting.value = false;
      }
    };

    // --- Utilidades ---
    const formatDate = (dateStr: string) =>
      new Date(dateStr).toLocaleDateString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });

    const statusLabel = (status: DiscRequest['status']) =>
      ({ pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada' })[status];

    const statusClass = (status: DiscRequest['status']) =>
      ({
        pending: 'bg-yellow-100 text-yellow-700',
        approved: 'bg-green-100 text-green-700',
        rejected: 'bg-red-100 text-red-700',
      })[status];

    const tabLabel = (status: StatusFilter) =>
      ({ pending: 'pendiente', approved: 'aprobada', rejected: 'rechazada', all: '' })[status];

    onMounted(async () => {
      loading.value = true;
      try {
        requests.value = await getAllRequests();
      } catch {
        SwalService.error('No se pudieron cargar las peticiones');
      } finally {
        loading.value = false;
      }
    });

    return {
      catalogStore,
      requests,
      loading,
      activeTab,
      tabs,
      filteredRequests,
      countByStatus,
      editingRequest,
      editForm,
      saving,
      openEdit,
      handleSaveEdit,
      handleApprove,
      handleReopen,
      rejectingRequest,
      rejectNotes,
      rejectError,
      rejecting,
      REJECT_REASONS,
      openReject,
      onRejectPreset,
      handleReject,
      formatDate,
      statusLabel,
      statusClass,
      tabLabel,
    };
  },
});
</script>
