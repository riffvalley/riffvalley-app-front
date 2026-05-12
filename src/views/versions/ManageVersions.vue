<template>
  <div class="p-6 space-y-6">
    <h1 class="text-2xl md:text-3xl font-bold"><i class="fa-solid fa-code-branch mr-2"></i>Gestionar versiones</h1>

    <!-- Barra de acciones -->
    <div class="flex items-center gap-3">
      <button v-if="!hasDevVersion" @click="openCreateModal"
        class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors">
        ➕ Nueva versión
      </button>
    </div>

    <!-- Tabla responsiva de versiones (SOLO LECTURA) -->
    <div class="overflow-x-auto w-full">
      <table class="w-full border border-gray-300">
        <thead class="bg-gray-200">
          <tr>
            <th class="p-3 border text-left">Versión</th>
            <th class="p-3 border text-left">Notas</th>
            <th class="p-3 border text-left">Release</th>
            <th class="p-3 border text-left">Estado</th>
            <th class="p-3 border text-left">Publicada</th>
            <th class="p-3 border text-left">Items</th>
            <th class="p-3 border text-left">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in versions" :key="v.id" class="border hover:bg-gray-50">
            <!-- Versión -->
            <td class="p-3 border">
              <div class="font-semibold">{{ v.version }}</div>
              <div class="text-xs text-gray-500">ID: {{ v.id }}</div>
            </td>

            <!-- Notas -->
            <td class="p-3 border">
              <div class="text-sm">{{ v.notes || '—' }}</div>
            </td>

            <!-- Release Date -->
            <td class="p-3 border">
              <span class="text-sm">{{ v.releaseDate || '—' }}</span>
            </td>

            <!-- Estado -->
            <td class="p-3 border">
              <span class="inline-block px-3 py-1 rounded text-white text-sm font-semibold"
                :class="v.status === 'en_desarrollo' ? 'bg-blue-500' : 'bg-green-600'">
                {{ v.status === 'en_desarrollo' ? '🔧 Desarrollo' : '🚀 Producción' }}
              </span>
            </td>

            <!-- Publicada -->
            <td class="p-3 border">
              <span class="text-sm text-gray-600">
                {{ v.publishedAt ? new Date(v.publishedAt).toLocaleString() : '—' }}
              </span>
            </td>

            <!-- Items -->
            <td class="p-3 border">
              <button @click="openItemsModal(v)"
                class="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-800 text-sm">
                Ver Items ({{ v.items.length }})
              </button>
            </td>

            <!-- Acciones versión -->
            <td class="p-3 border">
              <div class="flex gap-2">
                <!-- Versión en desarrollo -->
                <template v-if="v.status === 'en_desarrollo'">
                  <button @click="goToKanban"
                    class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">
                    📋 Kanban
                  </button>
                  <button @click="confirmDeleteVersion(v)"
                    class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm">
                    Eliminar
                  </button>
                </template>
                <!-- Versión en producción -->
                <template v-else>
                  <button @click="openEditNameModal(v)"
                    class="px-3 py-1 bg-amber-500 text-white rounded hover:bg-amber-600 text-sm">
                    ✏️ Editar Nombre
                  </button>
                  <button @click="openEditLinkModal(v)"
                    class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">
                    🔗 Link Telegram
                  </button>
                </template>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal crear versión -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="closeCreateModal">
      <div class="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 transform transition-all">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-2xl font-bold text-gray-800">Nueva Versión</h3>
          <button @click="closeCreateModal" class="text-gray-400 hover:text-gray-600 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              Versión <span class="text-red-500">*</span>
            </label>
            <input v-model="createForm.version" placeholder="1.0.0"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              Fecha de Release <span class="text-red-500">*</span>
            </label>
            <input type="date" v-model="createForm.releaseDate"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              Notas <span class="text-gray-400 text-xs">(opcional)</span>
            </label>
            <textarea v-model="createForm.notes" placeholder="Describe los cambios de esta versión..." rows="4"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"></textarea>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button @click="createVersionFromModal"
            class="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg">
            ✓ Crear Versión
          </button>
          <button @click="closeCreateModal"
            class="px-4 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all">
            Cancelar
          </button>
        </div>
      </div>
    </div>

    <!-- Modal items -->
    <div v-if="showItemsModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="closeItemsModal">
      <div class="bg-white rounded-lg shadow-2xl max-w-4xl w-full p-6 max-h-[90vh] flex flex-col">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-2xl font-bold text-gray-800">
            Items de {{ selectedVersion?.version }}
          </h3>
          <button @click="closeItemsModal" class="text-gray-400 hover:text-gray-600 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="overflow-auto flex-1">
          <table class="w-full border border-gray-300">
            <thead class="bg-gray-100 sticky top-0">
              <tr>
                <th class="p-2 border text-left text-sm">Tipo</th>
                <th class="p-2 border text-left text-sm">Descripción</th>
                <th class="p-2 border text-left text-sm">Estado</th>
                <th class="p-2 border text-left text-sm">Branch</th>
                <th class="p-2 border text-left text-sm">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="it in sortedItems" :key="it.id" class="hover:bg-gray-50">
                <!-- Tipo -->
                <td class="p-2 border">
                  <select v-if="editingItem === it.id" v-model="editCache.type"
                    class="w-full p-1 border rounded text-sm">
                    <option v-for="t in changeTypes" :key="t" :value="t">{{ t }}</option>
                  </select>
                  <span v-else class="text-sm font-mono">{{ it.type }}</span>
                </td>

                <!-- Descripción -->
                <td class="p-2 border">
                  <input v-if="editingItem === it.id" v-model="editCache.description"
                    class="w-full p-1 border rounded text-sm" />
                  <span v-else class="text-sm cursor-pointer hover:text-blue-600" @click="startEditItem(it)">
                    {{ it.description }}
                  </span>
                </td>

                <!-- Estado (solo lectura) -->
                <td class="p-2 border">
                  <span class="text-sm text-gray-600">{{ it.state }}</span>
                </td>

                <!-- Branch (solo lectura) -->
                <td class="p-2 border">
                  <span class="text-sm font-mono text-gray-600">{{ (it as any).branch || '—' }}</span>
                </td>

                <!-- Acciones -->
                <td class="p-2 border">
                  <div class="flex gap-2">
                    <button v-if="editingItem === it.id" @click="saveItemEdit(it)"
                      class="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs">
                      ✓
                    </button>
                    <button v-if="editingItem === it.id" @click="cancelEditItem"
                      class="px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-xs">
                      ✖
                    </button>
                    <button @click="removeItem(it)"
                      class="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs">
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div v-if="!selectedVersion?.items.length" class="text-center py-8 text-gray-500">
            No hay items en esta versión
          </div>
        </div>
      </div>
    </div>

    <!-- Modal editar nombre de versión -->
    <div v-if="showEditNameModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="closeEditNameModal">
      <div class="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-2xl font-bold text-gray-800">Editar Nombre de Versión</h3>
          <button @click="closeEditNameModal" class="text-gray-400 hover:text-gray-600 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              Nombre de Versión <span class="text-red-500">*</span>
            </label>
            <input v-model="editNameForm.version" placeholder="1.0.0"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button @click="saveVersionName"
            class="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg">
            ✓ Guardar
          </button>
          <button @click="closeEditNameModal"
            class="px-4 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all">
            Cancelar
          </button>
        </div>
      </div>
    </div>

    <!-- Modal editar link de Telegram -->
    <div v-if="showEditLinkModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="closeEditLinkModal">
      <div class="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-2xl font-bold text-gray-800">Link de Telegram</h3>
          <button @click="closeEditLinkModal" class="text-gray-400 hover:text-gray-600 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              URL de Telegram
            </label>
            <input v-model="editLinkForm.link" placeholder="https://t.me/..."
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button @click="saveVersionLink"
            class="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg">
            ✓ Guardar
          </button>
          <button @click="closeEditLinkModal"
            class="px-4 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import SwalService from '@services/swal/SwalService';
