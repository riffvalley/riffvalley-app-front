<template>
    <div v-if="show" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
        @click.self="$emit('close')">
        <div class="bg-white dark:bg-rv-darkCard rounded-t-2xl sm:rounded-2xl p-5 sm:p-8 w-full sm:max-w-2xl shadow-2xl relative overflow-hidden max-h-[92vh] overflow-y-auto">
            <div class="absolute top-0 right-0 w-64 h-64 bg-orange-50 dark:bg-orange-900/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

            <div class="relative z-10">
                <div class="flex justify-between items-start mb-6">
                    <div class="flex items-center gap-2">
                        <span class="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-bold uppercase tracking-wider rounded-md">
                            Reunión
                        </span>
                    </div>
                    <button @click="$emit('close')"
                        class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-rv-darkSurface">
                        <i class="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>

                <div class="space-y-6">
                    <div>
                        <input v-model="formData.name" type="text"
                            class="w-full text-xl sm:text-3xl font-bold text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 border-none focus:ring-0 p-0 bg-transparent"
                            placeholder="Título de la reunión..." />
                        <button @click="$emit('navigate-reunions')"
                            class="mt-2 text-xs text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors flex items-center gap-1">
                            <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                            <span>Ver en página de reuniones</span>
                        </button>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="space-y-4">
                            <div>
                                <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Notas</label>
                                <textarea v-model="formData.notes"
                                    class="w-full border-0 bg-gray-50 dark:bg-rv-darkSurface rounded-xl px-4 py-3 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/30 focus:bg-white dark:focus:bg-rv-darkBg transition-all resize-none text-sm leading-relaxed"
                                    rows="6"
                                    placeholder="Añade detalles sobre la reunión (agenda, temas a tratar...)"></textarea>
                            </div>
                        </div>

                        <div class="space-y-6">
                            <div class="bg-gray-50 dark:bg-rv-darkSurface rounded-xl p-5 space-y-5">
                                <div>
                                    <label class="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                                        <i class="fa-regular fa-calendar"></i> Fecha de Reunión <span class="text-red-600">*</span>
                                    </label>
                                    <input v-model="formData.publicationDate" type="datetime-local"
                                        class="w-full border-gray-200 dark:border-white/20 dark:bg-rv-darkBg dark:text-gray-200 rounded-lg text-sm" />
                                    <p class="text-xs text-amber-600 dark:text-amber-500 mt-2">
                                        ⚠️ Las reuniones requieren fecha obligatoria
                                    </p>
                                </div>

                                <div>
                                    <label class="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                                        <i class="fa-regular fa-user"></i> Autor
                                    </label>
                                    <select v-model="formData.authorId"
                                        class="w-full border-gray-200 dark:border-white/20 dark:bg-rv-darkBg dark:text-gray-200 rounded-lg text-sm">
                                        <option value="">Seleccionar autor...</option>
                                        <option v-for="user in rvUsers" :key="user.id" :value="user.id">
                                            {{ user.username }}
                                        </option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flex flex-wrap justify-between items-center gap-3 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-100 dark:border-white/10">
                    <button @click="$emit('delete')"
                        class="group flex items-center gap-2 text-gray-400 hover:text-red-600 transition-colors px-4 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Eliminar permanentemente">
                        <i class="fa-regular fa-trash-can text-lg group-hover:scale-110 transition-transform"></i>
                        <span class="text-sm font-medium">Eliminar</span>
                    </button>

                    <div class="flex gap-2 sm:gap-3">
                        <button @click="$emit('close')"
                            class="px-4 py-2 sm:px-6 sm:py-2.5 bg-gray-100 dark:bg-rv-darkSurface text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-rv-darkBg font-medium rounded-xl transition-colors">
                            Cancelar
                        </button>
                        <button @click="handleUpdate"
                            class="px-4 py-2 sm:px-6 sm:py-2.5 bg-rv-purple text-white font-medium rounded-xl hover:bg-rv-pink shadow-lg transition-all transform hover:-translate-y-0.5">
                            Guardar Cambios
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
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
    'navigate-reunions': [];
}>();

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
    name: props.content.name,
    notes: props.content.notes || '',
    publicationDate: formatForInput(props.content.publicationDate || ''),
    authorId: (props.content as any).authorId || props.content.author?.id || ''
});

watch(() => props.content, (newContent) => {
    formData.value = {
        name: newContent.name,
        notes: newContent.notes || '',
        publicationDate: formatForInput(newContent.publicationDate || ''),
        authorId: (newContent as any).authorId || newContent.author?.id || ''
    };
}, { deep: true });

watch(() => formData.value.publicationDate, (newDate) => {
    if (newDate) {
        const date = new Date(newDate);
        if (!isNaN(date.getTime())) {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            formData.value.name = `Reunión del ${day}/${month}`;
        }
    }
});

function handleUpdate() {
    emit('update', { ...formData.value });
}
</script>
