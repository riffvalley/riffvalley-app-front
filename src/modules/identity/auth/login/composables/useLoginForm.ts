import { ref } from "vue";
import { useRouter } from "vue-router";
import { SessionAuthError } from "@/modules/identity/auth/api/sessionAuth";
import { useAuthStore } from "@/modules/identity/auth/stores/auth";

export function useLoginForm() {
  const username = ref("");
  const password = ref("");
  const loading = ref(false);
  const error = ref<string | null>(null);
  const authStore = useAuthStore();
  const router = useRouter();

  const handleLogin = async () => {
    error.value = null;
    loading.value = true;
    try {
      await authStore.login({ username: username.value, password: password.value });
      router.push({ name: "Home" });
    } catch (cause: unknown) {
      if (cause instanceof SessionAuthError) {
        switch (cause.category) {
          case "unauthenticated":
            error.value = "Usuario o contraseña incorrectos.";
            break;
          case "forbidden":
            error.value = "No se pudo validar la solicitud de acceso. Recarga la página e inténtalo de nuevo.";
            break;
          case "rate-limited":
            error.value = "Demasiados intentos. Espera un momento antes de volver a intentarlo.";
            break;
          case "unavailable":
          case "network-error":
            error.value = "El servicio de acceso no está disponible temporalmente. Inténtalo más tarde.";
            break;
          default:
            error.value = "No se pudo completar el acceso. Inténtalo de nuevo.";
        }
      } else {
        error.value = "No se pudo completar el acceso. Inténtalo de nuevo.";
      }
    } finally {
      loading.value = false;
    }
  };

  return { username, password, loading, error, handleLogin };
}
