<template>
  <div class="p-6 max-w-5xl mx-auto">

    <!-- Cabecera -->
    <div class="flex items-center justify-between mb-6">
<h1 class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white"><i class="fa-solid fa-inbox mr-2"></i>Peticiones de Discos</h1>
<span class="text-sm text-gray-400 dark:text-gray-300">{{ filteredRequests.length }} peticiones</span>
    </div>

    <!-- Filtros de estado -->
    <div class="flex gap-2 mb-6 flex-wrap">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        @click="activeTab = tab.value"
:class="activeTab === tab.value
  ? 'bg-rv-navy dark:bg-rv-purple text-white'
  : 'bg-white dark:bg-rv-darkSurface text-gray-500 dark:text-gray-300 hover:text-rv-navy dark:hover:text-white border border-gray-200 dark:border-white/10'"
        class="px-4 py-1.5 rounded-full text-sm font-medium transition-colors shadow-sm"
      >
        {{ tab.label }}
        <span class="ml-1 text-xs opacity-70">({{ countByStatus(tab.value) }})</span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12 text-gray-400 dark:text-gray-300">Cargando...</div>

    <div v-else-if="requestsError" class="text-center py-12 text-red-600 dark:text-red-400">
      <p>No se pudieron cargar las peticiones.</p>
      <button type="button" @click="retryRequests" class="mt-3 font-semibold underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-pink">Reintentar</button>
    </div>

    <!-- Vacío -->
    <div
      v-else-if="filteredRequests.length === 0"
      class="text-center py-12 text-gray-400 dark:text-gray-500 bg-white dark:bg-rv-darkCard rounded-2xl shadow-sm border border-gray-200 dark:border-white/10"
    >
      <i class="fas fa-inbox text-3xl mb-3 block text-gray-300 dark:text-gray-600"></i>
      No hay peticiones {{ activeTab !== 'all' ? tabLabel(activeTab) + 's' : '' }}.
    </div>

    <!-- Lista -->
    <ul v-else class="space-y-3">
      <li
        v-for="req in filteredRequests"
        :key="req.id"
        class="bg-white dark:bg-rv-darkCard rounded-2xl shadow-sm px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 border border-gray-200 dark:border-white/10"
      >
        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <p class="font-semibold text-gray-800 dark:text-white">
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
            <span v-if="requestUserLabel(req)">
              <i class="fas fa-user mr-1"></i>{{ requestUserLabel(req) }}
            </span>
          </p>
          <p v-if="req.adminNotes" class="text-xs text-gray-500 dark:text-gray-300 mt-1.5 italic">
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
              class="w-8 h-8 flex items-center justify-center rounded-full bg-green-50 dark:bg-green-500/15 text-green-600 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-500/25 transition-colors">
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
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-50 dark:bg-yellow-500/15 text-yellow-600 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-500/25 text-xs font-semibold transition-colors">
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
      role="presentation" @keydown.esc.self="editingRequest = null" @click.self="editingRequest = null">
      <div class="bg-white dark:bg-rv-darkCard rounded-2xl shadow-xl w-full max-w-lg p-6 border border-gray-200 dark:border-white/10">
        <h2 class="text-xl font-bold mb-5 text-gray-900 dark:text-white">Editar petición</h2>
        <div class="space-y-4">

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="request-edit-artist" class="block text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wide mb-1">Artista
              <input id="request-edit-artist" v-model="editForm.artistName" type="text"
                class="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm
bg-white dark:bg-rv-darkSurface text-gray-800 dark:text-white
placeholder:text-gray-400 dark:placeholder:text-gray-500
focus:outline-none focus:ring-2 focus:ring-rv-pink" /></label>
            </div>
            <div>
              <label for="request-edit-disc" class="block text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wide mb-1">Disco
              <input id="request-edit-disc" v-model="editForm.discName" type="text"
                class="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm
bg-white dark:bg-rv-darkSurface text-gray-800 dark:text-white
placeholder:text-gray-400 dark:placeholder:text-gray-500
focus:outline-none focus:ring-2 focus:ring-rv-pink" /></label>
            </div>
          </div>

          <div>
            <label for="request-edit-release-date" class="block text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wide mb-1">Fecha de lanzamiento
            <input id="request-edit-release-date" v-model="editForm.releaseDate" type="date"
              class="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm
