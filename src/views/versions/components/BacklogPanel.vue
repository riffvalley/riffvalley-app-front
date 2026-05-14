<template>
  <div class="w-80 flex-shrink-0 border rounded bg-gray-50 h-full flex flex-col border-gray-300">
    <!-- Header -->
    <div class="p-2 bg-gray-200 border-b border-gray-300 flex items-center justify-between">
      <div>
        <h3 class="font-semibold text-sm">📋 Backlog</h3>
        <span class="text-xs text-gray-500">{{ items.length }} items</span>
      </div>
      <button @click="showNewItemForm = !showNewItemForm"
        class="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600">
        {{ showNewItemForm ? '✖' : '➕' }}
      </button>
    </div>

    <!-- Form nuevo item -->
    <div v-if="showNewItemForm" class="p-2 bg-gray-100 border-b border-gray-200 space-y-2">
      <select v-model="newItem.type" class="w-full p-1.5 border rounded text-xs">
        <option v-for="t in changeTypes" :key="t" :value="t">{{ t }}</option>
      </select>
      <input v-model="newItem.description" class="w-full p-1.5 border rounded text-xs" placeholder="Descripción" />
      <input v-model="newItem.branch" class="w-full p-1.5 border rounded font-mono text-xs" placeholder="Branch" />
      <select v-model="newItem.priority" class="w-full p-1.5 border rounded text-xs">
        <option v-for="p in priorities" :key="p.value" :value="p.value">{{ p.label }}</option>
      </select>
      <div class="flex justify-end">
        <button @click="handleCreateItem" class="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600">
          Guardar
        </button>
      </div>
    </div>

    <!-- Secciones por prioridad -->
    <div class="flex-1 min-h-0 overflow-y-auto">
      <div v-for="priority in priorities" :key="priority.value" class="border-b border-gray-200">
        <!-- Cabecera prioridad -->
        <div class="p-2 flex items-center justify-between cursor-pointer" :class="priority.bgHeader"
          @click="toggleSection(priority.value)">
          <span class="text-xs font-semibold" :class="priority.textColor">
            {{ priority.icon }} {{ priority.label }} ({{ itemsByPriority(priority.value).length }})
          </span>
          <span class="text-xs">{{ expandedSections[priority.value] ? '▼' : '▶' }}</span>
        </div>

        <!-- Items de esa prioridad -->
        <div v-show="expandedSections[priority.value]" class="p-2 space-y-2" :class="[
          priority.bgItems,
          isDropTarget === priority.value ? 'ring-2 ring-purple-400 ring-inset' : ''
        ]" @dragover.prevent="$emit('dragover', priority.value)" @dragleave="$emit('dragleave', priority.value)"
          @drop.prevent="handleDrop(priority.value)">
          <div v-for="it in itemsByPriority(priority.value)" :key="it.id"
            class="bg-white border rounded p-2 shadow-sm cursor-move text-sm" :class="priority.borderColor"
            draggable="true" @dragstart="handleDragStart(it)" @dragend="handleDragEnd">
            <!-- Vista normal -->
            <template v-if="!editing[it.id]">
              <div class="flex items-start justify-between gap-1">
                <div class="flex-1">
                  <div class="flex items-start gap-1">
                    <span class="inline-block px-1.5 py-0.5 rounded text-white text-xs font-semibold"
                      :class="getTypeColor(it.type)">
                      {{ it.type }}
                    </span>
                    <span class="text-xs">{{ it.description }}</span>
                  </div>
                  <div class="text-xs text-gray-500 mt-1 flex items-center gap-1" v-if="it.branch">
                    <i class="fa-solid fa-code-branch"></i>
                    <span class="font-mono truncate flex-1">{{ it.branch }}</span>
                    <button @click="copyBranch(it.branch)"
                      class="px-1 py-0.5 bg-gray-200 hover:bg-gray-300 rounded text-xs transition-colors"
                      title="Copiar branch">
                      📋
                    </button>
                  </div>
                </div>
                <div class="flex gap-0.5">
                  <button @click="startEdit(it)"
                    class="px-1 py-0.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">
                    ✏️
                  </button>
                  <button @click="handleRemoveItem(it)"
                    class="px-1 py-0.5 bg-red-500 text-white rounded text-xs hover:bg-red-600">
                    🗑
                  </button>
                </div>
              </div>
            </template>

            <!-- Vista edición -->
            <template v-else>
              <div class="space-y-1">
                <select v-model="editCache[it.id].type" class="w-full p-1 border rounded text-xs">
                  <option v-for="t in changeTypes" :key="t" :value="t">{{ t }}</option>
                </select>
                <input v-model="editCache[it.id].description" class="w-full p-1 border rounded text-xs" />
                <input v-model="editCache[it.id].branch" class="w-full p-1 border rounded font-mono text-xs" />
                <select v-model="editCache[it.id].priority" class="w-full p-1 border rounded text-xs">
                  <option v-for="p in priorities" :key="p.value" :value="p.value">{{ p.label }}</option>
                </select>
                <div class="flex gap-1 justify-end">
                  <button @click="handleSaveEdit(it)"
                    class="px-2 py-0.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">
                    ✓
                  </button>
                  <button @click="cancelEdit(it)"
                    class="px-2 py-0.5 bg-gray-500 text-white rounded text-xs hover:bg-gray-600">
                    ✖
                  </button>
                </div>
              </div>
            </template>
          </div>

          <div v-if="!itemsByPriority(priority.value).length" class="text-xs text-gray-400 text-center py-1">
            Sin items
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { Priority, type VersionItem, type CreateVersionItemDto } from '@services/versions/versions';
import { createItem, updateItem, removeItem } from '@services/versions/versions';
import SwalService from '@services/swal/SwalService';

