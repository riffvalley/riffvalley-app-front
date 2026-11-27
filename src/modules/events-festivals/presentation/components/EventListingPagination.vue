<script setup lang="ts">
defineProps<{
  currentPage: number;
  totalPages: number;
  totalItems: number;
  disabled: boolean;
}>();
const emit = defineEmits<{ changePage: [page: number] }>();
</script>

<template>
  <nav
    v-if="totalPages > 1"
    class="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4 dark:border-white/10"
    aria-label="Paginación de eventos"
  >
    <p class="text-sm text-gray-600 dark:text-gray-300" aria-live="polite">
      Página {{ currentPage }} de {{ totalPages }} · {{ totalItems }} eventos
    </p>
    <div class="flex gap-2">
      <button
        type="button"
        class="min-h-10 rounded-lg border border-gray-300 px-3 text-sm font-semibold text-rv-navy hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
        :disabled="disabled || currentPage <= 1"
        @click="emit('changePage', currentPage - 1)"
      >
        Anterior
      </button>
      <button
        type="button"
        class="min-h-10 rounded-lg border border-gray-300 px-3 text-sm font-semibold text-rv-navy hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
        :disabled="disabled || currentPage >= totalPages"
        @click="emit('changePage', currentPage + 1)"
      >
        Siguiente
      </button>
    </div>
  </nav>
</template>