bg-white dark:bg-rv-darkSurface text-gray-800 dark:text-white
placeholder:text-gray-400 dark:placeholder:text-gray-500
focus:outline-none focus:ring-2 focus:ring-rv-pink" /></label>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <span class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Género</span>
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
              <span class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">País</span>
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
              :class="editForm.ep ? 'bg-rv-pink text-white border-rv-pink' : 'bg-white dark:bg-rv-darkSurface text-gray-500 dark:text-gray-300 border-gray-200 dark:border-white/10'"
              class="flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-medium transition-colors">
              <i class="fas fa-compact-disc text-xs"></i> EP
            </button>
            <button type="button" @click="editForm.debut = !editForm.debut"
             :class="editForm.debut ? 'bg-rv-pink text-white border-rv-pink' : 'bg-white dark:bg-rv-darkSurface text-gray-500 dark:text-gray-300 border-gray-200 dark:border-white/10'"
              class="flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-medium transition-colors">
              <i class="fas fa-star text-xs"></i> Debut
            </button>
          </div>

          <div>
            <label for="request-edit-notes" class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notas admin
            <textarea id="request-edit-notes" v-model="editForm.adminNotes" rows="2" placeholder="Correcciones realizadas..."
              class="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm
bg-white dark:bg-rv-darkSurface text-gray-800 dark:text-white
placeholder:text-gray-400 dark:placeholder:text-gray-500
focus:outline-none focus:ring-2 focus:ring-rv-pink resize-none" /></label>
          </div>

        </div>

        <div class="flex justify-end gap-2 mt-6">
          <button @click="editingRequest = null"
            class="px-4 py-2 rounded-xl text-sm text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-rv-darkSurface transition-colors">
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
      role="presentation" @keydown.esc.self="rejectingRequest = null" @click.self="rejectingRequest = null">
      <div class="bg-white dark:bg-rv-darkCard rounded-2xl shadow-xl w-full max-w-md p-6 border border-gray-200 dark:border-white/10">
<h2 class="text-xl font-bold mb-2 text-gray-900 dark:text-white">Rechazar petición</h2>
<p class="text-sm text-gray-500 dark:text-gray-300 mb-4">
  <span class="font-medium text-gray-700 dark:text-white">{{ rejectingRequest.artistName }} — {{ rejectingRequest.discName }}</span>
        </p>

        <label for="request-reject-preset" class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Motivo rápido
        <select id="request-reject-preset" @change="onRejectPreset" class="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm
bg-white dark:bg-rv-darkSurface text-gray-600 dark:text-white
focus:outline-none focus:ring-2 focus:ring-rv-pink mb-3">
          <option value="">— Selecciona un motivo —</option>
          <option v-for="reason in REJECT_REASONS" :key="reason.value" :value="reason.value">
            {{ reason.label }}
          </option>
        </select>
        </label>

        <label for="request-reject-notes" class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Mensaje para el usuario <span class="text-rv-pink">*</span>
        <textarea id="request-reject-notes" v-model="rejectNotes" rows="3" placeholder="Escribe o edita el motivo del rechazo..."
          class="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm
bg-white dark:bg-rv-darkSurface text-gray-800 dark:text-white
placeholder:text-gray-400 dark:placeholder:text-gray-500
focus:outline-none focus:ring-2 focus:ring-rv-pink resize-none" />
        </label>
        <p v-if="rejectError" class="text-rv-pink text-xs mt-1">{{ rejectError }}</p>

        <div class="flex justify-end gap-2 mt-5">
          <button @click="rejectingRequest = null"
            class="px-4 py-2 rounded-xl text-sm text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-rv-darkSurface transition-colors">
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
import { defineComponent, ref, computed, reactive, watch } from 'vue';
import { useQueryClient } from '@tanstack/vue-query';
import { useAdminRequestsQuery, useRequestMutations } from '../../application/useRequests';
import { requestErrorMessage } from '../../application/requestErrorMessage';
import type { DiscRequest, UpdateRequestDto } from '../../types/requests';
import { useCatalogStore } from '@stores/catalog/catalog';
import SwalService from '@services/swal/SwalService';
import SearchableSelect from '@components/SearchableSelect.vue';
import { REJECT_REASONS } from '@helpers/rejectReasons';
import { mutateAndInvalidateSidebarSummary } from '@/app/sidebarSummary';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

