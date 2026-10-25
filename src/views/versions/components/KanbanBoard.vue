<template>
  <div class="flex-1 h-full flex flex-col gap-3">
    <!-- Formulario de la versión (compacto) -->
    <div class="p-3 border rounded bg-gray-50 space-y-2">
      <div class="flex items-center justify-between">
        <h2 class="text-base font-semibold">{{ form.version }}</h2>
        <div class="flex gap-2">
          <button @click="$emit('save-version')"
            class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs">
            💾 Guardar versión
          </button>
          <button v-if="allItemsUploaded" @click="$emit('move-to-production')"
            class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-semibold">
            🚀 Mover a Producción
          </button>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2 text-sm">
        <label class="text-xs">
          Versión
          <input :value="form.version" @input="updateForm('version', ($event.target as HTMLInputElement).value)"
            class="w-full p-1.5 border rounded text-sm" placeholder="1.2.3" />
        </label>
        <label class="text-xs">
          Release date
          <input type="date" :value="form.releaseDate"
            @input="updateForm('releaseDate', ($event.target as HTMLInputElement).value)"
            class="w-full p-1.5 border rounded text-sm" />
        </label>
      </div>
      <label class="text-xs block">
        Notas
        <textarea :value="form.notes" @input="updateForm('notes', ($event.target as HTMLTextAreaElement).value)"
          rows="2" class="w-full p-1.5 border rounded text-sm" placeholder="Notas de la versión"></textarea>
      </label>
    </div>

    <!-- Kanban columns (compactas) -->
    <div class="grid grid-cols-4 gap-2 flex-1 min-h-0">
      <div v-for="state in devStates" :key="state" class="rounded border min-h-[100px] flex flex-col overflow-hidden"
        :class="[
          dragOverState === state ? 'border-purple-500 ring-2 ring-purple-300' : getStateColor(state).border,
          getStateColor(state).bg
        ]" @dragover.prevent="$emit('dragover', state)" @dragleave="$emit('dragleave', state)"
        @drop="$emit('drop', state)">
        <!-- Cabecera columna -->
        <div class="p-2 border-b flex items-center justify-between"
          :class="[getStateColor(state).headerBg, getStateColor(state).headerBorder]">
          <h3 class="font-semibold text-xs capitalize" :class="getStateColor(state).headerText">{{ labels[state] }}</h3>
          <div class="flex items-center gap-1">
            <span class="text-xs bg-white bg-opacity-20 px-2 py-0.5 rounded font-semibold text-white shadow-sm">{{
              itemsByState(state).length }}</span>
            <button @click="toggleNewItemForm(state)"
              class="px-1.5 py-0.5 bg-green-500 text-white rounded text-xs hover:bg-green-600">
              {{ showNewItemForm[state] ? '✖' : '➕' }}
            </button>
          </div>
        </div>

        <!-- Form nuevo item -->
        <div v-if="showNewItemForm[state]" class="p-2 bg-gray-50 border-b border-gray-200 space-y-1">
          <select v-model="newItem[state].type" class="w-full p-1 border rounded text-xs">
            <option v-for="t in changeTypes" :key="t" :value="t">{{ t }}</option>
          </select>
          <input v-model="newItem[state].description" class="w-full p-1 border rounded text-xs"
            placeholder="Descripción" />
          <input v-model="newItem[state].branch" class="w-full p-1 border rounded font-mono text-xs"
            placeholder="Branch" />
          <select v-model="newItem[state].priority" class="w-full p-1 border rounded text-xs">
            <option v-for="p in priorities" :key="p.value" :value="p.value">{{ p.icon }} {{ p.label }}</option>
          </select>
          <div class="flex items-center justify-between">
            <button @click="$emit('create-item', state, newItem[state])"
              class="px-2 py-0.5 bg-green-500 text-white rounded hover:bg-green-600 text-xs">
              Guardar
            </button>
          </div>
        </div>

        <!-- Lista items -->
        <div class="p-2 space-y-2 flex-1 overflow-y-auto">
          <div v-for="it in itemsByState(state)" :key="it.id"
            class="bg-white border border-gray-200 rounded p-2 shadow-sm cursor-move" draggable="true"
            @dragstart="$emit('dragstart', it, state)">
            <div class="flex items-start justify-between gap-1">
              <div class="text-xs flex-1">
                <div class="flex items-start gap-1">
                  <!-- Priority indicator -->
                  <span v-if="!editing[it.id]" class="inline-block px-1.5 py-0.5 rounded text-xs"
                    :class="getPriorityColor(it.priority).bg">
                    {{ getPriorityColor(it.priority).icon }}
                  </span>
                  <select v-else v-model="editCache[it.id].priority" class="p-0.5 border rounded text-xs">
                    <option v-for="p in priorities" :key="p.value" :value="p.value">{{ p.icon }} {{ p.label }}</option>
                  </select>

                  <!-- Type pill / editor -->
                  <span v-if="!editing[it.id]"
                    class="inline-block px-1.5 py-0.5 rounded text-white text-xs font-semibold"
                    :class="getTypeColor(it.type)">
                    {{ it.type }}
                  </span>
                  <select v-else v-model="editCache[it.id].type" class="p-0.5 border rounded text-xs">
                    <option v-for="t in changeTypes" :key="t" :value="t">{{ t }}</option>
                  </select>

                  <!-- Description -->
                  <span v-if="!editing[it.id]" class="flex-1">{{ it.description }}</span>
                </div>

                <input v-if="editing[it.id]" v-model="editCache[it.id].description"
                  class="w-full p-0.5 border rounded text-xs mt-1" />

                <!-- Branch -->
                <div class="text-xs text-gray-600 mt-1 flex items-center gap-1" v-if="it.branch || editing[it.id]">
                  <i class="fa-solid fa-code-branch"></i>
                  <span v-if="!editing[it.id]" class="font-mono truncate flex-1">{{ it.branch }}</span>
                  <button v-if="!editing[it.id] && it.branch" @click="copyBranch(it.branch)"
                    class="px-1 py-0.5 bg-gray-200 hover:bg-gray-300 rounded text-xs transition-colors"
                    title="Copiar branch">
                    📋
                  </button>
                  <input v-else v-model="editCache[it.id].branch" class="p-0.5 border rounded text-xs font-mono flex-1"
                    placeholder="branch" />
                </div>

                <!-- User assignments - View mode (avatares debajo de la rama) -->
                <div v-if="!editing[it.id] && (it.backUser || it.frontUser)" class="mt-2 flex items-center gap-2">
                  <!-- Backend user -->
                  <div v-if="it.backUser"
                    class="flex items-center gap-1 bg-purple-50 border border-purple-200 rounded px-2 py-1">
                    <img :src="it.backUser.image" :alt="it.backUser.username"
                      class="w-5 h-5 rounded-full object-cover" />
                    <span class="text-xs text-purple-800 font-medium">🔧 {{ it.backUser.username }}</span>
                  </div>
                  <!-- Frontend user -->
                  <div v-if="it.frontUser"
                    class="flex items-center gap-1 bg-cyan-50 border border-cyan-200 rounded px-2 py-1">
                    <img :src="it.frontUser.image" :alt="it.frontUser.username"
                      class="w-5 h-5 rounded-full object-cover" />
                    <span class="text-xs text-cyan-800 font-medium">🎨 {{ it.frontUser.username }}</span>
                  </div>
                </div>

                <!-- User assignments - Edit mode (selects) -->
                <div v-if="editing[it.id]" class="mt-2 space-y-1">
                  <div class="flex items-center gap-1">
                    <span class="text-xs text-gray-600 w-16">🔧 Backend:</span>
                    <select v-model="editCache[it.id].backUserId" class="flex-1 p-0.5 border rounded text-xs">
                      <option :value="null">Sin asignar</option>
                      <option v-for="user in superusers" :key="user.id" :value="user.id">
                        {{ user.username }}
                      </option>
                    </select>
                  </div>
                  <div class="flex items-center gap-1">
                    <span class="text-xs text-gray-600 w-16">🎨 Frontend:</span>
                    <select v-model="editCache[it.id].frontUserId" class="flex-1 p-0.5 border rounded text-xs">
                      <option :value="null">Sin asignar</option>
                      <option v-for="user in superusers" :key="user.id" :value="user.id">
                        {{ user.username }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
              <div class="flex flex-col gap-0.5">
                <button v-if="!editing[it.id]" @click="startEdit(it)"
                  class="px-1 py-0.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">
                  ✏️
                </button>
                <template v-else>
                  <button @click="$emit('save-edit', it, editCache[it.id])"
                    class="px-1 py-0.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">
                    ✓
                  </button>
                  <button @click="cancelEdit(it)"
                    class="px-1 py-0.5 bg-gray-500 text-white rounded text-xs hover:bg-gray-600">
                    ✖
                  </button>
                </template>
                <button @click="$emit('remove-item', it)"
                  class="px-1 py-0.5 bg-red-500 text-white rounded text-xs hover:bg-red-600">
                  🗑
                </button>
              </div>
            </div>
          </div>
          <div v-if="!itemsByState(state).length" class="text-xs text-gray-400 text-center py-2">
            Arrastra aquí
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue';
import { Priority, type VersionItem, type CreateVersionItemDto } from '@services/versions/versions';
import type { Superuser } from '@/modules/identity/types/users';

interface VersionForm {
  version: string;
  releaseDate: string | null;
  publishedAt: string | null;
  isActive: boolean;
  notes: string;
}

const props = defineProps<{
  items: VersionItem[];
  form: VersionForm;
  dragOverState: string | null;
  superusers: Superuser[];
}>();

const emit = defineEmits<{
  (e: 'update:form', form: VersionForm): void;
  (e: 'save-version'): void;
  (e: 'move-to-production'): void;
  (e: 'create-item', state: string, payload: Partial<CreateVersionItemDto> & { branch?: string }): void;
  (e: 'dragstart', item: VersionItem, from: string): void;
  (e: 'dragover', state: string): void;
  (e: 'dragleave', state: string): void;
  (e: 'drop', state: string): void;
  (e: 'save-edit', item: VersionItem, data: { description: string; type: any; branch: string; priority: Priority; backUserId: string | null; frontUserId: string | null }): void;
  (e: 'remove-item', item: VersionItem): void;
}>();

// Computed: verificar si todos los items están en estado "done"
const allItemsUploaded = computed(() => {
  if (props.items.length === 0) return false;
  return props.items.every(item => item.state === 'done');
});

const devStates = ['todo', 'in_progress', 'in_review', 'done'] as const;
const labels: Record<(typeof devStates)[number], string> = {
  todo: 'Por hacer',
  in_progress: 'En progreso',
  in_review: 'En dev',
  done: 'Subido',
};
const changeTypes = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'] as const;

// Solo Alta, Media y Baja para kanban (sin Sugerencia)
const priorities = [
  { value: Priority.HIGH, label: 'Alta', icon: '🟢', bg: 'bg-green-200 text-green-800' },
  { value: Priority.MEDIUM, label: 'Media', icon: '🟡', bg: 'bg-yellow-200 text-yellow-800' },
  { value: Priority.LOW, label: 'Baja', icon: '🔴', bg: 'bg-red-200 text-red-800' },
];

function getPriorityColor(priority?: Priority) {
  const p = priorities.find(x => x.value === priority);
  return p || { icon: '⚪', bg: 'bg-gray-200 text-gray-800', label: 'Sin prioridad' };
}

// Colores para las columnas del kanban
function getStateColor(state: string) {
  const colors: Record<string, any> = {
    todo: {
      bg: 'bg-red-50',
      border: 'border-red-300',
      headerBg: 'bg-red-600',
      headerBorder: 'border-red-700',
      headerText: 'text-white'
    },
    in_progress: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-300',
      headerBg: 'bg-yellow-500',
      headerBorder: 'border-yellow-600',
      headerText: 'text-white'
    },
    in_review: {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      headerBg: 'bg-blue-600',
      headerBorder: 'border-blue-700',
      headerText: 'text-white'
    },
    done: {
      bg: 'bg-green-50',
      border: 'border-green-300',
      headerBg: 'bg-green-600',
      headerBorder: 'border-green-700',
      headerText: 'text-white'
    }
  };
  return colors[state] || { bg: 'bg-gray-50', border: 'border-gray-300', headerBg: 'bg-gray-100', headerBorder: 'border-gray-300', headerText: 'text-gray-800' };
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

// Form helpers
function updateForm(key: keyof VersionForm, value: any) {
  emit('update:form', { ...props.form, [key]: value });
}

// New item logic
const newItem = reactive<Record<string, Partial<CreateVersionItemDto> & { branch?: string }>>({});
const showNewItemForm = reactive<Record<string, boolean>>({});

// Initialize on mount
for (const s of devStates) {
  newItem[s] = { type: 'feat', description: '', state: s as any, branch: '', priority: Priority.MEDIUM };
  showNewItemForm[s] = false;
}

function toggleNewItemForm(state: string) {
  showNewItemForm[state] = !showNewItemForm[state];
}

function resetNewItem(state: string) {
  newItem[state] = { type: 'feat', description: '', state: state as any, branch: '', priority: Priority.MEDIUM };
  showNewItemForm[state] = false;
}

// Items by state (ordenados por prioridad: Alta -> Media -> Baja)
function itemsByState(state: string) {
  const priorityOrder: Record<Priority, number> = {
    [Priority.HIGH]: 1,
    [Priority.MEDIUM]: 2,
    [Priority.LOW]: 3,
    [Priority.SUGGESTION]: 4
  };

  return props.items
    .filter(it => it.state === state)
    .sort((a, b) => {
      const aPriority = a.priority ?? Priority.MEDIUM;
      const bPriority = b.priority ?? Priority.MEDIUM;
      return (priorityOrder[aPriority] || 99) - (priorityOrder[bPriority] || 99);
    });
}

// Edit logic
const editing = reactive<Record<string, boolean>>({});
const editCache = reactive<Record<string, { description: string; type: any; branch: string; priority: Priority; backUserId: string | null; frontUserId: string | null }>>({});

function startEdit(it: VersionItem) {
  editing[it.id] = true;
  editCache[it.id] = {
    description: it.description,
    type: it.type,
    branch: it.branch ?? '',
    priority: it.priority ?? Priority.MEDIUM,
    backUserId: it.backUser?.id ?? null,
    frontUserId: it.frontUser?.id ?? null,
  };
}

function cancelEdit(it: VersionItem) {
  editing[it.id] = false;
}

// Copy branch to clipboard
async function copyBranch(branch: string) {
  try {
    await navigator.clipboard.writeText(branch);
    // Visual feedback could be added here if needed
  } catch (err) {
    console.error('Failed to copy branch:', err);
  }
}

// Expose methods and state for parent
defineExpose({ resetNewItem, cancelEdit, editing });
</script>