const props = defineProps<{
  items: VersionItem[];
  isDropTarget: string | null; // Ahora es el nombre de la prioridad o null
}>();

const emit = defineEmits<{
  (e: 'dragstart', item: VersionItem): void;
  (e: 'dragover', priority: Priority): void;
  (e: 'dragleave', priority: Priority): void;
  (e: 'drop', priority: Priority): void;
  (e: 'priority-changed', item: VersionItem, newPriority: Priority): void;
  (e: 'item-created', item: VersionItem): void;
  (e: 'item-updated', item: VersionItem): void;
  (e: 'item-removed', itemId: string): void;
}>();

// Track which item is being dragged within the backlog
const draggedItem = ref<VersionItem | null>(null);

function handleDragStart(item: VersionItem) {
  draggedItem.value = item;
  emit('dragstart', item);
}

async function handleDrop(targetPriority: Priority) {
  // If we're dragging an item from within the backlog
  if (draggedItem.value) {
    const item = draggedItem.value;

    // Don't do anything if dropping in the same priority zone
    if (item.priority === targetPriority) {
      draggedItem.value = null;
      return;
    }

    try {
      // Update the item's priority via API
      const updated = await updateItem(item.id, {
        priority: targetPriority,
      });

      emit('item-updated', updated);
      SwalService.success('Prioridad actualizada');
    } catch (e) {
      console.error(e);
      SwalService.error('No se pudo cambiar la prioridad');
    } finally {
      draggedItem.value = null;
    }
  } else {
    // Item is being dragged from Kanban board
    emit('drop', targetPriority);
  }
}

function handleDragEnd() {
  draggedItem.value = null;
}

const changeTypes = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'] as const;

const priorities = [
  { value: Priority.HIGH, label: 'Alta', icon: '🟢', bgHeader: 'bg-green-100', bgItems: 'bg-green-50', textColor: 'text-green-700', borderColor: 'border-green-300' },
  { value: Priority.MEDIUM, label: 'Media', icon: '🟡', bgHeader: 'bg-yellow-100', bgItems: 'bg-yellow-50', textColor: 'text-yellow-700', borderColor: 'border-yellow-300' },
  { value: Priority.LOW, label: 'Baja', icon: '🔴', bgHeader: 'bg-red-100', bgItems: 'bg-red-50', textColor: 'text-red-700', borderColor: 'border-red-300' },
  { value: Priority.SUGGESTION, label: 'Sugerencia', icon: '🟣', bgHeader: 'bg-purple-100', bgItems: 'bg-purple-50', textColor: 'text-purple-700', borderColor: 'border-purple-300' },
];

// Secciones expandidas
const expandedSections = reactive<Record<string, boolean>>({
  [Priority.HIGH]: true,
  [Priority.MEDIUM]: true,
  [Priority.LOW]: true,
  [Priority.SUGGESTION]: true,
});

