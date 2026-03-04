<template>
  <div class="p-6 max-w-5xl mx-auto">

    <!-- Cabecera -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl font-bold">Lanzamientos nacionales</h1>
      <div class="flex items-center gap-3">
        <span class="text-sm text-gray-400">{{ releases.length }} registros</span>
        <button
          v-if="releases.length > 0"
          @click="copyFormatted"
          :class="copied ? 'bg-green-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-rv-blue hover:text-rv-blue'"
          class="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors"
        >
          <i :class="copied ? 'fas fa-check' : 'fas fa-copy'" class="text-xs"></i>
          {{ copied ? 'Copiado' : 'Copiar lista' }}
        </button>
      </div>
    </div>

    <!-- Filtros -->
    <div class="flex flex-wrap gap-3 mb-6">
      <div>
        <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Mes</label>
        <select
          v-model="filters.month"
          @change="fetchReleases"
          class="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-rv-blue"
        >
          <option :value="undefined">Todos</option>
          <option v-for="m in MONTHS" :key="m.value" :value="m.value">{{ m.label }}</option>
        </select>
      </div>
      <div>
        <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Año</label>
        <select
          v-model="filters.year"
          @change="fetchReleases"
          class="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-rv-blue"
        >
          <option :value="undefined">Todos</option>
          <option v-for="y in YEARS" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12 text-gray-400">Cargando...</div>

    <!-- Vacío -->
    <div v-else-if="releases.length === 0"
      class="text-center py-12 text-gray-400 bg-white rounded-2xl shadow-rv">
      <i class="fas fa-inbox text-3xl mb-3 block text-gray-300"></i>
      No hay lanzamientos para los filtros seleccionados.
    </div>

    <!-- Secciones -->
    <div v-else class="space-y-5">
      <div v-for="section in sections" :key="section.type">
        <template v-if="byType(section.type).length > 0">
          <p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">{{ section.title }}</p>
          <ul class="space-y-1.5">
            <li
              v-for="release in byType(section.type)"
              :key="release.id"
              class="bg-white rounded-xl shadow-rv px-4 py-2.5 flex items-center gap-3"
            >
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-800 truncate">
                  <span class="text-gray-400 font-normal">[{{ release.genre }}]</span>
                  {{ release.artistName }} — {{ release.discName }}
                </p>
                <div class="flex items-center gap-3 mt-0.5">
                  <span class="text-xs text-gray-400"><i class="far fa-calendar mr-1"></i>{{ formatDate(release.releaseDay) }}</span>
                  <span v-if="release.publishAt" class="text-xs text-yellow-600 font-medium">
                    <i class="fas fa-clock mr-1"></i>Publica el {{ formatDate(release.publishAt) }}
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-1.5 flex-shrink-0">
                <button @click="openEdit(release)" title="Editar"
                  class="w-7 h-7 flex items-center justify-center rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors">
                  <i class="fas fa-pen text-xs"></i>
                </button>
                <button @click="handleDelete(release)" title="Eliminar"
                  class="w-7 h-7 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                  <i class="fas fa-trash text-xs"></i>
                </button>
              </div>
            </li>
          </ul>
        </template>
      </div>
    </div>

    <!-- Modal editar -->
    <div
      v-if="editingRelease"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="editingRelease = null"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <h2 class="text-xl font-bold mb-5">Editar lanzamiento</h2>
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
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Tipo</label>
            <div class="flex gap-2">
              <button
                v-for="type in DISC_TYPES"
                :key="type.value"
                type="button"
                @click="editForm.discType = type.value"
                :class="editForm.discType === type.value
                  ? 'bg-rv-navy text-white border-rv-navy'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-rv-navy'"
                class="flex-1 py-2 rounded-xl border text-sm font-medium transition-colors"
              >
                {{ type.label }}
              </button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Género</label>
            <input v-model="editForm.genre" type="text"
              class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rv-pink" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Fecha de lanzamiento</label>
            <input v-model="editForm.releaseDay" type="date" min="2026-01-01"
              class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rv-pink" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Fecha en la que lo podemos publicar
            </label>
            <p class="text-xs text-gray-400 mb-2">Dejalo en blanco si es posible publicarlo ya.</p>
            <input v-model="editForm.publishAt" type="date"
              class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rv-pink" />
          </div>

        </div>

        <div class="flex justify-end gap-2 mt-6">
          <button
            @click="editingRelease = null"
            class="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            @click="handleSaveEdit"
            :disabled="saving"
            class="px-5 py-2 rounded-xl text-sm font-bold bg-rv-navy text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <span v-if="saving">Guardando...</span>
            <span v-else>Guardar</span>
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, onMounted } from 'vue';
import {
  getNationalReleases,
  updateNationalRelease,
  deleteNationalRelease,
  type NationalRelease,
  type DiscType,
} from '@services/national-releases/nationalReleases';
import SwalService from '@services/swal/SwalService';

const DISC_TYPES: { value: DiscType; label: string }[] = [
  { value: 'single', label: 'Single' },
  { value: 'ep', label: 'EP' },
  { value: 'album', label: 'Álbum' },
];

const MONTHS = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
];

