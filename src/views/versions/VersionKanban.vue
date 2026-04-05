<template>
  <div class="p-4 h-full flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-bold">Tablero (versión en desarrollo)</h1>
      <div class="flex gap-2">
        <button @click="goBack" class="px-3 py-1.5 bg-gray-700 text-white rounded hover:bg-gray-800 text-sm">
          ← Volver
        </button>
        <button @click="reload" class="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">
          Recargar
        </button>
      </div>
    </div>

    <!-- Layout principal: Backlog (izquierda) + Kanban/Mensaje (derecha) -->
    <div class="flex gap-4 flex-1 min-h-0">
      <!-- BACKLOG -->
      <BacklogPanel :items="backlog" :is-drop-target="dragOverState" @dragstart="onDragStartBacklog"
        @dragover="onDragOver" @dragleave="onDragLeave" @drop="onDropToBacklog" @item-created="onBacklogItemCreated"
        @item-updated="onBacklogItemUpdated" @item-removed="onBacklogItemRemoved" />

      <!-- KANBAN PANEL o mensaje si no hay versión -->
      <div v-if="!version" class="flex-1 flex items-center justify-center">
        <div class="p-6 border rounded bg-yellow-50 text-yellow-800 text-center max-w-md">
          <p class="text-lg font-semibold mb-2">No hay versión en desarrollo</p>
          <p class="text-sm">Crea una versión nueva desde
            <router-link class="underline font-semibold" :to="{ name: 'versions-admin' }">Gestión de
              versiones</router-link>
            para poder gestionar tareas en el tablero Kanban.
          </p>
        </div>
      </div>
      <KanbanBoard v-else ref="kanbanRef" :items="version.items" :form="form" :drag-over-state="dragOverState"
        :superusers="superusers" @update:form="form = $event" @save-version="saveVersion"
        @move-to-production="handleMoveToProduction" @create-item="createItem" @dragstart="onDragStart"
        @dragover="onDragOver" @dragleave="onDragLeave" @drop="onDrop" @save-edit="saveEdit"
        @remove-item="removeItem" />
    </div>

    <!-- Loading / error -->
    <p v-if="loading" class="text-sm text-gray-500">Cargando…</p>
    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import SwalService from '@services/swal/SwalService';
import type { Version, VersionItem, CreateVersionItemDto } from '@services/versions/versions';
import {
  getDevVersion,
  updateVersion,
  updateVersionItem,
  createVersionItem,
  removeVersionItem,
  updateItem,
} from '@services/versions/versions';
import { getSuperusers, type Superuser } from '@services/auth/auth';
import BacklogPanel from './components/BacklogPanel.vue';
import KanbanBoard from './components/KanbanBoard.vue';

const router = useRouter();
function goBack() { router.push({ name: 'versions-admin' }); }

