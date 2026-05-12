<template>
    <div class="p-4 md:p-6 min-h-[calc(100vh-64px)] flex flex-col dark:bg-rv-darkBg">
        <div class="flex items-center justify-between mb-6">
            <h1 class="text-2xl font-semibold dark:text-white">Géneros</h1>
            <div class="flex gap-2 items-center">
                <button class="bg-black dark:bg-rv-purple text-white px-4 py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-rv-pink transition-colors"
                    @click="openCreate">
                    <span class="hidden sm:inline">Nuevo </span>Género
                </button>
            </div>
        </div>

        <!-- Loading / Error -->
        <div v-if="loading" class="text-center py-10 dark:text-gray-400">Cargando géneros...</div>
        <div v-else-if="error" class="text-red-500 text-center py-10">{{ error }}</div>

        <!-- Kanban Board -->
        <div v-else class="flex flex-col md:flex-row gap-4 pb-4 md:h-full md:overflow-x-auto">
            <div v-for="col in columns" :key="col.id"
                class="w-full md:flex-1 md:min-w-[220px] rounded-xl p-2 flex flex-col"
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
                            <h3 class="font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                                {{ item.name }}
                            </h3>
                        </div>

                        <!-- User Selector & Actions -->
                        <div class="mt-3 space-y-3">
                            <!-- User Selector (Click to Edit) -->
                            <div class="relative group mt-3">
                                <!-- Visual Display (Click to edit) -->
                                <div v-if="editingUserItemId !== item.id"
                                    @click="startEditingUser(item.id)"
                                    class="flex items-center gap-2 p-1.5 rounded-lg border border-transparent bg-gray-50 dark:bg-rv-darkSurface transition-all hover:bg-gray-100 dark:hover:bg-rv-darkBg/50 cursor-pointer">
                                    <template v-if="item.user">
                                        <img v-if="item.user.image" :src="item.user.image"
                                            class="w-5 h-5 rounded-full object-cover bg-gray-200" alt="Avatar" />
                                        <div v-else
                                            class="w-5 h-5 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-[10px] font-bold text-black/50 dark:text-gray-300">
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

                                <!-- Actual Select (Visible only when editing) -->
                                <select v-else :value="item.user?.id || ''" @change="onUserChange(item, $event)"
                                    @blur="stopEditingUser" ref="userSelectRef"
                                    class="w-full text-xs p-1.5 bg-white dark:bg-rv-darkSurface border border-blue-500 dark:border-blue-400 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200">
                                    <option value="">Sin asignar</option>
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

                                    <!-- Spotify Link -->
                                    <a v-if="item.link" :href="item.link" target="_blank"
                                        class="w-8 h-8 flex items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/20 text-[#1DB954] hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                                        title="Abrir en Spotify">
                                        <i class="fa-brands fa-spotify text-base"></i>
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
                <h3 class="text-lg font-bold dark:text-white">{{ isEditing ? 'Editar Género' : 'Nuevo Género' }}</h3>

                <div>
                    <label class="block text-sm font-medium mb-1 dark:text-gray-300">Nombre</label>
                    <input v-model="form.name" type="text"
                        class="w-full rounded-lg border dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-black/40 dark:focus:ring-white/20" />
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1 dark:text-gray-300">Enlace</label>
                    <input v-model="form.link" type="url"
                        class="w-full rounded-lg border dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-black/40 dark:focus:ring-white/20" />
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1 dark:text-gray-300">Fecha (Opcional)</label>
                    <input v-model="form.updateDate" type="date"
                        class="w-full rounded-lg border dark:border-white/20 dark:bg-rv-darkSurface dark:text-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-black/40 dark:focus:ring-white/20 [color-scheme:dark]" />
                </div>

                <div class="flex justify-end gap-2 pt-2">
                    <button @click="closeModal" class="px-4 py-2 border dark:border-white/20 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-rv-darkSurface">Cancelar</button>
                    <button @click="save"
                        class="px-4 py-2 bg-black dark:bg-rv-purple text-white rounded-lg hover:opacity-90">Guardar</button>
                </div>
            </div>
        </div>

    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, nextTick } from 'vue';
import {
    getSpotifyGenres,
    createSpotify,
    updateSpotify,
    removeSpotify,
    type Spotify,
    type SpotifyStatus,
    toISO
} from '@services/spotify/spotify';
import { getUsersRv, type Superuser } from '@services/auth/auth';
import { useAuthStore } from '@stores/auth/auth';
import SwalService from '@services/swal/SwalService';

const authStore = useAuthStore();

