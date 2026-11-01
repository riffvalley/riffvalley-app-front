<script setup lang="ts">
defineProps<{
  loading: boolean;
  retrying: boolean;
  error: boolean;
}>();

const emit = defineEmits<{
  retry: [];
}>();
</script>

<template>
  <p v-if="loading" role="status" class="mb-4 text-sm text-gray-600 dark:text-gray-300">
    Cargando listas…
  </p>
  <p v-else-if="retrying" role="status" class="mb-4 text-sm text-gray-600 dark:text-gray-300">
    Reintentando consulta…
  </p>
  <div v-else-if="error" role="alert" class="mb-4 text-sm text-red-700 dark:text-red-300">
    <span>No se pudieron cargar las listas.</span>
    <button
      type="button"
      class="ml-2 rounded underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      @click="emit('retry')"
    >
      Reintentar
    </button>
  </div>
</template>