import type {
  Version,
  VersionItem,
  CreateVersionDto,
} from '@services/versions/versions';
import {
  listVersions,
  createVersion,
  updateVersion,
  removeVersion,
  updateVersionItem,
  removeVersionItem,
} from '@services/versions/versions';

const router = useRouter();


const versions = ref<Version[]>([]);

const changeTypes = [
  'feat',
  'fix',
  'docs',
  'style',
  'refactor',
  'perf',
  'test',
  'build',
  'ci',
  'chore',
  'revert',
];

// Modal crear versión
const showCreateModal = ref(false);
const createForm = ref({
  version: '',
  releaseDate: '',
  notes: '',
});

// Modal items
const showItemsModal = ref(false);
const selectedVersion = ref<Version | null>(null);
const editingItem = ref<string | null>(null);
const editCache = ref({
  type: '',
  description: '',
});

// Modal editar nombre
const showEditNameModal = ref(false);
const editNameForm = ref({
  version: '',
  versionId: '',
});

// Modal editar link
const showEditLinkModal = ref(false);
const editLinkForm = ref({
  link: '',
  versionId: '',
});

// Computed: verificar si existe versión en desarrollo
const hasDevVersion = computed(() => {
  return versions.value.some(v => v.status === 'en_desarrollo');
});