export default defineComponent({
  name: 'PetitionsPage',
  components: { SearchableSelect },
  setup() {
    const queryClient = useQueryClient();
    const catalogStore = useCatalogStore();
    const requestsQuery = useAdminRequestsQuery();
    const mutations = useRequestMutations();
    const requests = computed(() => requestsQuery.data.value ?? []);
    const loading = computed(() => requestsQuery.isPending.value);
    const requestsError = computed(() => requestsQuery.isError.value);
    const retryRequests = () => requestsQuery.refetch();
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
        const dto: UpdateRequestDto = {};
        if (editForm.artistName !== editingRequest.value.artistName) dto.artistName = editForm.artistName;
        if (editForm.discName !== editingRequest.value.discName) dto.discName = editForm.discName;
        if (editForm.releaseDate !== (editingRequest.value.releaseDate ?? '')) dto.releaseDate = editForm.releaseDate;
        if (editForm.genreId !== (editingRequest.value.genre?.id ?? '')) dto.genreId = editForm.genreId || null;
        if (editForm.countryId !== (editingRequest.value.country?.id ?? '')) dto.countryId = editForm.countryId || null;
        if (editForm.ep !== editingRequest.value.ep) dto.ep = editForm.ep;
        if (editForm.debut !== editingRequest.value.debut) dto.debut = editForm.debut;
        if (editForm.adminNotes !== (editingRequest.value.adminNotes ?? '')) dto.adminNotes = editForm.adminNotes;

        await mutations.update.mutateAsync({ id: editingRequest.value.id, dto });
        editingRequest.value = null;
        SwalService.success('Petición actualizada');
      } catch (error: unknown) {
        SwalService.error(requestErrorMessage(error, 'Error al guardar'));
      } finally {
        saving.value = false;
      }
    };

    // --- Aprobar ---
    const handleApprove = async (req: DiscRequest) => {
      try {
        await mutateAndInvalidateSidebarSummary(queryClient, () => mutations.approve.mutateAsync(req.id));
        SwalService.success('Petición aprobada y disco creado');
      } catch (error: unknown) {
        SwalService.error(requestErrorMessage(error, 'Error al aprobar'));
      }
    };

    // --- Reabrir ---
    const handleReopen = async (req: DiscRequest) => {
      try {
        await mutateAndInvalidateSidebarSummary(queryClient, () => mutations.reopen.mutateAsync(req.id));
        SwalService.success('Petición reabierta');
      } catch (error: unknown) {
        SwalService.error(requestErrorMessage(error, 'Error al reabrir'));
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
        await mutateAndInvalidateSidebarSummary(queryClient, () =>
          mutations.reject.mutateAsync({ id: rejectingRequest.value!.id, notes: rejectNotes.value.trim() }));
        rejectingRequest.value = null;
        SwalService.success('Petición rechazada');
      } catch (error: unknown) {
        SwalService.error(requestErrorMessage(error, 'Error al rechazar'));
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
        pending:  'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
        approved: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
        rejected: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
      })[status];

    const tabLabel = (status: StatusFilter) =>
      ({ pending: 'pendiente', approved: 'aprobada', rejected: 'rechazada', all: '' })[status];

    const requestUserLabel = (request: DiscRequest): string | null => {
      const extraFields = request as unknown as Record<string, unknown>;
      const user = extraFields.user;
      if (!user || typeof user !== 'object') return null;
      const userFields = user as Record<string, unknown>;
      for (const field of ['username', 'name', 'email', 'id']) {
        const value = userFields[field];
        if (typeof value === 'string' && value) return value;
      }
      return null;
    };

    watch(() => requestsQuery.isError.value, (isError) => {
      if (isError) SwalService.error('No se pudieron cargar las peticiones');
    }, { immediate: true });

    return {
      catalogStore,
      requests,
      requestsQuery,
      requestsError,
      retryRequests,
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
      requestUserLabel,
    };
  },
});
</script>
