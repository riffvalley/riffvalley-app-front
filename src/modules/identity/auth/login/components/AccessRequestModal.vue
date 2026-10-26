<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md px-4"
    >
      <div
        role="presentation"
        aria-hidden="true"
        class="absolute inset-0"
        @click="emit('close')"
      ></div>
      <div
        ref="dialogEl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="access-request-title"
        tabindex="-1"
        class="w-[93%] sm:w-full sm:max-w-sm rounded-3xl bg-white dark:bg-rv-darkCard border border-gray-100 dark:border-white/10 shadow-2xl dark:shadow-black/40 overflow-hidden relative"
      >
        <!-- Cabecera (mismo estilo que el login card) -->
        <div
          class="relative px-6 pt-6 pb-5 text-center bg-gradient-to-b from-[#fe7b4a] via-[#a569aa] to-[#1464d0]"
        >
          <!-- Botón cerrar -->
          <button
            ref="closeButton"
            type="button"
            @click="$emit('close')"
            class="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-rv-navy hover:bg-rv-pink text-white flex items-center justify-center shadow-md transition-all duration-150 border-0 outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0"
            aria-label="Cerrar"
          >
            <i class="fa-solid fa-xmark text-sm"></i>
          </button>

          <img
            src="/LOGO-RIFF-VALLEY.svg"
            alt="Riff Valley Logo"
            class="w-12 h-12 mx-auto mb-3 drop-shadow"
          />
          <h2 id="access-request-title" class="text-xl font-bold text-white drop-shadow-sm">
            Solicitar acceso
          </h2>
          <p class="mt-1 text-sm text-white/80 leading-relaxed">
            Dinos tu email y un alias y te contactaremos con instrucciones.
          </p>
        </div>

        <!-- Formulario -->
        <form @submit.prevent="submitRequest" class="p-5 space-y-4">
          <div>
            <label
              for="access-request-email"
              class="block text-sm font-semibold text-rv-navy dark:text-white mb-1"
            >
              Email
              <input
                id="access-request-email"
                v-model="email"
                type="email"
                required
                placeholder="tu@email.com"
                class="w-full px-4 py-2 border border-gray-200 dark:border-white/10 rounded-full bg-white dark:bg-rv-darkSurface text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rv-pink/40"
              />
            </label>
          </div>

          <div>
            <label
              for="access-request-alias"
              class="block text-sm font-semibold text-rv-navy dark:text-white mb-1"
            >
              Alias
              <input
                id="access-request-alias"
                v-model="alias"
                type="text"
                required
                placeholder="Tu alias"
                class="w-full px-4 py-2 border border-gray-200 dark:border-white/10 rounded-full bg-white dark:bg-rv-darkSurface text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rv-pink/40"
              />
            </label>
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-gradient-to-r from-[#0c6ddc] to-[#0a56b3] text-white font-bold py-2 rounded-full shadow-md shadow-blue-900/25 hover:from-[#0a5fc2] hover:to-[#084a9a] hover:shadow-md hover:shadow-blue-900/40 hover:-translate-y-[1px] active:scale-[0.98] active:translate-y-0 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-rv-blueDark/25"
          >
            {{ loading ? "Enviando..." : "Solicitar acceso" }}
          </button>

          <p
            v-if="success"
            role="status"
            class="text-green-600 dark:text-green-400 text-sm text-center font-medium"
          >
            ¡Solicitud enviada! Te contactaremos pronto.
          </p>

          <p v-if="error" role="alert" class="text-red-500 text-sm text-center">
            {{ error }}
          </p>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { isAxiosError } from "axios";
import { onMounted, onUnmounted, ref } from "vue";
import { sendAccessRequest } from "@/modules/identity/auth/login/api/accessRequest";

const emit = defineEmits<{ close: [] }>();
const dialogEl = ref<HTMLElement | null>(null);
const closeButton = ref<HTMLButtonElement | null>(null);
let previouslyFocusedElement: HTMLElement | null = null;

function handleDialogKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    emit("close");
    return;
  }

  if (event.key !== "Tab" || !dialogEl.value) return;
  const focusable = dialogEl.value.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable.item(0);
  const last = focusable.item(focusable.length - 1);

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}

function keepFocusInDialog(event: FocusEvent) {
  if (dialogEl.value && !dialogEl.value.contains(event.target as Node)) {
    closeButton.value?.focus();
  }
}

onMounted(() => {
  previouslyFocusedElement =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  document.addEventListener("keydown", handleDialogKeydown);
  document.addEventListener("focusin", keepFocusInDialog);
  closeButton.value?.focus();
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleDialogKeydown);
  document.removeEventListener("focusin", keepFocusInDialog);
  previouslyFocusedElement?.focus();
});

const email = ref("");
const alias = ref("");
const loading = ref(false);
const success = ref(false);
const error = ref("");

async function submitRequest() {
  error.value = "";
  success.value = false;
  loading.value = true;

  try {
    await sendAccessRequest({ email: email.value, alias: alias.value });
    success.value = true;
    email.value = "";
    alias.value = "";
  } catch (caught: unknown) {
    const responseMessage = isAxiosError<{ message?: string }>(caught)
      ? caught.response?.data?.message
      : undefined;
    error.value = responseMessage || "No se pudo enviar la solicitud. Inténtalo de nuevo.";
  } finally {
    loading.value = false;
  }
}
</script>