// Computed: ordenar items por tipo (feat, fix, resto alfabético)
const sortedItems = computed(() => {
  if (!selectedVersion.value?.items) return [];

  return [...selectedVersion.value.items].sort((a, b) => {
    // feat siempre primero
    if (a.type === 'feat' && b.type !== 'feat') return -1;
    if (a.type !== 'feat' && b.type === 'feat') return 1;

    // fix segundo (después de feat)
    if (a.type === 'fix' && b.type !== 'fix' && b.type !== 'feat') return -1;
    if (a.type !== 'fix' && a.type !== 'feat' && b.type === 'fix') return 1;

    // El resto alfabéticamente
    return a.type.localeCompare(b.type);
  });
});

async function load() {
  const data = await listVersions();
  versions.value = data;
}

function openCreateModal() {
  createForm.value = { version: '', releaseDate: '', notes: '' };
  showCreateModal.value = true;
}

function closeCreateModal() {
  showCreateModal.value = false;
}

async function createVersionFromModal() {
  if (!createForm.value.version || !createForm.value.releaseDate) {
    SwalService.error('La versión y la fecha de release son obligatorias');
    return;
  }

  // Validar que la fecha de release no sea anterior a la última versión
  if (versions.value.length > 0) {
    // Ordenar versiones por releaseDate descendente para obtener la más reciente
    const sortedVersions = [...versions.value]
      .filter(v => v.releaseDate) // Solo versiones con releaseDate
      .sort((a, b) => new Date(b.releaseDate!).getTime() - new Date(a.releaseDate!).getTime());

    if (sortedVersions.length > 0) {
      const latestVersion = sortedVersions[0];
      const latestReleaseDate = new Date(latestVersion.releaseDate!);
      const newReleaseDate = new Date(createForm.value.releaseDate);

      if (newReleaseDate < latestReleaseDate) {
        SwalService.error(
          `La fecha de release no puede ser anterior a la última versión (${latestVersion.version}: ${latestVersion.releaseDate})`
        );
        return;
      }
    }
  }

  try {
    const dto: CreateVersionDto = {
      version: createForm.value.version,
      releaseDate: createForm.value.releaseDate,
      notes: createForm.value.notes || undefined,
    };

    const created = await createVersion(dto);

    // Asegurar que items existe
    if (!created.items) {
      created.items = [];
    }

    versions.value.push(created);
    SwalService.success('Versión creada');
  } catch (e) {
    console.error(e);
    SwalService.error('Error creando versión');
  } finally {
    closeCreateModal();
  }
}

