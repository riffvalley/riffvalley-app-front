<script setup lang="ts">
interface CountryOption {
  id: string;
  isoCode: string;
  label: string;
}

defineProps<{
  options: CountryOption[];
  modelValue: string;
  loading: boolean;
  error: boolean;
  issues: string[];
}>();

const emit = defineEmits<{
  "update:modelValue": [countryId: string];
  retry: [];
}>();
</script>

<template>
  <div class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
    <label
      for="event-import-country"
      class="flex shrink-0 flex-wrap items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-200"
    >
      País de la importación
      <select
        id="event-import-country"
        :value="modelValue"
        :disabled="loading || options.length === 0"
        :aria-describedby="issues.length || error ? 'event-import-country-status' : undefined"
        class="min-h-10 min-w-48 rounded-md border border-gray-300 bg-white px-3 text-sm font-normal text-gray-900 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rv-purple disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
        @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      >
        <option v-if="!modelValue" value="">
          {{ loading ? "Cargando países…" : "Selecciona un país" }}
        </option>
        <option v-for="country in options" :key="country.id" :value="country.id">
          {{ country.label }}
        </option>
      </select>
    </label>
    <span v-if="loading" role="status" class="text-sm text-gray-600 dark:text-gray-300">
      Cargando catálogo de países…
    </span>
    <div
      v-if="error || issues.length"
      id="event-import-country-status"
      class="basis-full text-sm text-amber-800 dark:text-amber-200"
      :role="error ? 'alert' : 'status'"
    >
      <p v-if="error" class="inline">
        No se pudo cargar el catálogo de países.
        <button
          type="button"
          class="ml-1 font-semibold underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
          @click="emit('retry')"
        >
          Reintentar
        </button>
      </p>
      <p v-for="issue in issues" :key="issue">{{ issue }}</p>
      <p v-if="!modelValue && !error && !issues.length">
        No hay un país disponible para seleccionar.
      </p>
    </div>
  </div>
</template>