function toggleSection(priority: string) {
  expandedSections[priority] = !expandedSections[priority];
}

function itemsByPriority(priority: Priority) {
  return props.items.filter(it => it.priority === priority);
}

// Colores para los tipos de cambio
function getTypeColor(type: string) {
  const colors: Record<string, string> = {
    feat: 'bg-gradient-to-r from-green-500 to-green-600',
    fix: 'bg-gradient-to-r from-red-500 to-red-600',
    docs: 'bg-gradient-to-r from-blue-500 to-blue-600',
    style: 'bg-gradient-to-r from-purple-500 to-purple-600',
    refactor: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
    perf: 'bg-gradient-to-r from-orange-500 to-orange-600',
    test: 'bg-gradient-to-r from-pink-500 to-pink-600',
    build: 'bg-gradient-to-r from-indigo-500 to-indigo-600',
    ci: 'bg-gradient-to-r from-cyan-500 to-cyan-600',
    chore: 'bg-gradient-to-r from-gray-500 to-gray-600',
    revert: 'bg-gradient-to-r from-rose-500 to-rose-600',
  };
  return colors[type] || 'bg-gray-800';
}

// Form nuevo item
const showNewItemForm = ref(false);
const newItem = reactive<Partial<CreateVersionItemDto>>({
  type: 'feat',
  description: '',
  branch: '',
  priority: Priority.MEDIUM,
  state: 'todo',
});

function resetNewItem() {
  newItem.type = 'feat';
  newItem.description = '';
  newItem.branch = '';
  newItem.priority = Priority.MEDIUM;
  newItem.state = 'todo';
  showNewItemForm.value = false;
}

// Validación de branch (copiada de VersionKanban)
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

async function handleCreateItem() {
  if (!newItem.description || !newItem.type) {
    SwalService.error('Falta tipo o descripción');
    return;
  }

  // Validar formato de branch
  const branchValidation = validateBranchName(newItem.branch || '', newItem.type!);
  if (!branchValidation.valid) {
    SwalService.error(branchValidation.error!);
    return;
  }

  try {
    const created = await createItem({
      type: newItem.type!,
      description: newItem.description!,
      branch: newItem.branch!.trim(),
      priority: newItem.priority,
      state: 'todo',
    });
    emit('item-created', created);
    resetNewItem();
    SwalService.success('Item creado');
  } catch (e) {
    console.error(e);
    SwalService.error('No se pudo crear el item');
  }
}

// Edición
const editing = reactive<Record<string, boolean>>({});
const editCache = reactive<Record<string, { type: string; description: string; branch: string; priority: Priority }>>({});

function startEdit(it: VersionItem) {
  editing[it.id] = true;
  editCache[it.id] = {
    type: it.type,
    description: it.description,
    branch: it.branch ?? '',
    priority: it.priority ?? Priority.MEDIUM,
  };
}

function cancelEdit(it: VersionItem) {
  editing[it.id] = false;
}

async function handleSaveEdit(it: VersionItem) {
  const dto = editCache[it.id];

  // Validar formato de branch
  const branchValidation = validateBranchName(dto.branch || '', dto.type);
  if (!branchValidation.valid) {
    SwalService.error(branchValidation.error!);
    return;
  }

  try {
    const updated = await updateItem(it.id, {
      type: dto.type as any,
      description: dto.description,
      branch: dto.branch.trim(),
      priority: dto.priority,
    });
    emit('item-updated', updated);
    editing[it.id] = false;
    SwalService.success('Item actualizado');
  } catch (e) {
    console.error(e);
    SwalService.error('No se pudo actualizar el item');
  }
}

async function handleRemoveItem(it: VersionItem) {
  const ok = await SwalService.confirm('¿Eliminar item?', 'Esta acción no se puede deshacer', 'Sí, eliminar', 'Cancelar')
    .then(r => r.isConfirmed).catch(() => false);
  if (!ok) return;
  try {
    await removeItem(it.id);
    emit('item-removed', it.id);
    SwalService.success('Item eliminado');
  } catch (e) {
    console.error(e);
    SwalService.error('No se pudo eliminar el item');
  }
}

// Copy branch to clipboard
async function copyBranch(branch: string) {
  try {
    await navigator.clipboard.writeText(branch);
  } catch (err) {
    console.error('Failed to copy branch:', err);
  }
}
</script>