const YEARS = [2025, 2026];

export default defineComponent({
  name: 'NationalReleasesAdmin',
  setup() {
    const releases = ref<NationalRelease[]>([]);
    const loading = ref(false);
    const copied = ref(false);

    const sections = [
      { title: 'Discos', type: 'album' as DiscType },
      { title: 'EPs', type: 'ep' as DiscType },
      { title: 'Singles', type: 'single' as DiscType },
    ];

    const byType = (type: DiscType) => releases.value.filter(r => r.discType === type);

    const copyFormatted = async () => {
      const byType = (type: DiscType) =>
        releases.value
          .filter(r => r.discType === type)
          .map(r => `[${r.genre}] ${r.artistName} - ${r.discName}`)
          .join('\n');

      const sections = [
        { title: 'DISCOS', type: 'album' as DiscType },
        { title: 'EPS', type: 'ep' as DiscType },
        { title: 'SINGLES', type: 'single' as DiscType },
      ];

      const text = sections
        .map(s => `${s.title}\n${byType(s.type)}`)
        .join('\n\n');

      await navigator.clipboard.writeText(text);
      copied.value = true;
      setTimeout(() => { copied.value = false; }, 2000);
    };

    const now = new Date();
    const filters = reactive<{ month?: number; year?: number }>({
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    });

    const fetchReleases = async () => {
      loading.value = true;
      try {
        const params: { month?: number; year?: number } = {};
        if (filters.month !== undefined) params.month = filters.month;
        if (filters.year !== undefined) params.year = filters.year;
        releases.value = await getNationalReleases(params);
      } catch {
        SwalService.error('No se pudieron cargar los lanzamientos');
      } finally {
        loading.value = false;
      }
    };

    // --- Editar ---
    const editingRelease = ref<NationalRelease | null>(null);
    const saving = ref(false);
    const editForm = reactive({
      artistName: '',
      discName: '',
      discType: 'album' as DiscType,
      genre: '',
      releaseDay: '',
      publishAt: '',
    });

    const openEdit = (release: NationalRelease) => {
      editingRelease.value = release;
      editForm.artistName = release.artistName;
      editForm.discName = release.discName;
      editForm.discType = release.discType;
      editForm.genre = release.genre;
      editForm.releaseDay = release.releaseDay;
      editForm.publishAt = release.publishAt ?? '';
    };

    const handleSaveEdit = async () => {
      if (!editingRelease.value) return;
      saving.value = true;
      try {
        const dto: Record<string, any> = {};
        if (editForm.artistName !== editingRelease.value.artistName) dto.artistName = editForm.artistName;
        if (editForm.discName !== editingRelease.value.discName) dto.discName = editForm.discName;
        if (editForm.discType !== editingRelease.value.discType) dto.discType = editForm.discType;
        if (editForm.genre !== editingRelease.value.genre) dto.genre = editForm.genre;
        if (editForm.releaseDay !== editingRelease.value.releaseDay) dto.releaseDay = editForm.releaseDay;
        const currentPublishAt = editingRelease.value.publishAt ?? '';
        if (editForm.publishAt !== currentPublishAt) dto.publishAt = editForm.publishAt || null;

        const updated = await updateNationalRelease(editingRelease.value.id, dto);
        const idx = releases.value.findIndex(r => r.id === updated.id);
        if (idx !== -1) releases.value[idx] = updated;
        editingRelease.value = null;
        SwalService.success('Lanzamiento actualizado');
      } catch (error: any) {
        SwalService.error(error.response?.data?.message || 'Error al guardar');
      } finally {
        saving.value = false;
      }
    };

    // --- Eliminar ---
    const handleDelete = async (release: NationalRelease) => {
      const result = await SwalService.confirm(
        `¿Eliminar "${release.artistName} — ${release.discName}"?`,
        'Sí, eliminar',
        'Cancelar'
      );
      if (!result.isConfirmed) return;
      try {
        await deleteNationalRelease(release.id);
        releases.value = releases.value.filter(r => r.id !== release.id);
        SwalService.success('Lanzamiento eliminado');
      } catch (error: any) {
        SwalService.error(error.response?.data?.message || 'Error al eliminar');
      }
    };

    // --- Utilidades ---
    const formatDate = (dateStr: string) =>
      new Date(dateStr).toLocaleDateString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });

    const discTypeLabel = (type: DiscType) =>
      ({ single: 'Single', ep: 'EP', album: 'Álbum' })[type];

    const discTypeClass = (type: DiscType) =>
      ({
        single: 'bg-blue-100 text-blue-700',
        ep: 'bg-purple-100 text-purple-700',
        album: 'bg-green-100 text-green-700',
      })[type];

    onMounted(() => {
      fetchReleases();
    });

    return {
      releases,
      loading,
      copied,
      copyFormatted,
      sections,
      byType,
      filters,
      MONTHS,
      YEARS,
      DISC_TYPES,
      fetchReleases,
      editingRelease,
      editForm,
      saving,
      openEdit,
      handleSaveEdit,
      handleDelete,
      formatDate,
      discTypeLabel,
      discTypeClass,
    };
  },
});
</script>
