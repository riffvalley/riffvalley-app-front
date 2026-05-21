<template>
    <div class="p-4 md:p-6 min-h-[calc(100vh-64px)] flex flex-col dark:bg-rv-darkBg">
        <div class="flex items-center justify-between mb-6 flex-wrap gap-4">
            <h1 class="text-2xl md:text-3xl font-semibold dark:text-white"><i class="fa-solid fa-newspaper mr-2"></i>Artículos</h1>
            <div class="flex gap-2 items-center">
                <!-- User Filter -->
                <div class="relative group">
                    <select v-model="selectedUserId" @change="reload"
                        class="bg-white dark:bg-rv-darkCard dark:border-white/20 dark:text-gray-200 border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-black focus:border-black block w-full p-2.5">
                        <option v-for="user in users" :key="user.id" :value="user.id">
                            {{ user.username }}
                        </option>
                    </select>
                </div>

                <button class="bg-black dark:bg-rv-purple text-white px-4 py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-rv-pink transition-colors"
                    @click="openCreate">
                    <span class="hidden sm:inline">Nuevo </span>Artículo
                </button>
            </div>
        </div>

        <!-- Loading / Error -->
        <div v-if="loading" class="text-center py-10 dark:text-gray-400">Cargando artículos...</div>
        <div v-else-if="error" class="text-red-500 text-center py-10">{{ error }}</div>

        <!-- Kanban Board -->
        <div v-else class="flex flex-col md:flex-row gap-4 pb-4 md:h-full md:overflow-x-auto">
            <div v-for="col in columns" :key="col.id"
                class="w-full md:flex-1 md:min-w-[220px] rounded-xl p-2 flex flex-col md:max-h-full"
                :class="[col.bgClass, col.borderClass]" @dragover.prevent="onDragOver" @drop="onDrop(col.id)">
                <!-- Column Header -->
                <h2 class="font-bold mb-4 flex items-center justify-between md:sticky top-0 pb-2 z-10"
                    :class="[col.textClass, col.bgClass]">
                    {{ col.label }}
                    <span class="text-sm px-2 py-0.5 rounded-full" :class="col.countClass">
                        {{ getItems(col.id).length }}
                    </span>
                </h2>

                <!-- Cards Container -->
                <div class="space-y-3 md:flex-1 md:overflow-y-auto pr-2 custom-scrollbar">
                    <div v-for="item in getItems(col.id)" :key="item.id"
                        class="bg-white dark:bg-rv-darkCard p-4 rounded-lg shadow-sm border border-gray-200 dark:border-white/10 cursor-move hover:shadow-md transition-shadow group relative"
                        draggable="true" @dragstart="onDragStart(item)">
                        <!-- Card Content -->
                        <div class="mb-2">
                            <div class="flex justify-between items-start mb-1">
                                <span class="text-[10px] font-bold px-2 py-0.5 rounded" :class="getTypeColor(item.type)">
                                    {{ item.type }}
                                </span>
                            </div>
                            <h3 class="font-semibold text-gray-900 dark:text-white leading-tight">
                                {{ item.name }}
                            </h3>
                        </div>

                        <!-- User Selector & Actions -->
                        <div class="mt-3 space-y-3">
                            <!-- User Selector (Click to Edit) -->
                            <div class="relative group mt-3">
                                <div v-if="editingUserItemId !== item.id" @click="startEditingUser(item.id)"
                                    class="flex items-center gap-2 p-1.5 rounded-lg border border-transparent bg-gray-50 dark:bg-rv-darkSurface transition-all hover:bg-gray-100 dark:hover:bg-rv-darkBg cursor-pointer">
                                    <template v-if="item.user">
                                        <img v-if="item.user.image" :src="item.user.image"
                                            class="w-5 h-5 rounded-full object-cover bg-gray-200" alt="Avatar" />
                                        <div v-else
                                            class="w-5 h-5 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-[10px] font-bold text-black/50 dark:text-white/70">
                                            {{ (item.user.username || '?').charAt(0).toUpperCase() }}
                                        </div>
                                        <span class="text-xs font-medium text-gray-700 dark:text-gray-300 truncate min-w-0 flex-1">{{
                                            item.user.username || 'Usuario desconocido' }}</span>
                                    </template>
                                    <template v-else>
                                        <div class="w-5 h-5 rounded-full bg-gray-200 dark:bg-rv-darkBg flex items-center justify-center">
                                            <i class="fa-solid fa-user text-gray-400 text-[10px]"></i>
                                        </div>
                                        <span class="text-xs text-gray-500 dark:text-gray-400 flex-1">Sin asignar</span>
                                    </template>
                                </div>

                                <select v-else :value="item.user?.id || ''" @change="onUserChange(item, $event)"
                                    @blur="stopEditingUser" ref="userSelectRef"
                                    class="w-full text-xs p-1.5 bg-white dark:bg-rv-darkSurface dark:text-gray-200 border border-blue-500 dark:border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/40">
                                    <option value="">Sin asignar</option>
                                    <option v-for="user in users" :key="user.id" :value="user.id">
                                        {{ user.username }}
                                    </option>
                                </select>
                            </div>

                            <!-- Editor Selector (Click to Edit) -->
                            <div class="relative group mt-1">
                                <div v-if="editingEditorItemId !== item.id" @click="startEditingEditor(item.id)"
                                    class="flex items-center gap-2 p-1.5 rounded-lg border border-transparent bg-purple-50/50 dark:bg-purple-900/10 transition-all hover:bg-purple-100/50 dark:hover:bg-purple-900/20 cursor-pointer">
                                    <template v-if="item.editor">
                                        <img v-if="item.editor.image" :src="item.editor.image"
                                            class="w-5 h-5 rounded-full object-cover bg-gray-200" alt="Avatar" />
                                        <div v-else
                                            class="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-[10px] font-bold text-purple-500 dark:text-purple-300">
                                            {{ (item.editor.username || '?').charAt(0).toUpperCase() }}
                                        </div>
                                        <span class="text-xs font-medium text-purple-700 dark:text-purple-300 truncate min-w-0 flex-1">
                                            <span class="text-[10px] text-purple-400 mr-1">Editor:</span>
                                            {{ item.editor.username || 'Editor desconocido' }}
                                        </span>
                                    </template>
                                    <template v-else>
                                        <div class="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                            <i class="fa-solid fa-pen-nib text-purple-300 text-[10px]"></i>
                                        </div>
                                        <span class="text-xs text-purple-400 flex-1">Sin editor</span>
                                    </template>
                                </div>

                                <select v-else :value="item.editor?.id || ''" @change="onEditorChange(item, $event)"
                                    @blur="stopEditingEditor" ref="editorSelectRef"
                                    class="w-full text-xs p-1.5 bg-white dark:bg-rv-darkSurface dark:text-gray-200 border border-purple-500 dark:border-purple-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900/40">
                                    <option value="">Sin editor</option>
                                    <option v-for="user in users" :key="user.id" :value="user.id">
                                        {{ user.username }}
                                    </option>
                                </select>
                            </div>

                            <!-- Coauthor Selector (Click to Edit) -->
                            <div class="relative group mt-1">
                                <div v-if="editingCoauthorItemId !== item.id" @click="startEditingCoauthor(item.id)"
                                    class="flex items-center gap-2 p-1.5 rounded-lg border border-transparent bg-indigo-50/50 dark:bg-indigo-900/10 transition-all hover:bg-indigo-100/50 dark:hover:bg-indigo-900/20 cursor-pointer">
                                    <template v-if="item.coauthor">
                                        <img v-if="item.coauthor.image" :src="item.coauthor.image"
                                            class="w-5 h-5 rounded-full object-cover bg-gray-200" alt="Avatar" />
                                        <div v-else
                                            class="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-[10px] font-bold text-indigo-500 dark:text-indigo-300">
                                            {{ (item.coauthor.username || '?').charAt(0).toUpperCase() }}
                                        </div>
                                        <span class="text-xs font-medium text-indigo-700 dark:text-indigo-300 truncate min-w-0 flex-1">
                                            <span class="text-[10px] text-indigo-400 mr-1">Coautor:</span>{{ item.coauthor.username }}
                                        </span>
                                    </template>
                                    <template v-else>
                                        <div class="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                            <i class="fa-solid fa-user-plus text-indigo-300 text-[10px]"></i>
                                        </div>
                                        <span class="text-xs text-indigo-300 dark:text-indigo-400 flex-1">Sin coautor</span>
                                    </template>
                                </div>
                                <select v-else :value="item.coauthor?.id || ''" @change="onCoauthorChange(item, $event)"
                                    @blur="editingCoauthorItemId = null" ref="coauthorSelectRef"
                                    class="w-full text-xs p-1.5 bg-white dark:bg-rv-darkSurface dark:text-gray-200 border border-indigo-500 dark:border-indigo-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/40">
                                    <option value="">Sin coautor</option>
                                    <option v-for="user in users" :key="user.id" :value="user.id">
                                        {{ user.username }}
                                    </option>
                                </select>
                            </div>

                            <!-- Action Buttons and Date -->
                            <div class="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-white/10 mt-2">
                                <!-- Date -->
                                <span class="text-xs text-gray-400 dark:text-gray-500">{{ fmtDate(item.updateDate || '') }}</span>

                                <!-- Buttons -->
                                <div class="flex items-center gap-2">
                                    <!-- Edit -->
                                    <button @click="openEdit(item)"
                                        class="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                        title="Editar">
                                        <i class="fa-solid fa-pen text-xs"></i>
                                    </button>

                                    <!-- Delete -->
                                    <button @click="confirmDelete(item)"
                                        class="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                        title="Eliminar">
                                        <i class="fa-solid fa-trash text-xs"></i>
                                    </button>

                                    <!-- Link -->
                                    <a v-if="item.link" :href="item.link" target="_blank"
                                        class="w-8 h-8 flex items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
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
            <div class="bg-white dark:bg-rv-darkCard rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
                <h3 class="text-lg font-bold dark:text-white">{{ isEditing ? 'Editar Artículo' : 'Nuevo Artículo' }}</h3>

                <div>
                    <label class="block text-sm font-medium mb-1 dark:text-gray-300">Título</label>
                    <input v-model="form.name" type="text"
                        class="w-full rounded-lg border dark:border-white/20 px-3 py-2 outline-none focus:ring-2 focus:ring-black/40 dark:bg-rv-darkSurface dark:text-gray-200" />
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1 dark:text-gray-300">Tipo</label>
                    <select v-model="form.type"
                        class="w-full rounded-lg border dark:border-white/20 px-3 py-2 outline-none focus:ring-2 focus:ring-black/40 dark:bg-rv-darkSurface dark:text-gray-200">
                        <option v-for="t in types" :key="t" :value="t">{{ t }}</option>
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1 dark:text-gray-300">Enlace (Opcional)</label>
                    <input v-model="form.link" type="url"
                        class="w-full rounded-lg border dark:border-white/20 px-3 py-2 outline-none focus:ring-2 focus:ring-black/40 dark:bg-rv-darkSurface dark:text-gray-200" />
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1 dark:text-gray-300">Fecha (Opcional)</label>
                    <input v-model="form.updateDate" type="date"
                        class="w-full rounded-lg border dark:border-white/20 px-3 py-2 outline-none focus:ring-2 focus:ring-black/40 dark:bg-rv-darkSurface dark:text-gray-200 [color-scheme:dark]" />
                </div>

                <div class="flex justify-end gap-2 pt-2">
                    <button @click="closeModal"
                        class="px-4 py-2 border dark:border-white/20 rounded-lg hover:bg-gray-50 dark:hover:bg-rv-darkSurface dark:text-gray-300 transition-colors">
                        Cancelar
                    </button>
                    <button @click="save"
                        class="px-4 py-2 bg-black dark:bg-rv-purple text-white rounded-lg hover:opacity-90 transition-opacity">
                        Guardar
                    </button>
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
        label: 'Sin empezar',
        bgClass: 'bg-red-50 dark:bg-red-900/20',
        borderClass: 'border-t-4 border-red-500',
        textClass: 'text-red-900 dark:text-red-300',
        countClass: 'bg-red-200 text-red-800 dark:bg-red-900/40 dark:text-red-300'
    },
    {
        id: 'in_progress',
        label: 'En progreso',
        bgClass: 'bg-orange-50 dark:bg-orange-900/20',
        borderClass: 'border-t-4 border-orange-500',
        textClass: 'text-orange-900 dark:text-orange-300',
        countClass: 'bg-orange-200 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300'
    },
    {
        id: 'editing',
        label: 'En revisión',
        bgClass: 'bg-yellow-50 dark:bg-yellow-900/20',
        borderClass: 'border-t-4 border-yellow-500',
        textClass: 'text-yellow-900 dark:text-yellow-300',
        countClass: 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
    },
    {
        id: 'ready',
        label: 'Terminado',
        bgClass: 'bg-blue-50 dark:bg-blue-900/20',
        borderClass: 'border-t-4 border-blue-500',
        textClass: 'text-blue-900 dark:text-blue-300',
        countClass: 'bg-blue-200 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
    },
    {
        id: 'published',
        label: 'Publicado',
        bgClass: 'bg-green-50 dark:bg-green-900/20',
        borderClass: 'border-t-4 border-green-500',
        textClass: 'text-green-900 dark:text-green-300',
        countClass: 'bg-green-200 text-green-800 dark:bg-green-900/40 dark:text-green-300'
    },
];

