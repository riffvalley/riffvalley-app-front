<template>
  <!-- Selector de país con el mismo formato que el resto de filtros de Discos
       (50px, rounded-2xl, anillo navy). Lo usan Discos y Top Discos. -->
  <div class="country-select w-full min-w-0">
    <SearchableSelect
      v-model="model"
      :options="options"
      placeholder="Buscar país..."
      trigger-placeholder="Todos los países"
      all-label="Todos los países"
      title="name"
      trackby="id"
      :max="150"
      menu-variant="panel"
      class="select-pill w-full"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import SearchableSelect from "@components/SearchableSelect.vue";

interface CountryOption {
  id: string;
  name: string;
}

const props = defineProps<{
  modelValue: string;
  options: CountryOption[];
}>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const model = computed({
  get: () => props.modelValue,
  set: (value: string | number) => emit("update:modelValue", String(value ?? "")),
});
</script>

<style scoped>
/* El disparador de SearchableSelect trae estilo de píldora global: aquí se
   iguala al resto sin tocar otras pantallas que lo usan. */
.country-select :deep(.search_input_trigger) {
  height: 50px;
  line-height: 1.5rem;
  padding: 0 1rem;
  font-size: 1rem;
  @apply rounded-2xl border-gray-300 bg-white text-rv-navy shadow-sm;
}
.country-select :deep(.search_input_trigger:hover) {
  @apply border-gray-300;
}
.country-select :deep(.search_input_trigger:focus-visible),
.country-select :deep(.search_input_trigger[aria-expanded="true"]) {
  @apply border-gray-300 outline-none ring-2 ring-rv-navy;
}
.country-select :deep(.search_input_trigger i) {
  font-size: 0.75rem;
  @apply text-gray-500;
}
.dark .country-select :deep(.search_input_trigger i) {
  @apply !text-gray-300;
}
.country-select :deep(.search_input_trigger p) {
  /* Mismo grosor (500) que los demás selectores: años, meses, géneros. */
  @apply font-medium text-rv-navy;
}
.dark .country-select :deep(.search_input_trigger) {
  @apply !border-white/20 !bg-rv-darkCard !text-white;
}
.dark .country-select :deep(.search_input_trigger:focus-visible),
.dark .country-select :deep(.search_input_trigger[aria-expanded="true"]) {
  @apply ring-gray-200;
}
</style>
