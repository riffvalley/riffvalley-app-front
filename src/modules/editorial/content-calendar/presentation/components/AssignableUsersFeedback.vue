<template>
  <p v-if="loading" role="status" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
    Cargando usuarios asignables…
  </p>
  <p v-else-if="refreshing" role="status" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
    Actualizando usuarios asignables…
  </p>
  <p
    v-else-if="error"
    role="alert"
    class="mt-1 flex items-center gap-2 text-xs text-red-700 dark:text-red-300"
  >
    No se pudieron cargar los usuarios.
    <button type="button" class="underline" @click="emit('retry')">Reintentar</button>
  </p>
</template>

<script setup lang="ts">
defineProps<{
  loading: boolean;
  error: boolean;
  refreshing: boolean;
}>();

const emit = defineEmits<{ retry: [] }>();
</script>
