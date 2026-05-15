<template>
    <div v-if="show" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-3 sm:px-0"
        @click.self="$emit('close')">
        <div class="bg-white dark:bg-rv-darkCard rounded-2xl w-full sm:max-w-md shadow-2xl max-h-[92vh] overflow-y-auto">

            <!-- Cabecera -->
            <div class="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-white/10">
                <div class="flex items-center gap-2">
                    <span class="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider"
                        :class="typeBadgeClass">
                        {{ typeLabel }}
                    </span>
                    <h3 class="text-base font-bold text-gray-900 dark:text-white">Editar evento</h3>
                </div>
                <button @click="$emit('close')"
                    class="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-rv-darkSurface transition-all">
                    <i class="fa-solid fa-xmark text-base"></i>
                </button>
            </div>

            <!-- Cuerpo -->
            <div class="px-5 py-4 space-y-4">

                <!-- Tipo -->
                <div>
                    <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Tipo</label>
                    <select v-model="formData.type"
                        class="w-full bg-gray-50 dark:bg-rv-darkSurface border-0 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-rv-purple/30 disabled:opacity-50"
                        :disabled="formData.type === 'spotify'">
                        <option value="article">Artículo</option>
                        <option value="photos">Fotos</option>
                        <option value="radar">Radar</option>
                        <option value="best">Mejores Discos</option>
                        <option value="video">Video</option>
                        <option value="reunion">Reunión</option>
                        <option value="spotify" v-if="formData.type === 'spotify'">Spotify</option>
                    </select>
                    <p v-if="formData.type === 'spotify'" class="text-xs text-gray-400 mt-1">
                        El tipo no se puede cambiar para listas de Spotify.
                    </p>
                </div>

                <!-- Nombre -->
                <div>
                    <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Nombre</label>
                    <input v-model="formData.name" type="text"
                        class="w-full bg-gray-50 dark:bg-rv-darkSurface border-0 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-rv-purple/30 disabled:opacity-50"
                        :disabled="formData.type === 'spotify'" placeholder="Título del contenido" />
                    <p v-if="formData.type === 'spotify'" class="text-xs text-gray-400 mt-1">
                        El nombre no se puede editar para listas de Spotify.
                    </p>
                </div>

                <!-- Notas -->
                <div>
                    <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Notas</label>
                    <textarea v-model="formData.notes"
                        class="w-full bg-gray-50 dark:bg-rv-darkSurface border-0 rounded-xl px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-rv-purple/30 resize-none"
                        rows="3" placeholder="Descripción o notas..."></textarea>
                </div>

                <!-- Fecha de publicación -->
                <div>
                    <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                        Fecha de publicación
                        <span v-if="['reunion', 'radar', 'best'].includes(formData.type)" class="text-red-500 ml-0.5">*</span>
                    </label>
                    <input v-model="formData.publicationDate" type="datetime-local"
                        class="w-full bg-gray-50 dark:bg-rv-darkSurface border-0 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-rv-purple/30"
                        :min="formData.type === 'radar' && formData.listDate ? formatDateTime(formData.listDate) : undefined" />
                    <button v-if="formData.publicationDate && !['reunion', 'radar', 'best'].includes(formData.type)"
                        @click="formData.publicationDate = ''"
                        class="mt-1.5 text-xs text-gray-400 hover:text-rv-purple dark:hover:text-rv-pink transition-colors flex items-center gap-1">
                        <i class="fa-solid fa-arrow-rotate-left text-[10px]"></i>
                        Mover a backlog
                    </button>
                    <p v-if="['reunion', 'radar', 'best'].includes(formData.type)" class="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                        <i class="fa-solid fa-triangle-exclamation text-[10px]"></i>
                        Este tipo requiere fecha obligatoria
                    </p>
                </div>

                <!-- Radar: fecha lista + cierre -->
                <div v-if="formData.type === 'radar'" class="space-y-3">
                    <div v-if="formData.listDate" class="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl px-3 py-2.5">
                        <i class="fa-regular fa-calendar text-indigo-400 text-xs"></i>
                        <span class="text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                            Fecha de lista: {{ formatDisplayDate(formData.listDate) }}
                        </span>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Fecha cierre</label>
                        <input v-model="formData.closeDate" type="date"
                            class="w-full bg-gray-50 dark:bg-rv-darkSurface border-0 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-rv-purple/30"
                            :min="formData.publicationDate ? formData.publicationDate.split('T')[0] : (formData.listDate ? formData.listDate : undefined)" />
                    </div>
                </div>

                <!-- Autor -->
                <div>
                    <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Autor</label>
                    <select v-model="formData.authorId"
                        class="w-full bg-gray-50 dark:bg-rv-darkSurface border-0 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-rv-purple/30">
                        <option value="">Seleccionar autor...</option>
                        <option v-for="user in rvUsers" :key="user.id" :value="user.id">{{ user.username }}</option>
                    </select>
                </div>
            </div>

            <!-- Footer -->
            <div class="flex flex-wrap justify-between items-center gap-3 px-5 pb-5 pt-3 border-t border-gray-100 dark:border-white/10">
                <button @click="$emit('delete')"
                    class="group flex items-center gap-2 text-gray-400 hover:text-red-600 transition-colors px-3 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20">
                    <i class="fa-regular fa-trash-can text-base group-hover:scale-110 transition-transform"></i>
                    <span class="text-sm font-medium">Eliminar</span>
                </button>
                <div class="flex gap-2">
                    <button @click="$emit('close')"
                        class="px-4 py-2 bg-gray-100 dark:bg-rv-darkSurface text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-rv-darkBg rounded-xl transition-colors font-medium text-sm">
                        Cancelar
                    </button>
                    <button @click="handleUpdate"
                        class="px-4 py-2 bg-rv-purple hover:bg-rv-pink text-white rounded-xl transition-colors font-semibold text-sm shadow-sm hover:-translate-y-0.5 transform">
                        Guardar cambios
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { Content } from '@services/contents/contents';