const types = ARTICLE_TYPES;

// --- State ---
const items = ref<Article[]>([]);
const users = ref<Superuser[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const draggedItem = ref<Article | null>(null);
const selectedUserId = ref<string>('');

// User Edit State
const editingUserItemId = ref<string | null>(null);
const userSelectRef = ref<HTMLSelectElement | null>(null);

// Editor Edit State
const editingEditorItemId = ref<string | null>(null);
const editorSelectRef = ref<HTMLSelectElement | null>(null);

// Coauthor Edit State
const editingCoauthorItemId = ref<string | null>(null);
const coauthorSelectRef = ref<HTMLSelectElement | null>(null);

// Modal state
const showModal = ref(false);
const isEditing = ref(false);
const editingId = ref<string | null>(null);
const form = reactive({
    name: '',
    type: 'articulo' as ArticleType,
    link: '',
    updateDate: ''
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
            return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
        case 'festival':
            return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
        case 'review':
            return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
        case 'entrevista':
            return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
        case 'articulo':
        default:
            return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300';
    }
}

// --- Logic ---
async function reload() {
    loading.value = true;
    error.value = null;
    try {
        if (users.value.length === 0) {
            users.value = await getUsersRv();
        }

        if (!selectedUserId.value && authStore.userId) {
            const isRv = users.value.some(u => u.id === authStore.userId);
            if (isRv) {
                selectedUserId.value = authStore.userId;
            } else if (users.value.length > 0) {
                selectedUserId.value = users.value[0].id;
            }
        }

        if (selectedUserId.value) {
            items.value = await getArticles(selectedUserId.value);
        } else {
            items.value = [];
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
    const newUserId = select.value || null;
    editingUserItemId.value = null;
    const oldUser = item.user;

    if (newUserId) {
        const u = users.value.find(x => x.id === newUserId);
        item.user = { id: newUserId, username: u?.username || '...', image: u?.image };
    } else {
        item.user = undefined;
    }

    try {
        await updateArticle(item.id, { userId: newUserId || undefined });
    } catch (e) {
        console.error(e);
        item.user = oldUser;
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
        item.editor = { id: newEditorId, username: u?.username || '...', image: u?.image };
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

// --- Coauthor Assignment ---
async function startEditingCoauthor(itemId: string) {
    editingCoauthorItemId.value = itemId;
    await nextTick();
    const selects = coauthorSelectRef.value as unknown as HTMLSelectElement[];
    if (Array.isArray(selects) && selects.length > 0) {
        selects[0]?.focus();
    } else if (coauthorSelectRef.value) {
        (coauthorSelectRef.value as HTMLSelectElement).focus();
    }
}

async function onCoauthorChange(item: Article, event: Event) {
    const select = event.target as HTMLSelectElement;
    const newCoauthorId = select.value || null;
    editingCoauthorItemId.value = null;
    const oldCoauthor = item.coauthor;

    if (newCoauthorId) {
        const u = users.value.find(x => x.id === newCoauthorId);
        item.coauthor = { id: newCoauthorId, username: u?.username || '...', image: u?.image };
    } else {
        item.coauthor = undefined;
    }

    try {
        await updateArticle(item.id, { coauthorId: newCoauthorId || undefined });
    } catch (e) {
        console.error(e);
        item.coauthor = oldCoauthor;
        SwalService.error('Error asignando coautor');
    }
}

// --- Create / Edit Item ---
function openCreate() {
    isEditing.value = false;
    editingId.value = null;
    form.name = '';
    form.type = 'articulo';
    form.link = '';
    form.updateDate = '';
    showModal.value = true;
}

function openEdit(item: Article) {
    isEditing.value = true;
    editingId.value = item.id;
    form.name = item.name;
    form.type = item.type;
    form.link = item.link || '';
    form.updateDate = item.updateDate ? item.updateDate.slice(0, 10) : '';
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
                link: form.link || undefined,
                updateDate: form.updateDate ? toISO(new Date(form.updateDate)) : undefined
            });
            const idx = items.value.findIndex(x => x.id === editingId.value);
            if (idx !== -1) items.value[idx] = updated;
            closeModal();
            await nextTick();
            SwalService.success('Artículo actualizado');
        } else {
            const created = await createArticle({
                name: form.name,
                type: form.type,
                link: form.link || undefined,
                status: 'not_started',
                updateDate: form.updateDate ? toISO(new Date(form.updateDate)) : undefined,
                userId: authStore.userId || undefined
            });
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
        'Sí, eliminar', 'Cancelar'
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