// --- Types ---
type ColumnId = SpotifyStatus;

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
    { id: 'not_started', label: 'Sin empezar', bgClass: 'bg-red-50 dark:bg-red-900/20',    borderClass: 'border-t-4 border-red-500',    textClass: 'text-red-900 dark:text-red-300',    countClass: 'bg-red-200 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
    { id: 'in_progress', label: 'En progreso', bgClass: 'bg-orange-50 dark:bg-orange-900/20', borderClass: 'border-t-4 border-orange-500', textClass: 'text-orange-900 dark:text-orange-300', countClass: 'bg-orange-200 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
    { id: 'editing',     label: 'En revisión', bgClass: 'bg-yellow-50 dark:bg-yellow-900/20', borderClass: 'border-t-4 border-yellow-500', textClass: 'text-yellow-900 dark:text-yellow-300', countClass: 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
    { id: 'ready',       label: 'Terminado',   bgClass: 'bg-blue-50 dark:bg-blue-900/20',   borderClass: 'border-t-4 border-blue-500',   textClass: 'text-blue-900 dark:text-blue-300',   countClass: 'bg-blue-200 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
    { id: 'published',   label: 'Publicado',   bgClass: 'bg-green-50 dark:bg-green-900/20', borderClass: 'border-t-4 border-green-500',  textClass: 'text-green-900 dark:text-green-300', countClass: 'bg-green-200 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
];

// --- State ---
const items = ref<Spotify[]>([]);
const users = ref<Superuser[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const draggedItem = ref<Spotify | null>(null);

// User Edit State
const editingUserItemId = ref<string | null>(null);
const userSelectRef = ref<HTMLSelectElement | null>(null);

// Modal state
const showModal = ref(false);
const isEditing = ref(false);
const editingId = ref<string | null>(null);
const form = reactive({
    name: '',
    link: '',
    updateDate: ''
});

// --- Getters ---
function getItems(status: SpotifyStatus) {
    return items.value.filter(i => i.status === status);
}

function fmtDate(iso: string) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString() + ' ' + new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// --- Logic ---
async function reload() {
    loading.value = true;
    error.value = null;
    try {
        if (users.value.length === 0) {
            users.value = await getUsersRv();
        }
        items.value = await getSpotifyGenres();
    } catch (e: any) {
        console.error(e);
        error.value = e?.response?.data?.message || 'Error cargando datos';
        SwalService.error('Error cargando datos');
    } finally {
        loading.value = false;
    }
}

// --- Drag & Drop ---
function onDragStart(item: Spotify) {
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
        await updateSpotify(item.id, { status: targetState });
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

async function onUserChange(item: Spotify, event: Event) {
    const select = event.target as HTMLSelectElement;
    const newUserId = select.value || null;

    editingUserItemId.value = null;

    const oldUser = item.user;

    if (newUserId) {
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
        await updateSpotify(item.id, { userId: newUserId || undefined });
    } catch (e) {
        console.error(e);
        item.user = oldUser;
        SwalService.error('Error asignando usuario');
    }
}

// --- Create / Edit Item ---
function openCreate() {
    isEditing.value = false;
    editingId.value = null;
    form.name = '';
    form.link = '';
    form.updateDate = '';
    showModal.value = true;
}

function openEdit(item: Spotify) {
    isEditing.value = true;
    editingId.value = item.id;
    form.name = item.name;
    form.link = item.link;
    form.updateDate = item.updateDate ? item.updateDate.slice(0, 10) : '';
    showModal.value = true;
}

function closeModal() {
    showModal.value = false;
    editingId.value = null;
}

async function save() {
    if (!form.name || !form.link) {
        SwalService.error('Completa todos los campos');
        return;
    }

    try {
        if (isEditing.value && editingId.value) {
            const updated = await updateSpotify(editingId.value, {
                name: form.name,
                link: form.link,
                updateDate: form.updateDate ? toISO(new Date(form.updateDate)) : undefined
            });
            const idx = items.value.findIndex(x => x.id === editingId.value);
            if (idx !== -1) items.value[idx] = updated;
            closeModal();
            await nextTick();
            SwalService.success('Género actualizado');
        } else {
            const created = await createSpotify({
                name: form.name,
                link: form.link,
                status: 'not_started',
                type: 'genero',
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
            SwalService.success('Género creado');
        }
    } catch (e) {
        console.error(e);
        SwalService.error('Error guardando género');
    }
}

// --- Delete Item ---
async function confirmDelete(item: Spotify) {
    const result = await SwalService.confirm(
        '¿Eliminar género?',
        `Vas a eliminar "${item.name}". Esta acción no se puede deshacer.`,
        'warning'
    );

    if (result.isConfirmed) {
        try {
            await removeSpotify(item.id);
            items.value = items.value.filter(i => i.id !== item.id);
            SwalService.success('Género eliminado');
        } catch (e) {
            console.error(e);
            SwalService.error('Error eliminando género');
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
