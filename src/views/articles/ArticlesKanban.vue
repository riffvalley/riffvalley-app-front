<template>
    <div class="p-6 min-h-[calc(100vh-64px)] flex flex-col">
        <div class="flex items-center justify-between mb-6">
            <h1 class="text-2xl font-semibold">Tablero de Artículos</h1>
            <div class="flex gap-2 items-center">
                <!-- User Filter -->
                <div class="relative group">
                    <select v-model="selectedUserId" @change="reload"
                        class="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-2.5">
                        <!-- <option value="">Todos los usuarios</option> REMOVED -->
                        <option v-for="user in users" :key="user.id" :value="user.id">
                            {{ user.username }}
                        </option>
                    </select>
                </div>

                <button class="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800" @click="openCreate">
                    Nuevo Artículo
                </button>

            </div>
        </div>

        <!-- Loading / Error -->
        <div v-if="loading" class="text-center py-10">Cargando artículos...</div>
        <div v-else-if="error" class="text-red-500 text-center py-10">{{ error }}</div>

        <!-- Kanban Board -->
        <div v-else class="flex gap-4 h-full overflow-x-auto pb-4">
            <div v-for="col in columns" :key="col.id"
                class="flex-1 min-w-[220px] rounded-xl p-2 flex flex-col max-h-full"
                :class="[col.bgClass, col.borderClass]" @dragover.prevent="onDragOver" @drop="onDrop(col.id)">
                <!-- Column Header -->
                <h2 class="font-bold mb-4 flex items-center justify-between sticky top-0 pb-2 z-10"
                    :class="[col.textClass, col.bgClass]">
                    {{ col.label }}
                    <span class="text-sm px-2 py-0.5 rounded-full" :class="col.countClass">
                        {{ getItems(col.id).length }}
                    </span>
                </h2>

                <!-- Cards Container -->
                <div class="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                    <div v-for="item in getItems(col.id)" :key="item.id"
                        class="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-move hover:shadow-md transition-shadow group relative"
                        draggable="true" @dragstart="onDragStart(item)">
                        <!-- Card Content -->
                        <div class="mb-2">
                            <div class="flex justify-between items-start mb-1">
                                <span class="text-[10px] font-bold px-2 py-0.5 rounded" :class="getTypeColor(item.type)">
                                    {{ item.type }}
                                </span>
                            </div>
                            <h3 class="font-semibold text-gray-900 leading-tight">
                                {{ item.name }}
                            </h3>
                        </div>

                        <!-- User Selector & Actions -->
                        <div class="mt-3 space-y-3">
                            <!-- User Selector (Click to Edit) -->
                            <div class="relative group mt-3">
                                <!-- Visual Display (Click to edit) -->
                                <div v-if="editingUserItemId !== item.id" @click="startEditingUser(item.id)"
                                    class="flex items-center gap-2 p-1.5 rounded-lg border border-transparent bg-gray-50 transition-all hover:bg-gray-100 cursor-pointer">
                                    <template v-if="item.user">
                                        <img v-if="item.user.image" :src="item.user.image"
                                            class="w-5 h-5 rounded-full object-cover bg-gray-200" alt="Avatar" />
                                        <div v-else
                                            class="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-[10px] font-bold text-black/50">
                                            {{ (item.user.username || '?').charAt(0).toUpperCase() }}
                                        </div>
                                        <span class="text-xs font-medium text-gray-700 truncate min-w-0 flex-1">{{
                                            item.user.username || 'Usuario desconocido' }}</span>
                                    </template>
                                    <template v-else>
                                        <div class="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                                            <i class="fa-solid fa-user text-gray-400 text-[10px]"></i>
                                        </div>
                                        <span class="text-xs text-gray-500 flex-1">Sin asignar</span>
                                    </template>
                                </div>

                                <!-- Actual Select (Visible only when editing) -->
                                <select v-else :value="item.user?.id || ''" @change="onUserChange(item, $event)"
                                    @blur="stopEditingUser" ref="userSelectRef"
                                    class="w-full text-xs p-1.5 bg-white border border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200">
                                    <option value="">Sin asignar</option>
                                    <option v-for="user in users" :key="user.id" :value="user.id">
                                        {{ user.username }}
                                    </option>
                                </select>
                            </div>

                            <!-- Editor Selector (Click to Edit) -->
                            <div class="relative group mt-1">
                                <!-- Visual Display (Click to edit) -->
                                <div v-if="editingEditorItemId !== item.id" @click="startEditingEditor(item.id)"
                                    class="flex items-center gap-2 p-1.5 rounded-lg border border-transparent bg-purple-50/50 transition-all hover:bg-purple-100/50 cursor-pointer">
                                    <template v-if="item.editor">
                                        <img v-if="item.editor.image" :src="item.editor.image"
                                            class="w-5 h-5 rounded-full object-cover bg-gray-200" alt="Avatar" />
                                        <div v-else
                                            class="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-[10px] font-bold text-purple-500">
                                            {{ (item.editor.username || '?').charAt(0).toUpperCase() }}
                                        </div>
                                        <span class="text-xs font-medium text-purple-700 truncate min-w-0 flex-1">
                                            <span class="text-[10px] text-purple-400 mr-1">Editor:</span>
                                            {{ item.editor.username || 'Editor desconocido' }}
                                        </span>
                                    </template>
                                    <template v-else>
                                        <div class="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center">
                                            <i class="fa-solid fa-pen-nib text-purple-300 text-[10px]"></i>
                                        </div>
                                        <span class="text-xs text-purple-400 flex-1">Sin editor</span>
                                    </template>
                                </div>

                                <!-- Actual Select (Visible only when editing) -->
                                <select v-else :value="item.editor?.id || ''" @change="onEditorChange(item, $event)"
                                    @blur="stopEditingEditor" ref="editorSelectRef"
                                    class="w-full text-xs p-1.5 bg-white border border-purple-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200">
                                    <option value="">Sin editor</option>
                                    <option v-for="user in users" :key="user.id" :value="user.id">
                                        {{ user.username }}
                                    </option>
                                </select>
                            </div>

                            <!-- Action Buttons and Date -->
                            <div class="flex items-center justify-between pt-2 border-t border-gray-100 mt-2">
                                <!-- Date -->
                                <span class="text-xs text-gray-400">{{ fmtDate(item.updateDate || '') }}</span>

                                <!-- Buttons -->
                                <div class="flex items-center gap-2">
                                    <!-- Edit -->
                                    <button @click="openEdit(item)"
                                        class="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                        title="Editar">
                                        <i class="fa-solid fa-pen text-xs"></i>
                                    </button>

                                    <!-- Delete -->
                                    <button @click="confirmDelete(item)"
                                        class="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                        title="Eliminar">
                                        <i class="fa-solid fa-trash text-xs"></i>
                                    </button>

                                    <!-- Link -->
                                    <a v-if="item.link" :href="item.link" target="_blank"
                                        class="w-8 h-8 flex items-center justify-center rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                                        title="Abrir enlace">
                                        <i class="fa-solid fa-link text-xs"></i>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Create/Edit Modal -->
        <div v-if="showModal" class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
            @click.self="closeModal">
            <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
                <h3 class="text-lg font-bold">{{ isEditing ? 'Editar Artículo' : 'Nuevo Artículo' }}</h3>

                <div>
                    <label class="block text-sm font-medium mb-1">Título</label>
                    <input v-model="form.name" type="text"
                        class="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-black/40" />
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1">Tipo</label>
                    <select v-model="form.type"
                        class="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-black/40">
                        <option v-for="t in types" :key="t" :value="t">{{ t }}</option>
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1">Enlace (Opcional)</label>
                    <input v-model="form.link" type="url"
                        class="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-black/40" />
                </div>

                <div class="flex justify-end gap-2 pt-2">
                    <button @click="closeModal" class="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
                    <button @click="save"
                        class="px-4 py-2 bg-black text-white rounded-lg hover:opacity-90">Guardar</button>
                </div>
            </div>
        </div>

    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, nextTick } from 'vue';
