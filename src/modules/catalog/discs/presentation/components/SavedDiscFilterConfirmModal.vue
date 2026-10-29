<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from "vue";

const props = defineProps<{
  title: string;
  message: string;
  confirmLabel: string;
  dangerous?: boolean;
  pending: boolean;
}>();
const emit = defineEmits<{ close: []; confirm: [] }>();
const dialogElement = ref<HTMLElement | null>(null);
const confirmButton = ref<HTMLButtonElement | null>(null);
let previouslyFocused: HTMLElement | null = null;

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && !props.pending) {
    emit("close");
    return;
  }
  if (event.key !== "Tab") return;
  const focusable = dialogElement.value?.querySelectorAll<HTMLElement>(
    'button:not(:disabled)'
  );
  if (!focusable?.length) return;
  const first = focusable[0]!;
  const last = focusable[focusable.length - 1]!;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

onMounted(() => {
  previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  window.addEventListener("keydown", onKeydown);
  void nextTick(() => confirmButton.value?.focus());
});
onUnmounted(() => {
  window.removeEventListener("keydown", onKeydown);
  previouslyFocused?.focus();
});
</script>

<template>
  <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
    <section
      ref="dialogElement"
      class="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-rv-darkCard"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      aria-labelledby="saved-filter-confirm-title"
      aria-describedby="saved-filter-confirm-message"
    >
      <h2 id="saved-filter-confirm-title" class="text-lg font-bold text-rv-navy dark:text-white">
        {{ title }}
      </h2>
      <p id="saved-filter-confirm-message" class="mt-2 text-sm text-gray-700 dark:text-gray-200">
        {{ message }}
      </p>
      <div class="mt-5 flex justify-end gap-2">
        <button
          type="button"
          class="min-h-10 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-rv-navy hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rv-purple dark:border-white/20 dark:text-white dark:hover:bg-rv-darkSurface"
          :disabled="pending"
          @click="emit('close')"
        >
          Cancelar
        </button>
        <button
          ref="confirmButton"
          type="button"
          class="min-h-10 rounded-lg px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple disabled:cursor-not-allowed disabled:opacity-50"
          :class="dangerous ? 'bg-red-700 text-white hover:bg-red-800' : 'bg-rv-pink text-rv-navy hover:bg-rv-pink/85'"
          :disabled="pending"
          @click="emit('confirm')"
        >
          {{ pending ? 'Procesando…' : confirmLabel }}
        </button>
      </div>
    </section>
  </div>
</template>
