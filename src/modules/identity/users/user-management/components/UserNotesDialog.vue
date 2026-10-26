<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from "vue";

const props = defineProps<{
  open: boolean;
  username?: string;
  modelValue: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
  submit: [];
  close: [];
}>();

const notes = computed({
  get: () => props.modelValue,
  set: (value: string) => emit("update:modelValue", value),
});

const dialog = ref<HTMLElement | null>(null);
const focusableSelector =
  'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

watch(
  () => props.open,
  async (open) => {
    if (!open) {
      dialog.value?.removeEventListener("keydown", handleDialogKeydown);
      return;
    }
    await nextTick();
    const currentDialog = dialog.value;
    if (!currentDialog) return;
    currentDialog.addEventListener("keydown", handleDialogKeydown);
    (
      currentDialog.querySelector<HTMLElement>("[data-initial-focus]") ??
      currentDialog.querySelector<HTMLElement>(focusableSelector)
    )?.focus();
  },
  { immediate: true }
);

onUnmounted(() => dialog.value?.removeEventListener("keydown", handleDialogKeydown));

function handleDialogKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    event.stopPropagation();
    event.preventDefault();
    emit("close");
    return;
  }
  if (event.key !== "Tab" || !dialog.value) return;
  const focusable = Array.from(dialog.value.querySelectorAll<HTMLElement>(focusableSelector));
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!first || !last) {
    event.preventDefault();
    dialog.value.focus();
    return;
  }
  if (
    event.shiftKey &&
    (document.activeElement === first || !dialog.value.contains(document.activeElement))
  ) {
    event.preventDefault();
    last.focus();
  } else if (
    !event.shiftKey &&
    (document.activeElement === last || !dialog.value.contains(document.activeElement))
  ) {
    event.preventDefault();
    first.focus();
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" role="presentation" class="modal-overlay" @click.self="emit('close')">
      <div
        ref="dialog"
        class="modal-content modal-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-notes-dialog-title"
        tabindex="-1"
      >
        <button
          type="button"
          @click="emit('close')"
          class="modal-close"
          aria-label="Cerrar diálogo de notas"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <h3
          id="user-notes-dialog-title"
          class="text-xl font-bold text-gray-900 dark:text-white mb-1"
        >
          Notas
        </h3>
        <p class="text-gray-500 dark:text-gray-400 mb-6">
          Usuario: <span class="text-rv-pink font-medium">{{ username }}</span>
        </p>

        <label for="user-notes" class="block">
          <span class="sr-only">Notas del usuario</span>
          <textarea
            id="user-notes"
            v-model="notes"
            rows="6"
            class="modal-input resize-none block text-base"
            placeholder="Escribe notas sobre este usuario..."
            data-initial-focus
          ></textarea>
        </label>

        <div class="flex justify-end gap-3 pt-6 mt-4 border-t border-gray-200 dark:border-white/10">
          <button type="button" @click="emit('close')" class="modal-btn-cancel">Cancelar</button>
          <button type="button" @click="emit('submit')" class="modal-btn-primary">Guardar</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 1rem;
}

.modal-content {
  position: relative;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 1.5rem;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

:global(.dark) .modal-content {
  background: #404157;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-md {
  max-width: 36rem;
}

.modal-close {
  position: absolute;
  right: 1rem;
  top: 1rem;
  color: #e46e8a;
  transition: opacity 0.2s;
}

.modal-close:hover {
  opacity: 0.7;
}

.modal-input {
  width: 100%;
  padding: 0.625rem 1rem;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  color: #111827;
  transition: border-color 0.2s;
}

.modal-input:focus {
  outline: none;
  border-color: #e46e8a;
}

.modal-input::placeholder {
  color: #9ca3af;
}

:global(.dark) .modal-input {
  background: #2a2b3d;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
}

:global(.dark) .modal-input::placeholder {
  color: #6b7280;
}

.modal-btn-cancel {
  padding: 0.5rem 1rem;
  color: #374151;
  transition: opacity 0.2s;
}

.modal-btn-cancel:hover {
  opacity: 0.7;
}
:global(.dark) .modal-btn-cancel {
  color: #e46e8a;
}

.modal-btn-primary {
  padding: 0.5rem 1.25rem;
  background: linear-gradient(to right, #e46e8a, #b0669f);
  color: #fff;
  font-weight: 500;
  border-radius: 8px;
  transition: opacity 0.2s;
}

.modal-btn-primary:hover {
  opacity: 0.85;
}
.modal-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