import {
    getArticles,
    createArticle,
    updateArticle,
    deleteArticle,
    type Article,
    type ArticleState,
    type ArticleType,
    ARTICLE_TYPES,
    toISO
} from '@services/articles/articles';
import { getUsersRv, type Superuser } from '@services/auth/auth';
import { useAuthStore } from '@stores/auth/auth';
import SwalService from '@services/swal/SwalService';

const authStore = useAuthStore();

// --- Types ---
type ColumnId = ArticleState;

interface Column {
    id: ColumnId;
    label: string;
    bgClass: string;
    borderClass: string;
    textClass: string;
    countClass: string;
}

// --- Constants ---
const columns: Column[] = [
    {
        id: 'not_started',
        label: 'Not Started',
        bgClass: 'bg-red-50',
        borderClass: 'border-t-4 border-red-500',
        textClass: 'text-red-900',
        countClass: 'bg-red-200 text-red-800'
    },
    {
        id: 'in_progress',
        label: 'In Progress',
        bgClass: 'bg-orange-50',
        borderClass: 'border-t-4 border-orange-500',
        textClass: 'text-orange-900',
        countClass: 'bg-orange-200 text-orange-800'
    },
    {
        id: 'editing',
        label: 'Editing',
        bgClass: 'bg-yellow-50',
        borderClass: 'border-t-4 border-yellow-500',
        textClass: 'text-yellow-900',
        countClass: 'bg-yellow-200 text-yellow-800'
    },
    {
        id: 'ready',
        label: 'Ready',
        bgClass: 'bg-blue-50',
        borderClass: 'border-t-4 border-blue-500',
        textClass: 'text-blue-900',
        countClass: 'bg-blue-200 text-blue-800'
    },
    {
        id: 'published',
        label: 'Published',
        bgClass: 'bg-green-50',
        borderClass: 'border-t-4 border-green-500',
        textClass: 'text-green-900',
        countClass: 'bg-green-200 text-green-800'
    },
];