function goToKanban() {
  router.push({ name: 'versions-kanban' });
}

function openEditNameModal(v: Version) {
  editNameForm.value = {
    version: v.version,
    versionId: v.id,
  };
  showEditNameModal.value = true;
}

function closeEditNameModal() {
  showEditNameModal.value = false;
}

async function saveVersionName() {
  if (!editNameForm.value.version) {
    SwalService.error('El nombre de versión es obligatorio');
    return;
  }

  try {
    const updated = await updateVersion(editNameForm.value.versionId, {
      version: editNameForm.value.version,
    });

    const version = versions.value.find(v => v.id === editNameForm.value.versionId);
    if (version) {
      version.version = updated.version;
    }

    SwalService.success('Nombre actualizado');
    closeEditNameModal();
  } catch (e) {
    console.error(e);
    SwalService.error('No se pudo actualizar el nombre');
  }
}

function openEditLinkModal(v: Version) {
  editLinkForm.value = {
    link: v.link || '',
    versionId: v.id,
  };
  showEditLinkModal.value = true;
}

function closeEditLinkModal() {
  showEditLinkModal.value = false;
}

async function saveVersionLink() {
  try {
    const updated = await updateVersion(editLinkForm.value.versionId, {
      link: editLinkForm.value.link || null,
    });

    const version = versions.value.find(v => v.id === editLinkForm.value.versionId);
    if (version) {
      version.link = updated.link;
    }

    SwalService.success('Link actualizado');
    closeEditLinkModal();
  } catch (e) {
    console.error(e);
    SwalService.error('No se pudo actualizar el link');
  }
}

function openItemsModal(v: Version) {
  selectedVersion.value = v;
  showItemsModal.value = true;
}

function closeItemsModal() {
  showItemsModal.value = false;
  selectedVersion.value = null;
  editingItem.value = null;
}

function startEditItem(it: VersionItem) {
  editingItem.value = it.id;
  editCache.value = {
    type: it.type,
    description: it.description,
  };
}

function cancelEditItem() {
  editingItem.value = null;
}

async function saveItemEdit(it: VersionItem) {
  if (!selectedVersion.value) return;

  try {
    const updated = await updateVersionItem(selectedVersion.value.id, it.id, {
      type: editCache.value.type as any,
      description: editCache.value.description,
    });
    Object.assign(it, updated);
    editingItem.value = null;
    SwalService.success('Item actualizado');
  } catch (e) {
    console.error(e);
    SwalService.error('No se pudo actualizar el item');
  }
}

async function removeItem(it: VersionItem) {
  if (!selectedVersion.value) return;

  const ok = await SwalService.confirm(
    '¿Eliminar item?',
    'Esta acción no se puede deshacer',
    'warning'
  )
    .then((r) => r.isConfirmed)
    .catch(() => false);
  if (!ok) return;

  try {
    await removeVersionItem(selectedVersion.value.id, it.id);
    selectedVersion.value.items = selectedVersion.value.items.filter((x) => x.id !== it.id);

    // Actualizar también en la lista principal
    const mainVersion = versions.value.find(v => v.id === selectedVersion.value!.id);
    if (mainVersion) {
      mainVersion.items = mainVersion.items.filter((x) => x.id !== it.id);
    }

    SwalService.success('Item eliminado');
  } catch (e) {
    console.error(e);
    SwalService.error('No se pudo eliminar el item');
  }
}

async function confirmDeleteVersion(v: Version) {
  const ok = await SwalService.confirm(
    '¿Eliminar versión?',
    'Se eliminarán también sus items',
    'warning'
  )
    .then((r) => r.isConfirmed)
    .catch(() => false);
  if (!ok) return;

  try {
    await removeVersion(v.id);
    versions.value = versions.value.filter((x) => x.id !== v.id);
    SwalService.success('Versión eliminada');
  } catch (e) {
    console.error(e);
    SwalService.error('No se pudo eliminar la versión');
  }
}

async function reload() {
  await load();
}

onMounted(load);
</script>
