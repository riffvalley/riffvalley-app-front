<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { resetPassword } from "./api/passwordRecovery";
import { PASSWORD_MAX_LENGTH, getPasswordValidationError } from "./utils/passwordValidation";
import { readAndRemoveResetTokenFragment } from "./utils/readResetToken";

const token = shallowRef(
  readAndRemoveResetTokenFragment(window.location, window.history, document.title)
);
const password = shallowRef("");
const confirmation = shallowRef("");
const showPassword = shallowRef(false);
const showConfirmation = shallowRef(false);
const loading = shallowRef(false);
const completed = shallowRef(false);
const error = shallowRef<string | null>(null);
const passwordError = computed(() =>
  password.value ? getPasswordValidationError(password.value) : null
);
const passwordMismatch = computed(
  () => confirmation.value.length > 0 && password.value !== confirmation.value
);

function responseStatus(cause: unknown): number | null {
  if (typeof cause !== "object" || cause === null || !("response" in cause)) return null;
  const response = cause.response;
  if (typeof response !== "object" || response === null || !("status" in response)) return null;
  return typeof response.status === "number" ? response.status : null;
}

async function submitReset(): Promise<void> {
  if (loading.value || completed.value || !token.value) return;
  error.value = null;
  if (passwordError.value) {
    error.value = passwordError.value;
    return;
  }
  if (password.value !== confirmation.value) {
    error.value = "Las contraseñas no coinciden.";
    return;
  }

  loading.value = true;
  try {
    await resetPassword({ token: token.value, password: password.value });
    token.value = null;
    password.value = "";
    confirmation.value = "";
    showPassword.value = false;
    showConfirmation.value = false;
    completed.value = true;
  } catch (cause: unknown) {
    const status = responseStatus(cause);
    if (status === 429) {
      error.value = "Se han realizado demasiados intentos. Espera un momento e inténtalo de nuevo.";
    } else if (status === 503) {
      error.value = "El servicio no está disponible temporalmente. Inténtalo más tarde.";
    } else if (status === 400) {
      error.value =
        "El enlace no es válido, ha caducado o ya se ha utilizado. Solicita uno nuevo para continuar.";
    } else if (status === null) {
      error.value =
        "No se pudo conectar con el servicio. Comprueba tu conexión e inténtalo de nuevo.";
    } else {
      error.value = "No se pudo actualizar la contraseña. Inténtalo de nuevo.";
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
      aria-labelledby="reset-password-title"
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
        <template v-if="completed">
          <h1
            id="reset-password-title"
            class="text-center text-xl font-bold text-rv-navy dark:text-white"
          >
            Contraseña actualizada
          </h1>
          <p
            role="status"
            aria-live="polite"
            class="text-center text-sm leading-relaxed text-gray-600 dark:text-gray-300"
          >
            La recuperación se ha completado. Ya puedes iniciar sesión con tu nueva contraseña.
          </p>
        </template>

        <template v-else-if="!token">
          <h1
            id="reset-password-title"
            class="text-center text-xl font-bold text-rv-navy dark:text-white"
          >
            Enlace no disponible
          </h1>
          <p
            role="alert"
            class="text-center text-sm leading-relaxed text-gray-600 dark:text-gray-300"
          >
            El enlace no es válido, ha caducado o ya se ha utilizado. Solicita uno nuevo para
            continuar.
          </p>
        </template>

        <template v-else>
          <h1
            id="reset-password-title"
            class="text-center text-xl font-bold text-rv-navy dark:text-white"
          >
            Elige una nueva contraseña
          </h1>
          <p class="text-center text-sm text-gray-600 dark:text-gray-300">
            La contraseña debe tener entre 6 y {{ PASSWORD_MAX_LENGTH }} caracteres, incluir
            mayúscula y minúscula, y un número o símbolo.
          </p>

          <form class="space-y-4" @submit.prevent="submitReset">
            <div class="relative">
              <label
                for="reset-password-new"
                class="block text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                <span class="mb-1 block">Nueva contraseña</span>
                <input
                  id="reset-password-new"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  name="new-password"
                  autocomplete="new-password"
                  :maxlength="PASSWORD_MAX_LENGTH"
                  required
                  :disabled="loading"
                  aria-describedby="reset-password-policy"
                  class="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-14 text-gray-900 outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
                />
              </label>
              <button
                type="button"
                :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                class="absolute bottom-0 right-2 rounded px-3 py-3 text-sm text-gray-600 hover:text-rv-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:text-gray-300 dark:hover:text-white"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? "Ocultar" : "Mostrar" }}
              </button>
              <p
                v-if="passwordError"
                id="reset-password-policy"
                class="mt-1 text-xs text-red-600 dark:text-red-400"
              >
                {{ passwordError }}
              </p>
              <p v-else id="reset-password-policy" class="sr-only">
                Entre 6 y {{ PASSWORD_MAX_LENGTH }} caracteres, con mayúscula, minúscula y número o
                símbolo.
              </p>
            </div>

            <div class="relative">
              <label
                for="reset-password-confirmation"
                class="block text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                <span class="mb-1 block">Confirma la contraseña</span>
                <input
                  id="reset-password-confirmation"
                  v-model="confirmation"
                  :type="showConfirmation ? 'text' : 'password'"
                  name="confirm-password"
                  autocomplete="new-password"
                  :maxlength="PASSWORD_MAX_LENGTH"
                  required
                  :disabled="loading"
                  :aria-invalid="passwordMismatch"
                  :aria-describedby="passwordMismatch ? 'reset-password-mismatch' : undefined"
                  class="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-14 text-gray-900 outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
                />
              </label>
              <button
                type="button"
                :aria-label="showConfirmation ? 'Ocultar confirmación' : 'Mostrar confirmación'"
                class="absolute bottom-0 right-2 rounded px-3 py-3 text-sm text-gray-600 hover:text-rv-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:text-gray-300 dark:hover:text-white"
                @click="showConfirmation = !showConfirmation"
              >
                {{ showConfirmation ? "Ocultar" : "Mostrar" }}
              </button>
              <p
                v-if="passwordMismatch"
                id="reset-password-mismatch"
                class="mt-1 text-xs text-red-600 dark:text-red-400"
              >
                Las contraseñas no coinciden.
              </p>
            </div>

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
              {{ loading ? "Actualizando…" : "Restablecer contraseña" }}
            </button>
          </form>
        </template>

        <div class="text-center">
          <RouterLink
            :to="{ name: 'Login' }"
            class="rounded px-2 py-1 text-sm font-medium text-rv-blueDark hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rv-pink dark:text-blue-300"
          >
            Volver al inicio de sesión
          </RouterLink>
        </div>
      </div>
    </section>
  </main>
</template>