const types = ARTICLE_TYPES;

// --- State ---
const items = ref<Article[]>([]);
const users = ref<Superuser[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const draggedItem = ref<Article | null>(null);
const selectedUserId = ref<string>(''); // For filtering

// User Edit State
const editingUserItemId = ref<string | null>(null);
const userSelectRef = ref<HTMLSelectElement | null>(null);

// Editor Edit State
const editingEditorItemId = ref<string | null>(null);
const editorSelectRef = ref<HTMLSelectElement | null>(null);

// Modal state
const showModal = ref(false);
const isEditing = ref(false);
const editingId = ref<string | null>(null);
const form = reactive({
    name: '',
    type: 'articulo' as ArticleType, // Default
    link: ''
});

// --- Getters ---
function getItems(status: ArticleState) {
    return items.value.filter(i => i.status === status);
}

function fmtDate(iso: string) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString() + ' ' + new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getTypeColor(type: ArticleType) {
    switch (type) {
        case 'cronica':
            return 'bg-blue-100 text-blue-700';
        case 'festival':
            return 'bg-purple-100 text-purple-700';
        case 'review':
            return 'bg-orange-100 text-orange-700';
        case 'entrevista':
            return 'bg-yellow-100 text-yellow-700';
        case 'articulo':
        default:
            return 'bg-pink-100 text-pink-700';
    }
}

// --- Logic ---
async function reload() {
    loading.value = true;
    error.value = null;
    try {
        // 1. Fetch Users first if empty
        if (users.value.length === 0) {
            users.value = await getUsersRv();
        }

        // 2. Set default user if needed
        if (!selectedUserId.value && authStore.userId) {
             // Verify if current user is in the list (Riff Valley user)
             const isRv = users.value.some(u => u.id === authStore.userId);
             if (isRv) {
                 selectedUserId.value = authStore.userId;
             } else if (users.value.length > 0) {
                 // Fallback to first user if current is not in list (e.g. admin w/o RV role?)
                 selectedUserId.value = users.value[0].id;
             }
        }

        // 3. Fetch Articles for selected user
        if (selectedUserId.value) {
            items.value = await getArticles(selectedUserId.value);
        } else {
            items.value = []; // No user selected -> no articles
        }

    } catch (e: any) {
        console.error(e);
        error.value = e?.response?.data?.message || 'Error cargando datos';
        SwalService.error('Error cargando datos');
    } finally {
        loading.value = false;
    }
}

// --- Drag & Drop ---
function onDragStart(item: Article) {
    draggedItem.value = item;
}

function onDragOver(event: DragEvent) {
    if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
    }
}

async function onDrop(targetState: ColumnId) {
    if (!draggedItem.value) return;

    const item = draggedItem.value;

    if (targetState === 'published') {
        draggedItem.value = null;
        return;
    }

    if (item.status === targetState) return;

    const originalState = item.status;

    item.status = targetState;

    try {
        await updateArticle(item.id, { status: targetState });
    } catch (e: any) {
        console.error(e);
        item.status = originalState;
        const errorMessage = e?.response?.data?.message || 'No se pudo actualizar el estado';
        SwalService.error(errorMessage);
    } finally {
        draggedItem.value = null;
    }
}

// --- User Assignment ---
async function startEditingUser(itemId: string) {
    editingUserItemId.value = itemId;
    await nextTick();
    const selects = userSelectRef.value as unknown as HTMLSelectElement[];
    if (Array.isArray(selects) && selects.length > 0) {
        selects[0]?.focus();
    } else if (userSelectRef.value) {
        (userSelectRef.value as HTMLSelectElement).focus();
    }
}

