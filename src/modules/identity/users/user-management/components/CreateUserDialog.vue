<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from "vue";

interface CreateUserForm {
  email: string;
  username: string;
  password: string;
}

const props = defineProps<{
  open: boolean;
  modelValue: CreateUserForm;
  passwordError: string;
  passwordVisible: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: CreateUserForm];
  "update:passwordVisible": [value: boolean];
  submit: [];
  close: [];
}>();

const email = computed({
  get: () => props.modelValue.email,
  set: (email: string) => emit("update:modelValue", { ...props.modelValue, email }),
});

const username = computed({
  get: () => props.modelValue.username,
  set: (username: string) => emit("update:modelValue", { ...props.modelValue, username }),
});

const password = computed({
  get: () => props.modelValue.password,
  set: (password: string) => emit("update:modelValue", { ...props.modelValue, password }),
});

const passwordVisible = computed({
  get: () => props.passwordVisible,
  set: (visible: boolean) => emit("update:passwordVisible", visible),
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
        class="modal-content modal-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-user-dialog-title"
        tabindex="-1"
      >
        <button
          type="button"
          @click="emit('close')"
          class="modal-close"
          aria-label="Cerrar diálogo de creación de usuario"
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
          id="create-user-dialog-title"
          class="text-xl font-bold text-gray-900 dark:text-white mb-6"
        >
          Crear Nuevo Usuario
        </h3>
        <form @submit.prevent="emit('submit')" class="space-y-5">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="create-user-email" class="block text-sm text-rv-pink mb-1.5 font-medium">
                Email
                <input
                  id="create-user-email"
                  v-model="email"
                  type="email"
                  placeholder="email@ejemplo.com"
                  class="modal-input block text-base"
                  required
                  data-initial-focus
                />
              </label>
            </div>
            <div>
              <label
                for="create-user-username"
                class="block text-sm text-rv-pink mb-1.5 font-medium"
              >
                Username
                <input
                  id="create-user-username"
                  v-model="username"
                  type="text"
                  placeholder="nombreusuario"
                  class="modal-input block text-base"
                  minlength="4"
                  required
                />
              </label>
            </div>
          </div>

          <p class="text-sm text-gray-500 dark:text-gray-400">
            Las cuentas nuevas se crean con el rol User.
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div class="relative">
                <label
                  for="create-user-password"
                  class="block text-sm text-rv-pink mb-1.5 font-medium"
                >
                  Contraseña
                  <input
                    id="create-user-password"
                    v-model="password"
                    :type="passwordVisible ? 'text' : 'password'"
                    placeholder="Mínimo 6 caracteres"
                    class="modal-input pr-10 block text-base"
                    minlength="6"
                    maxlength="50"
                    required
                    :aria-invalid="!!passwordError"
                    :aria-describedby="passwordError ? 'create-user-password-error' : undefined"
                  />
                </label>
                <button
                  type="button"
                  @click="passwordVisible = !passwordVisible"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 focus:outline-none"
                  :aria-label="passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                >
                  <i
                    :class="passwordVisible ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"
                    class="text-sm"
                  ></i>
                </button>
              </div>
              <p
                v-if="passwordError"
                id="create-user-password-error"
                role="alert"
                class="mt-1.5 text-sm text-red-400"
              >
                {{ passwordError }}
              </p>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
            <button type="button" @click="emit('close')" class="modal-btn-cancel">Cancelar</button>
            <button type="submit" :disabled="!!passwordError" class="modal-btn-primary">
              Crear Usuario
            </button>
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

.modal-lg {
  max-width: 48rem;
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
