<script setup lang="ts">
defineProps<{
  loading: boolean;
  error: boolean;
  empty: boolean;
  message: string;
}>();
const emit = defineEmits<{ retry: [] }>();
</script>

<template>
  <div
    v-if="loading || error || empty"
    class="rounded-xl border border-gray-200 bg-white px-5 py-12 text-center dark:border-white/10 dark:bg-rv-darkCard"
    :role="error ? 'alert' : 'status'"
    aria-live="polite"
  >
    <p class="font-semibold text-rv-navy dark:text-white">
      {{ loading ? "Cargando eventos…" : error ? message : "No hay eventos para mostrar." }}
    </p>
    <button
      v-if="error"
      type="button"
      class="mt-4 min-h-10 rounded-lg bg-rv-navy px-4 text-sm font-semibold text-white hover:bg-rv-blueDark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple dark:bg-gray-200 dark:text-rv-navy dark:hover:bg-white"
      @click="emit('retry')"
    >
      Reintentar
    </button>
  </div>
</template>