function stopEditingUser() {
    editingUserItemId.value = null;
}

async function onUserChange(item: Article, event: Event) {
    const select = event.target as HTMLSelectElement;
    const newUserId = select.value || null; // null if empty string

    // Stop editing
    editingUserItemId.value = null;

    const oldUser = item.user;

    if (newUserId) {
        // Encontrar el username para la UI optimista
        const u = users.value.find(x => x.id === newUserId);
        item.user = {
            id: newUserId,
            username: u?.username || '...',
            image: u?.image
        };
    } else {
        item.user = undefined;
    }

    try {
        await updateArticle(item.id, { userId: newUserId || undefined });
    } catch (e) {
        console.error(e);
        item.user = oldUser; // Revert
        SwalService.error('Error asignando usuario');
    }
}

// --- Editor Assignment ---
async function startEditingEditor(itemId: string) {
    editingEditorItemId.value = itemId;
    await nextTick();
    const selects = editorSelectRef.value as unknown as HTMLSelectElement[];
    if (Array.isArray(selects) && selects.length > 0) {
        selects[0]?.focus();
    } else if (editorSelectRef.value) {
        (editorSelectRef.value as HTMLSelectElement).focus();
    }
}

function stopEditingEditor() {
    editingEditorItemId.value = null;
}

async function onEditorChange(item: Article, event: Event) {
    const select = event.target as HTMLSelectElement;
    const newEditorId = select.value || null;

    editingEditorItemId.value = null;

    const oldEditor = item.editor;

    if (newEditorId) {
        const u = users.value.find(x => x.id === newEditorId);
        item.editor = {
            id: newEditorId,
            username: u?.username || '...',
            image: u?.image
        };
    } else {
        item.editor = undefined;
    }

    try {
        await updateArticle(item.id, { editorId: newEditorId || undefined });
    } catch (e) {
        console.error(e);
        item.editor = oldEditor;
        SwalService.error('Error asignando editor');
    }
}

// --- Create / Edit Item ---
function openCreate() {
    isEditing.value = false;
    editingId.value = null;
    form.name = '';
    form.type = 'articulo';
    form.link = '';
    showModal.value = true;
}

function openEdit(item: Article) {
    // Read-only check
    isEditing.value = true;
    editingId.value = item.id;
    form.name = item.name;
    form.type = item.type;
    form.link = item.link || '';
    showModal.value = true;
}

function closeModal() {
    showModal.value = false;
    editingId.value = null;
}

async function save() {
    if (!form.name || !form.type) {
        SwalService.error('Completa los campos obligatorios');
        return;
    }

    try {
        if (isEditing.value && editingId.value) {
            const updated = await updateArticle(editingId.value, {
                name: form.name,
                type: form.type,
                link: form.link || undefined
            });
            // Update local
            const idx = items.value.findIndex(x => x.id === editingId.value);
            if (idx !== -1) items.value[idx] = updated;
            closeModal();
            await nextTick();
            SwalService.success('Artículo actualizado');
        } else {
            // Create new
            const created = await createArticle({
                name: form.name,
                type: form.type,
                link: form.link || undefined,
                status: 'not_started', // Default state
                updateDate: toISO(new Date()),
                userId: authStore.userId || undefined // Always assign to current session user
            });
            // Manually hydrate user for optimistic UI if API doesn't return it
            if (!created.user && authStore.userId) {
                created.user = {
                    id: authStore.userId,
                    username: authStore.username || 'Yo',
                    image: authStore.image || undefined
                } as any;
            }
            items.value.push(created);
            closeModal();
            await nextTick();
            SwalService.success('Artículo creado');
        }
    } catch (e) {
        console.error(e);
        SwalService.error('Error guardando artículo');
    }
}

// --- Delete Item ---
async function confirmDelete(item: Article) {
    const result = await SwalService.confirm(
        '¿Eliminar artículo?',
        `Vas a eliminar "${item.name}". Esta acción no se puede deshacer.`,
        'warning'
    );

    if (result.isConfirmed) {
        try {
            await deleteArticle(item.id);
            items.value = items.value.filter(i => i.id !== item.id);
            SwalService.success('Artículo eliminado');
        } catch (e) {
            console.error(e);
            SwalService.error('Error eliminando artículo');
        }
    }
}

// --- Lifecycle ---
onMounted(reload);

</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.1);
    border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: rgba(0, 0, 0, 0.2);
}
</style>
