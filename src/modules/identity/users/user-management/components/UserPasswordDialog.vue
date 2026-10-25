<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";

const props = defineProps<{
  open: boolean;
  username?: string;
  modelValue: string;
  passwordVisible: boolean;
  validationError: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
  "update:passwordVisible": [value: boolean];
  submit: [];
  close: [];
}>();

const password = computed({
  get: () => props.modelValue,
  set: (value: string) => emit("update:modelValue", value),
});

const passwordVisible = computed({
  get: () => props.passwordVisible,
  set: (value: boolean) => emit("update:passwordVisible", value),
});

const dialog = ref<HTMLElement | null>(null);
const focusableSelector = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

watch(() => props.open, async (open) => {
  if (!open) return;
  await nextTick();
  (dialog.value?.querySelector<HTMLElement>('[autofocus]') ?? dialog.value?.querySelector<HTMLElement>(focusableSelector))?.focus();
}, { immediate: true });

function handleDialogKeydown(event: KeyboardEvent) {
  if (event.key !== "Tab" || !dialog.value) return;
  const focusable = Array.from(dialog.value.querySelectorAll<HTMLElement>(focusableSelector));
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!first || !last) {
    event.preventDefault();
    dialog.value.focus();
    return;
  }
  if (event.shiftKey && (document.activeElement === first || !dialog.value.contains(document.activeElement))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || !dialog.value.contains(document.activeElement))) {
    event.preventDefault();
    first.focus();
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-overlay" @click.self="emit('close')">
      <div
        ref="dialog"
        class="modal-content modal-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-user-password-dialog-title"
        tabindex="-1"
        @keydown="handleDialogKeydown"
        @keydown.esc.stop.prevent="emit('close')"
      >
        <button type="button" @click="emit('close')" class="modal-close" aria-label="Cerrar diálogo de cambio de contraseña">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h3 id="change-user-password-dialog-title" class="text-xl font-bold text-gray-900 dark:text-white mb-1">Cambiar Contraseña</h3>
        <p class="text-gray-500 dark:text-gray-400 mb-6">
          Usuario: <span class="text-rv-pink font-medium">{{ username }}</span>
        </p>

        <form @submit.prevent="emit('submit')">
          <div>
            <label for="change-user-password" class="block text-sm text-rv-pink mb-1.5 font-medium">Nueva contraseña</label>
            <div class="relative">
              <input
                id="change-user-password"
                v-model="password"
                :type="passwordVisible ? 'text' : 'password'"
                placeholder="Mínimo 6 caracteres"
                class="modal-input pr-10"
                required
                autofocus
              />
              <button type="button" @click="passwordVisible = !passwordVisible"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 focus:outline-none"
                :aria-label="passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'">
                <i :class="passwordVisible ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'" class="text-sm"></i>
              </button>
            </div>
            <p v-if="validationError" class="mt-1.5 text-sm text-red-400">
              {{ validationError }}
            </p>
          </div>

          <div class="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-white/10">
            <button type="button" @click="emit('close')" class="modal-btn-cancel">Cancelar</button>
            <button type="submit" :disabled="!!validationError" class="modal-btn-primary">Guardar</button>
          </div>
        </form>
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

.modal-sm { max-width: 28rem; }

.modal-close {
  position: absolute;
  right: 1rem;
  top: 1rem;
  color: #e46e8a;
  transition: opacity 0.2s;
}

.modal-close:hover { opacity: 0.7; }

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

.modal-input::placeholder { color: #9ca3af; }

:global(.dark) .modal-input {
  background: #2a2b3d;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
}

:global(.dark) .modal-input::placeholder { color: #6b7280; }

.modal-btn-cancel {
  padding: 0.5rem 1rem;
  color: #374151;
  transition: opacity 0.2s;
}

.modal-btn-cancel:hover { opacity: 0.7; }
:global(.dark) .modal-btn-cancel { color: #e46e8a; }

.modal-btn-primary {
  padding: 0.5rem 1.25rem;
  background: linear-gradient(to right, #e46e8a, #b0669f);
  color: #fff;
  font-weight: 500;
  border-radius: 8px;
  transition: opacity 0.2s;
}

.modal-btn-primary:hover { opacity: 0.85; }
.modal-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
