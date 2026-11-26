<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { faCircleInfo } from "@fortawesome/free-solid-svg-icons";

const open = ref(false);
const root = ref<HTMLElement | null>(null);

function toggle(): void {
  open.value = !open.value;
}

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
      aria-label="Cómo se ordena el ranking"
      :aria-expanded="open"
      aria-controls="top-discs-ranking-info"
      data-testid="ranking-info-button"
      @click.stop="toggle"
    >
      <font-awesome-icon :icon="faCircleInfo" aria-hidden="true" />
    </button>
    <Transition name="info-pop">
      <span
        v-if="open"
        id="top-discs-ranking-info"
        role="note"
        class="absolute left-1/2 top-full z-30 mt-2 w-64 -translate-x-1/2 rounded-xl border border-rv-pink/20 bg-white p-3 text-left text-xs leading-relaxed text-gray-600 shadow-lg dark:border-white/10 dark:bg-rv-darkCard dark:text-gray-300"
        data-testid="ranking-info"
      >
        <span class="mb-1 block font-bold text-rv-navy dark:text-white">¿Cómo se ordena?</span>
        El puesto combina la nota media y el número de votos. Un disco con buena nota y muchos
        votos puede quedar por delante de otro con una media algo mayor pero pocos votos.
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
</style>
