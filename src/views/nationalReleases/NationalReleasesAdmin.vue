<template>
  <div class="p-6 max-w-5xl mx-auto">

    <!-- Cabecera -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl font-bold">Lanzamientos nacionales</h1>
      <div class="flex items-center gap-3">
        <span class="text-sm text-gray-400">{{ releases.length }} registros</span>
        <button
          @click="openBulk"
          class="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors bg-white text-gray-600 border border-gray-200 hover:border-rv-pink hover:text-rv-pink"
        >
          <i class="fas fa-upload text-xs"></i>
          Carga masiva
        </button>
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

    <!-- Meses pendientes -->
    <div v-if="pendingMonths.length > 0" class="flex flex-wrap gap-2 mb-4">
      <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide self-center">Pendientes:</span>
      <button
        v-for="m in pendingMonths"
        :key="m"
        @click="openPendingModal(m)"
        class="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
      >
        <i class="fas fa-clock text-[10px]"></i>
        {{ MONTHS.find(mo => mo.value === m)?.label }}
      </button>
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

    <!-- Secciones por día -->
    <div v-else class="space-y-5">
      <div v-for="group in byDay" :key="group.day">
        <p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">{{ group.label }}</p>
        <ul class="space-y-1.5">
          <li
            v-for="release in group.releases"
            :key="release.id"
            class="bg-white rounded-xl shadow-rv px-4 py-2.5 flex items-center gap-3"
          >
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-800 flex items-center gap-2 flex-wrap">
                  <span class="text-gray-400 font-normal">[{{ release.genre }}]</span>
                  <span class="truncate">{{ release.artistName }} — {{ release.discName }}</span>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" :class="discTypeClass(release.discType)">
                    {{ discTypeLabel(release.discType) }}
                  </span>
                </p>
                <div class="flex items-center gap-3 mt-0.5">
                  <span class="text-xs text-gray-400"><i class="far fa-calendar mr-1"></i>{{ formatDate(release.releaseDay) }}</span>
                  <span v-if="release.publishAt" class="text-xs text-yellow-600 font-medium">
                    <i class="fas fa-clock mr-1"></i>Publica el {{ formatDate(release.publishAt) }}
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                <!-- Enlace -->
                <a v-if="release.link" :href="release.link" target="_blank" :title="release.link"
                  class="w-7 h-7 flex items-center justify-center rounded-full transition-colors"
                  :class="linkClass(release.link)">
                  <i :class="linkIcon(release.link)" class="text-sm"></i>
                </a>
                <!-- Toggle aprobado -->
                <button
                  @click="toggleApproved(release)"
                  :title="release.approved ? 'Aprobado — click para desaprobar' : 'No aprobado — click para aprobar'"
                  :class="release.approved
                    ? 'bg-green-100 text-green-600 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'"
                  class="flex items-center gap-1.5 px-2.5 h-7 rounded-full text-xs font-semibold transition-colors"
                >
                  <i :class="release.approved ? 'fas fa-check-circle' : 'fas fa-circle'" class="text-xs"></i>
                  {{ release.approved ? 'Aprobado' : 'Pendiente' }}
                </button>
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

          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Enlace</label>
            <input v-model="editForm.link" type="url" placeholder="https://..."
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

    <!-- Modal pendientes por mes -->
    <div
      v-if="pendingModal.show"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="pendingModal.show = false"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 flex flex-col max-h-[80vh]">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold">
            Pendientes — {{ MONTHS.find(m => m.value === pendingModal.month)?.label }}
          </h2>
          <button @click="pendingModal.show = false" class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-xmark"></i>
          </button>
        </div>

        <div v-if="pendingModal.loading" class="text-center py-8 text-gray-400">Cargando...</div>
        <div v-else-if="pendingModal.releases.length === 0" class="text-center py-8 text-gray-400">
          No hay lanzamientos pendientes.
        </div>
        <div v-else class="space-y-5 overflow-y-auto flex-1">
          <div v-for="group in pendingByDay" :key="group.day">
            <p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">{{ group.label }}</p>
            <ul class="space-y-1.5">
              <li
                v-for="release in group.releases"
                :key="release.id"
                class="bg-white rounded-xl shadow-rv px-4 py-2.5 flex items-center gap-3"
              >
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-gray-800 flex items-center gap-2 flex-wrap">
                    <span class="text-gray-400 font-normal">[{{ release.genre }}]</span>
                    <span class="truncate">{{ release.artistName }} — {{ release.discName }}</span>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" :class="discTypeClass(release.discType)">
                      {{ discTypeLabel(release.discType) }}
                    </span>
                  </p>
                  <div class="flex items-center gap-3 mt-0.5">
                    <span class="text-xs text-gray-400"><i class="far fa-calendar mr-1"></i>{{ formatDate(release.releaseDay) }}</span>
                    <span v-if="release.publishAt" class="text-xs text-yellow-600 font-medium">
                      <i class="fas fa-clock mr-1"></i>Publica el {{ formatDate(release.publishAt) }}
                    </span>
                  </div>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                  <a v-if="release.link" :href="release.link" target="_blank" :title="release.link"
                    class="w-7 h-7 flex items-center justify-center rounded-full transition-colors"
                    :class="linkClass(release.link)">
                    <i :class="linkIcon(release.link)" class="text-sm"></i>
                  </a>
                  <button
                    @click="toggleApproved(release)"
                    :title="release.approved ? 'Aprobado — click para desaprobar' : 'No aprobado — click para aprobar'"
                    :class="release.approved ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'"
                    class="flex items-center gap-1.5 px-2.5 h-7 rounded-full text-xs font-semibold transition-colors"
                  >
                    <i :class="release.approved ? 'fas fa-check-circle' : 'fas fa-circle'" class="text-xs"></i>
                    {{ release.approved ? 'Aprobado' : 'Pendiente' }}
                  </button>
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
          </div>
        </div>
      </div>
    </div>

    <!-- Modal carga masiva -->
    <div
      v-if="showBulk"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="showBulk = false"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 flex flex-col max-h-[90vh]">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-bold">Carga masiva</h2>
          <button @click="showBulk = false" class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-xmark"></i>
          </button>
        </div>

        <p class="text-xs text-gray-400 mb-2 font-mono bg-gray-50 rounded-lg px-3 py-2 leading-relaxed">
          Fecha [género] banda - título (single/ep/disco) enlace<br/>
          <span class="text-gray-300">Ej: 2026-03-10 [Rock nacional] Babasónicos - Tema A (single) https://...</span>
        </p>

        <textarea
          v-model="bulkText"
          rows="12"
          placeholder="2026-03-10 [Rock nacional] Babasónicos - Tema A (single)&#10;2026-03-15 [Metal] Metallica - Black Album (disco) https://spotify.com/..."
          class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rv-pink resize-none flex-1"
          spellcheck="false"
        ></textarea>

        <!-- Preview parseado -->
        <div v-if="bulkParsed.length > 0" class="mt-2 text-xs text-gray-500 flex items-center gap-1.5">
          <i class="fas fa-check-circle text-green-500"></i>
          {{ bulkParsed.length }} línea{{ bulkParsed.length !== 1 ? 's' : '' }} válida{{ bulkParsed.length !== 1 ? 's' : '' }}
          <span v-if="bulkParseErrors.length > 0" class="text-yellow-500 ml-2">
            · {{ bulkParseErrors.length }} con error
          </span>
        </div>
        <ul v-if="bulkParseErrors.length > 0" class="mt-1 space-y-0.5 max-h-20 overflow-auto">
          <li v-for="e in bulkParseErrors" :key="e" class="text-xs text-red-400 font-mono">{{ e }}</li>
        </ul>

        <div class="mt-3 flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
          <p v-if="bulkError" class="text-red-500 text-xs flex-1">{{ bulkError }}</p>
          <button @click="showBulk = false"
            class="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-colors">
            Cancelar
          </button>
          <button @click="handleBulkSubmit" :disabled="bulkSaving || bulkParsed.length === 0"
            class="px-5 py-2 rounded-xl text-sm font-bold bg-rv-navy text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
            <span v-if="bulkSaving">Enviando...</span>
            <span v-else>Enviar {{ bulkParsed.length }} {{ bulkParsed.length === 1 ? 'lanzamiento' : 'lanzamientos' }}</span>
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, computed, onMounted } from 'vue';
import {
  getNationalReleases,
  updateNationalRelease,
  deleteNationalRelease,
  createNationalReleaseBulk,
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

    function groupByDay(list: NationalRelease[]) {
      const sorted = [...list].sort((a, b) => a.releaseDay.localeCompare(b.releaseDay));
      const groups: { day: string; label: string; releases: NationalRelease[] }[] = [];
      for (const release of sorted) {
        const existing = groups.find(g => g.day === release.releaseDay);
        if (existing) {
          existing.releases.push(release);
        } else {
          const label = new Date(release.releaseDay + 'T12:00:00').toLocaleDateString('es-ES', {
            weekday: 'long', day: 'numeric', month: 'long',
          });
          groups.push({ day: release.releaseDay, label, releases: [release] });
        }
      }
      return groups;
    }

    const byDay = computed(() => groupByDay(releases.value));
    const pendingByDay = computed(() => groupByDay(pendingModal.releases));

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

    const pendingMonths = ref<number[]>([]);

    const fetchReleases = async () => {
      loading.value = true;
      try {
        const params: { month?: number; year?: number } = {};
        if (filters.month !== undefined) params.month = filters.month;
        if (filters.year !== undefined) params.year = filters.year;
        const result = await getNationalReleases(params);
        releases.value = result.data;
        if (result.pendingMonths) pendingMonths.value = result.pendingMonths;
      } catch {
        SwalService.error('No se pudieron cargar los lanzamientos');
      } finally {
        loading.value = false;
      }
    };

    // --- Modal pendientes ---
    const pendingModal = reactive<{ show: boolean; month: number; loading: boolean; releases: NationalRelease[] }>({
      show: false, month: 0, loading: false, releases: [],
    });

    const openPendingModal = async (month: number) => {
      pendingModal.month = month;
      pendingModal.releases = [];
      pendingModal.loading = true;
      pendingModal.show = true;
      try {
        const result = await getNationalReleases({ month, year: filters.year, approved: false });
        pendingModal.releases = result.data;
      } catch {
        SwalService.error('No se pudieron cargar los pendientes');
      } finally {
        pendingModal.loading = false;
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
      link: '',
    });

    const openEdit = (release: NationalRelease) => {
      editingRelease.value = release;
      editForm.artistName = release.artistName;
      editForm.discName = release.discName;
      editForm.discType = release.discType;
      editForm.genre = release.genre;
      editForm.releaseDay = release.releaseDay;
      editForm.publishAt = release.publishAt ?? '';
      editForm.link = release.link ?? '';
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
        const currentLink = editingRelease.value.link ?? '';
        if (editForm.link !== currentLink) dto.link = editForm.link || null;

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

    // --- Carga masiva ---
    const showBulk = ref(false);
    const bulkSaving = ref(false);
    const bulkError = ref('');
    const bulkText = ref('');

    const TYPE_MAP: Record<string, DiscType> = {
      single: 'single', ep: 'ep', disco: 'album', album: 'album',
    };

    const MONTH_MAP: Record<string, string> = {
      enero: '01', febrero: '02', marzo: '03', abril: '04',
      mayo: '05', junio: '06', julio: '07', agosto: '08',
      septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
    };

    function parseDate(raw: string): string | null {
      // YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
      // "D de mes" o "DD de mes"
      const m = raw.match(/^(\d{1,2})\s+de\s+(\w+)$/i);
      if (m) {
        const month = MONTH_MAP[m[2].toLowerCase()];
        if (!month) return null;
        const year = new Date().getFullYear();
        return `${year}-${month}-${m[1].padStart(2, '0')}`;
      }
      return null;
    }

    const LINE_RE = /^(.+?)\s+\[([^\]]+)\]\s+(.+?)\s+[—–-]\s+(.+?)\s+\((single|ep|disco|album)\)(?:\s+(https?:\/\/\S+))?$/i;

    function parseLine(line: string) {
      const m = line.match(LINE_RE);
      if (!m) return null;
      const [, dateRaw, genre, artistName, discName, typeRaw, link] = m;
      const releaseDay = parseDate(dateRaw.trim());
      if (!releaseDay) return null;
      return {
        releaseDay,
        genre: genre.trim(),
        artistName: artistName.trim(),
        discName: discName.trim(),
        discType: TYPE_MAP[typeRaw.toLowerCase()],
        ...(link ? { link } : {}),
      };
    }

    const bulkParsed = computed(() =>
      bulkText.value.split('\n').map(l => l.trim()).filter(l => l.length > 0).flatMap(l => {
        const r = parseLine(l);
        return r ? [r] : [];
      })
    );

    const bulkParseErrors = computed(() =>
      bulkText.value.split('\n').map(l => l.trim()).filter(l => l.length > 0).filter(l => !parseLine(l))
    );

    const openBulk = () => {
      bulkText.value = '';
      bulkError.value = '';
      showBulk.value = true;
    };

    const handleBulkSubmit = async () => {
      bulkError.value = '';
      if (bulkParsed.value.length === 0) return;
      bulkSaving.value = true;
      try {
        const created = await createNationalReleaseBulk(bulkParsed.value as any);
        releases.value.push(...created);
        showBulk.value = false;
        SwalService.success(`${created.length} lanzamiento${created.length !== 1 ? 's' : ''} añadido${created.length !== 1 ? 's' : ''}`);
      } catch (error: any) {
        bulkError.value = error.response?.data?.message || 'Error al enviar';
      } finally {
        bulkSaving.value = false;
      }
    };

    // --- Aprobar ---
    const toggleApproved = async (release: NationalRelease) => {
      const newValue = !release.approved;
      release.approved = newValue;
      try {
        await updateNationalRelease(release.id, { approved: newValue });
        if (pendingModal.show && pendingModal.releases.every(r => r.approved)) {
          pendingMonths.value = pendingMonths.value.filter(m => m !== pendingModal.month);
          pendingModal.show = false;
        }
      } catch (error: any) {
        release.approved = !newValue;
        SwalService.error(error.response?.data?.message || 'Error al actualizar');
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

    const linkIcon = (url: string) => {
      if (url.includes('spotify.com')) return 'fa-brands fa-spotify';
      if (url.includes('youtube.com') || url.includes('youtu.be')) return 'fa-brands fa-youtube';
      if (url.includes('bandcamp.com')) return 'fa-brands fa-bandcamp';
      return 'fa-solid fa-link';
    };

    const linkClass = (url: string) => {
      if (url.includes('spotify.com')) return 'bg-green-50 text-[#1DB954] hover:bg-green-100';
      if (url.includes('youtube.com') || url.includes('youtu.be')) return 'bg-red-50 text-red-500 hover:bg-red-100';
      if (url.includes('bandcamp.com')) return 'bg-sky-50 text-sky-500 hover:bg-sky-100';
      return 'bg-gray-50 text-gray-500 hover:bg-gray-100';
    };

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
      byDay,
      pendingByDay,
      filters,
      MONTHS,
      YEARS,
      DISC_TYPES,
      fetchReleases,
      pendingMonths,
      pendingModal,
      openPendingModal,
      editingRelease,
      editForm,
      saving,
      openEdit,
      handleSaveEdit,
      handleDelete,
      toggleApproved,
      showBulk,
      bulkText,
      bulkParsed,
      bulkParseErrors,
      bulkSaving,
      bulkError,
      openBulk,
      handleBulkSubmit,
      formatDate,
      linkIcon,
      linkClass,
      discTypeLabel,
      discTypeClass,
    };
  },
});
</script>
