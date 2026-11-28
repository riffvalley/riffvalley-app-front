<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef } from "vue";

// Ventanita de ayuda igual que la de Top Discos y Artistas: se abre con la «i»
// y se cierra al pinchar fuera, con Escape o volviendo a pulsar la «i».
withDefaults(
  defineProps<{
    /** id del texto, enlazado al botón con aria-controls. */
    id: string;
    /** Lo que lee el lector de pantalla en el botón. */
    label: string;
    /** Título en negrita de la ventanita. */
    title: string;
    /** Lado de la pantalla en móvil (grid de 2 columnas) para que no se salga. */
    mobileAlign?: "left" | "right";
  }>(),
  { mobileAlign: "right" },
);

const open = shallowRef(false);
const root = ref<HTMLElement | null>(null);

function onDocumentClick(event: MouseEvent): void {
  if (open.value && root.value && !root.value.contains(event.target as Node)) open.value = false;
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") open.value = false;
}

onMounted(() => document.addEventListener("click", onDocumentClick));
onBeforeUnmount(() => document.removeEventListener("click", onDocumentClick));
</script>

<template>
  <span ref="root" class="relative inline-flex" @keydown="onKeydown">
    <button
      type="button"
      class="!inline-flex !h-6 !w-6 !items-center !justify-center !rounded-full !border-0 !bg-transparent !p-0 !text-gray-400 !shadow-none transition-colors hover:!text-rv-pink focus-visible:!outline focus-visible:!outline-2 focus-visible:!outline-offset-2 focus-visible:!outline-rv-pink dark:!text-gray-400 dark:hover:!text-rv-pink"
      :aria-expanded="open"
      :aria-controls="id"
      :aria-label="label"
      @click.stop="open = !open"
    >
      <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
    </button>
    <Transition name="info-pop">
      <span
        v-if="open"
        :id="id"
        role="note"
        class="absolute top-full z-30 mt-2 w-64 rounded-xl border border-rv-pink/20 bg-white p-3 text-left text-xs normal-case leading-relaxed tracking-normal text-gray-600 shadow-lg dark:border-white/10 dark:bg-rv-darkCard dark:text-gray-300 sm:left-1/2 sm:right-auto sm:-translate-x-1/2"
        :class="mobileAlign === 'right' ? 'right-0' : 'left-0'"
      >
        <span class="mb-1 block font-bold text-rv-navy dark:text-white">{{ title }}</span>
        <slot />
      </span>
    </Transition>
  </span>
</template>

<style scoped>
.info-pop-enter-active,
.info-pop-leave-active {
  transition: opacity 0.15s ease;
}
.info-pop-enter-from,
.info-pop-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .info-pop-enter-active,
  .info-pop-leave-active { transition: none; }
}
</style>
