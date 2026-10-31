<template>
    <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        @click.self="$emit('cancel')">
        <div class="bg-white dark:bg-rv-darkCard rounded-lg p-6 w-full max-w-md shadow-xl">
            <div class="flex items-center gap-3 mb-4">
                <div class="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <i class="fa-solid fa-trash text-red-600 text-xl"></i>
                </div>
                <div>
                    <h3 class="text-lg font-bold text-gray-900 dark:text-white">Eliminar Evento</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Esta acción no se puede deshacer</p>
                </div>
            </div>
            <p class="text-gray-700 dark:text-gray-300 mb-6">¿Estás seguro de que deseas eliminar el evento "<strong>{{
                contentName }}</strong>"?</p>
            <div class="flex justify-end gap-3">
                <button @click="$emit('cancel')"
                    class="px-4 py-2 bg-gray-200 dark:bg-rv-darkSurface text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-rv-darkBg transition-colors">
                    Cancelar
                </button>
                <button @click="$emit('confirm')"
                    class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2">
                    <i class="fa-solid fa-trash"></i>
                    Eliminar
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
interface Props {
    show: boolean;
    contentName: string;
}

defineProps<Props>();

defineEmits<{
    cancel: [];
    confirm: [];
}>();
</script>