const version = ref<Version | null>(null);
const backlog = ref<VersionItem[]>([]);
const superusers = ref<Superuser[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const kanbanRef = ref<InstanceType<typeof KanbanBoard> | null>(null);

// ------- Form versión -------
const form = ref({
  version: '',
  releaseDate: null as string | null,
  publishedAt: null as string | null,
  isActive: false,
  notes: ''
});

function toLocalDT(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalDT(local: string | null | undefined) {
  if (!local) return undefined;
  const d = new Date(local);
  return d.toISOString();
}

async function saveVersion() {
  if (!version.value) return;
  try {
    const dto = {
      version: form.value.version,
      notes: form.value.notes,
      isActive: form.value.isActive,
      releaseDate: form.value.releaseDate || undefined,
      publishedAt: fromLocalDT(form.value.publishedAt),
    };
    const updated = await updateVersion(version.value.id, dto);
    version.value = updated;
    form.value = {
      version: updated.version,
      notes: updated.notes ?? '',
      isActive: updated.isActive,
      releaseDate: updated.releaseDate ?? null,
      publishedAt: toLocalDT(updated.publishedAt),
    };
    SwalService.success('Versión guardada');
  } catch (e: any) {
    console.error(e);
    SwalService.error('No se pudo guardar la versión');
  }
}

// ------- Validación de branch -------
function validateBranchName(branch: string, type: string): { valid: boolean; error?: string } {
  if (!branch || !branch.trim()) {
    return { valid: false, error: 'La branch es obligatoria' };
  }

  const trimmedBranch = branch.trim();

  // Validar que solo contenga letras, números, guiones y una barra
  if (!/^[a-z0-9]+\/[a-z0-9-]+$/.test(trimmedBranch)) {
    return {
      valid: false,
      error: 'El formato de la branch debe ser: tipo/task-nombre (solo se permiten letras, números y guiones)'
    };
  }

  // Extraer el prefijo de la branch
  const [branchPrefix, taskName] = trimmedBranch.split('/');

  // Validar que no haya más de una barra
  if (trimmedBranch.split('/').length > 2) {
    return {
      valid: false,
      error: 'La branch solo puede tener una barra (/). Formato: tipo/task-nombre'
    };
  }

  // Mapear 'style' a 'ui'
  const expectedPrefix = type === 'style' ? 'ui' : type;

  // Validar que el prefijo coincida con el tipo
  if (branchPrefix !== expectedPrefix) {
    return {
      valid: false,
      error: `La branch debe empezar con "${expectedPrefix}/" para items de tipo "${type}"`
    };
  }

  // Validar que el nombre de la tarea no esté vacío
  if (!taskName || taskName.length === 0) {
    return {
      valid: false,
      error: 'El nombre de la tarea no puede estar vacío'
    };
  }

  return { valid: true };
}

// ------- Crear item -------
async function createItem(state: string, payload: Partial<CreateVersionItemDto> & { branch?: string }) {
  if (!version.value) return;
  if (!payload.description || !payload.type) {
    SwalService.error('Falta tipo o descripción');
    return;
  }

  // Validar formato de branch
  const branchValidation = validateBranchName(payload.branch || '', payload.type!);
  if (!branchValidation.valid) {
    SwalService.error(branchValidation.error!);
    return;
  }

  try {
    const created = await createVersionItem(version.value.id, {
      type: payload.type!,
      description: payload.description!,
      state: state as any,
      branch: payload.branch!.trim(),
    } as any);
    version.value.items.push(created);
    kanbanRef.value?.resetNewItem(state);
  } catch (e) {
    console.error(e);
    SwalService.error('No se pudo crear el item');
  }
}

// ------- Drag & Drop -------
const dragData = ref<{ id: string; from: string; source: 'kanban' | 'backlog' } | null>(null);
const dragOverState = ref<string | null>(null);

function onDragStart(it: VersionItem, from: string) {
  dragData.value = { id: it.id, from, source: 'kanban' };
}

function onDragStartBacklog(it: VersionItem) {
  dragData.value = { id: it.id, from: 'backlog', source: 'backlog' };
}

function onDragOver(state: string) {
  dragOverState.value = state;
}

function onDragLeave(state: string) {
  if (dragOverState.value === state) dragOverState.value = null;
}

async function onDrop(targetState: string) {
  const data = dragData.value;
  dragOverState.value = null;
  dragData.value = null;
  if (!version.value || !data) return;

  // Desde backlog al kanban
  if (data.source === 'backlog') {
    const it = backlog.value.find(i => i.id === data.id);
    if (!it) return;
    try {
      // Determinar la prioridad a enviar (convertir SUGGESTION a LOW)
      let priorityToSend = it.priority;
      if (priorityToSend === 'suggestion') {
        priorityToSend = 'low' as any;
      }

      // Asignar el item a la versión y cambiar su estado
      const updated = await updateItem(it.id, {
        version: version.value.id,
        state: targetState as any,
        priority: priorityToSend
      });
      backlog.value = backlog.value.filter(x => x.id !== it.id);
      version.value.items.push(updated);
    } catch (e) {
      console.error(e);
      SwalService.error('No se pudo mover el item del backlog');
    }
    return;
  }

  // Desde kanban a kanban (cambio de estado)
  if (data.from === targetState) return;
  const it = version.value.items.find(i => i.id === data.id);
  if (!it) return;
  const prev = it.state;
  try {
    const updated = await updateVersionItem(version.value.id, it.id, {
      state: targetState as any,
      priority: it.priority, // <--- IMPORTANTE: Mantener la prioridad
      // branch: it.branch   // (Opcional) Si también se te borraba la branch, añádela aquí
    });
    Object.assign(it, updated);
  } catch (e) {
    (it as any).state = prev as any;
    console.error(e);
    SwalService.error('No se pudo mover el item');
  }
}

async function onDropToBacklog(priority: string) {
  const data = dragData.value;
  dragOverState.value = null;
  dragData.value = null;
  if (!version.value || !data) return;
  if (data.source === 'backlog') return;

  const it = version.value.items.find(i => i.id === data.id);
  if (!it) return;

  try {
    // Desasignar el item de la versión y asignar la prioridad
    const updated = await updateItem(it.id, { version: null, priority: priority as any });
    version.value.items = version.value.items.filter(x => x.id !== it.id);
    backlog.value.push(updated);
    SwalService.success('Item movido al backlog');
  } catch (e) {
    console.error(e);
    SwalService.error('No se pudo mover el item al backlog');
  }
}

// ------- Editar / eliminar item -------
async function saveEdit(it: VersionItem, dto: { description: string; type: any; branch: string; priority: any; backUserId: string | null; frontUserId: string | null }) {
  if (!version.value) return;

  // Validar formato de branch
  const branchValidation = validateBranchName(dto.branch || '', dto.type);
  if (!branchValidation.valid) {
    SwalService.error(branchValidation.error!);
    return;
  }

  try {
    const updated = await updateVersionItem(version.value.id, it.id, dto as any);

    // El backend devuelve backUser/frontUser con solo el id, necesitamos enriquecerlos
    const updatedWithIds = updated as any;

    // Enriquecer backUser si existe
    if (updatedWithIds.backUser && updatedWithIds.backUser.id) {
      const backUser = superusers.value.find(u => u.id === updatedWithIds.backUser.id);
      if (backUser) {
        updatedWithIds.backUser = {
          id: backUser.id,
          username: backUser.username,
          isActive: true,
          image: backUser.image
        };
      }
    }

    // Enriquecer frontUser si existe
    if (updatedWithIds.frontUser && updatedWithIds.frontUser.id) {
      const frontUser = superusers.value.find(u => u.id === updatedWithIds.frontUser.id);
      if (frontUser) {
        updatedWithIds.frontUser = {
          id: frontUser.id,
          username: frontUser.username,
          isActive: true,
          image: frontUser.image
        };
      }
    }

    Object.assign(it, updated);
    kanbanRef.value!.editing[it.id] = false;
  } catch (e) {
    console.error(e);
    SwalService.error('No se pudo actualizar el item');
  }
}

async function removeItem(it: VersionItem) {
  if (!version.value) return;
  const ok = await SwalService.confirm('¿Eliminar item?', 'Esta acción no se puede deshacer', 'warning')
    .then(r => r.isConfirmed).catch(() => false);
  if (!ok) return;
  try {
    await removeVersionItem(version.value.id, it.id);
    version.value.items = version.value.items.filter(x => x.id !== it.id);
  } catch (e) {
    console.error(e);
    SwalService.error('No se pudo eliminar el item');
  }
}

// ------- Backlog CRUD handlers -------
function onBacklogItemCreated(item: VersionItem) {
  backlog.value.push(item);
}

function onBacklogItemUpdated(item: VersionItem) {
  const idx = backlog.value.findIndex(x => x.id === item.id);
  if (idx !== -1) {
    backlog.value[idx] = item;
  }
}

function onBacklogItemRemoved(itemId: string) {
  backlog.value = backlog.value.filter(x => x.id !== itemId);
}

// ------- Mover a producción -------
async function handleMoveToProduction() {
  if (!version.value) return;

  const ok = await SwalService.confirm(
    '¿Mover a producción?',
    'Esta acción cambiará el estado de la versión de desarrollo a producción. ¿Continuar?',
    'question'
  ).then(r => r.isConfirmed).catch(() => false);

  if (!ok) return;

  try {
    const updated = await updateVersion(version.value.id, {
      status: 'en_produccion',
      publishedAt: new Date().toISOString(),
    });
    version.value = updated;
    SwalService.success('Versión movida a producción');
    router.push({ name: 'versions-admin' });
  } catch (e: any) {
    console.error(e);
    SwalService.error('No se pudo mover la versión a producción');
  }
}


// ------- Utils -------
async function reload() { await loadDraft(); }

async function loadDraft() {
  loading.value = true;
  error.value = null;
  try {
    const response = await getDevVersion();
    if (response) {
      version.value = response.version;
      backlog.value = response.backlog;
      const v = response.version;
      form.value = {
        version: v.version,
        notes: v.notes ?? '',
        isActive: v.isActive,
        releaseDate: v.releaseDate ?? null,
        publishedAt: toLocalDT(v.publishedAt),
      };
    } else {
      version.value = null;
      backlog.value = [];
    }
  } catch (e: any) {
    console.error(e);
    error.value = 'Error cargando la versión en desarrollo';
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await loadDraft();
  // Cargar superusers
  try {
    superusers.value = await getSuperusers();
  } catch (e) {
    console.error('Error loading superusers:', e);
  }
});
</script>
