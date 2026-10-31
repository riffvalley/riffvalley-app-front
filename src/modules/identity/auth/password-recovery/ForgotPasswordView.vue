<script setup lang="ts">
import { shallowRef } from "vue";
import { useRouter } from "vue-router";
import { requestPasswordReset } from "./api/passwordRecovery";

const router = useRouter();
const email = shallowRef("");
const loading = shallowRef(false);
const submitted = shallowRef(false);
const error = shallowRef<string | null>(null);

function responseStatus(cause: unknown): number | null {
  if (typeof cause !== "object" || cause === null || !("response" in cause)) return null;
  const response = cause.response;
  if (typeof response !== "object" || response === null || !("status" in response)) return null;
  return typeof response.status === "number" ? response.status : null;
}

async function submitRequest(): Promise<void> {
  if (loading.value || submitted.value) return;
  error.value = null;
  loading.value = true;

  try {
    await requestPasswordReset(email.value.trim());
    submitted.value = true;
  } catch (cause: unknown) {
    const status = responseStatus(cause);
    if (status === 429) {
      error.value =
        "Se han realizado demasiadas solicitudes. Espera un momento e inténtalo de nuevo.";
    } else if (status === 503) {
      error.value = "El servicio no está disponible temporalmente. Inténtalo más tarde.";
    } else if (status === null) {
      error.value =
        "No se pudo conectar con el servicio. Comprueba tu conexión e inténtalo de nuevo.";
    } else if (status === 400) {
      error.value = "Revisa el correo electrónico e inténtalo de nuevo.";
    } else {
      error.value = "No se pudo enviar la solicitud. Inténtalo más tarde.";
    }
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main
    class="min-h-[100svh] flex items-center justify-center px-4 py-8 bg-gradient-to-br from-orange-50 via-purple-50 to-blue-100 dark:from-[#0d0010] dark:via-rv-darkBg dark:to-[#00102a]"
  >
    <section
      class="w-full max-w-md overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-lg dark:border-white/10 dark:bg-rv-darkCard"
      aria-labelledby="forgot-password-title"
    >
      <header
        class="bg-gradient-to-r from-[#fe7b4a] via-[#a569aa] to-[#1464d0] px-6 py-6 text-center text-white"
      >
        <img src="/LOGO-RIFF-VALLEY.svg" alt="" class="mx-auto mb-2 h-12 w-12" />
        <p class="font-brand text-2xl tracking-wide">
          RIFF VALLEY <span class="text-sm">app</span>
        </p>
      </header>

      <div class="space-y-4 p-6 sm:p-8">
        <template v-if="submitted">
          <h1
            id="forgot-password-title"
            class="text-center text-xl font-bold text-rv-navy dark:text-white"
          >
            Revisa tu correo
          </h1>
          <p
            role="status"
            aria-live="polite"
            class="text-center text-sm leading-relaxed text-gray-600 dark:text-gray-300"
          >
            Si la cuenta existe, recibirás instrucciones para restablecer la contraseña.
          </p>
        </template>

        <template v-else>
          <h1
            id="forgot-password-title"
            class="text-center text-xl font-bold text-rv-navy dark:text-white"
          >
            Recuperar contraseña
          </h1>
          <p class="text-center text-sm text-gray-600 dark:text-gray-300">
            Introduce el correo asociado a tu cuenta.
          </p>

          <form class="space-y-4" @submit.prevent="submitRequest">
            <label
              for="forgot-password-email"
              class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              <span class="mb-1 block">Correo electrónico</span>
              <input
                id="forgot-password-email"
                v-model="email"
                type="email"
                name="email"
                autocomplete="email"
                maxlength="254"
                required
                :disabled="loading"
                class="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
              />
            </label>

            <p
              v-if="error"
              role="alert"
              aria-live="assertive"
              class="text-sm text-red-600 dark:text-red-400"
            >
              {{ error }}
            </p>

            <button
              type="submit"
              :disabled="loading"
              class="w-full rounded-full bg-gradient-to-r from-[#0c6ddc] to-[#0a56b3] px-4 py-3 font-bold text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rv-blueDark/30 disabled:cursor-wait disabled:opacity-60"
            >
              {{ loading ? "Enviando…" : "Enviar instrucciones" }}
            </button>
          </form>
        </template>

        <div class="text-center">
          <button
            type="button"
            class="rounded px-2 py-1 text-sm font-medium text-rv-blueDark hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:text-blue-300"
            @click="router.push({ name: 'Login' })"
          >
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    </section>
  </main>
</template>
