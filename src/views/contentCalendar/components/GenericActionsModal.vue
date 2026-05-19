<template>
    <div v-if="show" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
        @click.self="$emit('close')">
        <div class="bg-white dark:bg-rv-darkCard rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full sm:max-w-sm shadow-xl max-h-[92vh] overflow-y-auto">
            <h3 class="text-lg font-bold mb-4 text-gray-900 dark:text-white">{{ content?.name }}</h3>

            <div class="space-y-3">
                <button @click="$emit('edit')"
                    class="w-full px-4 py-3 bg-gradient-to-r from-rv-purple to-rv-pink text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 shadow-sm">
                    <i class="fa-solid fa-pen-to-square"></i>
                    <span>Editar Evento</span>
                </button>

                <button @click="$emit('delete')"
                    class="w-full px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 flex items-center justify-center gap-2">
                    <i class="fa-solid fa-trash"></i>
                    <span>Eliminar Evento</span>
                </button>

                <button @click="$emit('close')"
                    class="w-full px-4 py-3 bg-gray-100 dark:bg-rv-darkSurface text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-rv-darkBg rounded-xl transition-colors font-medium">
                    Cancelar
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { Content } from '@services/contents/contents';

interface Props {
    show: boolean;
    content: Content | null;
}

defineProps<Props>();

defineEmits<{
    close: [];
    edit: [];
    delete: [];
}>();
</script>