interface Props {
    show: boolean;
    content: Content;
    rvUsers: any[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
    close: [];
    update: [data: any];
    delete: [];
}>();

const typeLabel = computed(() => ({
    article: 'Artículo', photos: 'Fotos', spotify: 'Spotify',
    radar: 'Radar', best: 'Mejores del Mes', video: 'Video', reunion: 'Reunión'
}[formData.value.type] ?? formData.value.type));

const typeBadgeClass = computed(() => ({
    article:  'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    photos:   'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300',
    spotify:  'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    radar:    'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    best:     'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    video:    'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
    reunion:  'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
}[formData.value.type] ?? 'bg-gray-100 text-gray-600'));

function formatForInput(dateStr: string): string {
    if (!dateStr) return '';
    if (dateStr.endsWith('Z')) {
        if (dateStr.endsWith('T00:00:00.000Z') || dateStr.endsWith('T00:00:00Z')) {
            return dateStr.slice(0, 16);
        }
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    if (dateStr.length >= 16) return dateStr.slice(0, 16);
    if (dateStr.length === 10) return dateStr + 'T00:00';
    return dateStr;
}

const formData = ref({
    type: props.content.type,
    name: props.content.name,
    notes: props.content.notes || '',
    publicationDate: formatForInput(props.content.publicationDate || ''),
    closeDate: props.content.closeDate ? props.content.closeDate.split('T')[0] : '',
    authorId: props.content.author?.id || '',
    listDate: props.content.list?.listDate || ''
});

watch(() => props.content, (newContent) => {
    formData.value = {
        type: newContent.type,
        name: newContent.name,
        notes: newContent.notes || '',
        publicationDate: formatForInput(newContent.publicationDate || ''),
        closeDate: newContent.closeDate ? newContent.closeDate.split('T')[0] : '',
        authorId: newContent.author?.id || '',
        listDate: newContent.list?.listDate || ''
    };
}, { deep: true });

function handleUpdate() {
    emit('update', { ...formData.value });
}

function formatDisplayDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function formatDateTime(dateStr: string): string {
    if (!dateStr) return '';
    return dateStr + 'T00:00';
}
</script>
