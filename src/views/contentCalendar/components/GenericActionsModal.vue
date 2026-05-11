<template>
    <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        @click.self="$emit('close')">
        <div class="bg-white dark:bg-rv-darkCard rounded-lg p-6 w-full max-w-sm shadow-xl">
            <h3 class="text-lg font-bold mb-4 text-gray-900 dark:text-white">{{ content?.name }}</h3>

            <div class="space-y-3">
                <button @click="$emit('edit')"
                    class="w-full px-4 py-3 bg-rv-purple text-white rounded-lg hover:bg-rv-pink flex items-center justify-center gap-2 transition-colors">
                    <span>✏️</span>
                    <span>Editar Evento</span>
                </button>

                <button @click="$emit('delete')"
                    class="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2">
                    <i class="fa-solid fa-trash"></i>
                    <span>Eliminar Evento</span>
                </button>

                <button @click="$emit('close')"
                    class="w-full px-4 py-3 bg-gray-100 dark:bg-rv-darkSurface text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-rv-darkBg rounded-lg transition-colors font-medium">
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
