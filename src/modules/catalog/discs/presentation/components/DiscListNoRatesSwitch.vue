<template>
  <!-- «Sin votos» va en una caja como la de los selectores: el texto queda
       pegado al switch y toda la caja se puede pulsar. -->
  <div class="no-rates-control" role="group" aria-labelledby="disc-list-no-rates-label">
    <label class="no-rates-switch" title="Mostrar solo discos sin votos">
      <span id="disc-list-no-rates-label" class="no-rates-text">Sin votos</span>
      <input
        type="checkbox"
        role="switch"
        class="sr-only"
        aria-label="Mostrar solo discos sin votos"
        :checked="modelValue"
        @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
      />
      <span class="no-rates-switch-track" aria-hidden="true" />
    </label>
  </div>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();
</script>

<style scoped>
.no-rates-control {
  min-width: 0;
}
.no-rates-switch {
  @apply flex h-[50px] w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-gray-300 bg-white px-4 text-base text-rv-navy shadow-sm dark:border-white/20 dark:bg-rv-darkCard dark:text-white;
}
.no-rates-switch:has(input:focus-visible) {
  @apply ring-2 ring-rv-navy dark:ring-gray-200;
}
.no-rates-text {
  white-space: nowrap;
}
.no-rates-switch-track {
  flex-shrink: 0;
  position: relative;
  display: block;
  width: 3rem;
  height: 1.75rem;
  border-radius: 9999px;
  background: #d1d5db;
  transition: background-color 160ms ease;
}
.no-rates-switch-track::before {
  position: absolute;
  top: 0.25rem;
  left: 0.25rem;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 9999px;
  background: white;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.2);
  content: "";
  transition: transform 160ms ease;
}
.no-rates-switch input:checked + .no-rates-switch-track {
  background: #00021f;
}
.no-rates-switch input:checked + .no-rates-switch-track::before {
  transform: translateX(1.25rem);
}
.dark .no-rates-switch-track {
  background: #2a2b3d;
}
.dark .no-rates-switch input:checked + .no-rates-switch-track {
  background: #e5e7eb;
}
.dark .no-rates-switch input:checked + .no-rates-switch-track::before {
  background: #00021f;
}
</style>
