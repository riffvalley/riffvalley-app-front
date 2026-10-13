import axios from "axios";
import Swal from "sweetalert2";
import router from "/src/router"; // Asegúrate de ajustar la ruta según tu estructura
import SwalService from "@services/swal/SwalService";
import { useAuthStore } from "/src/stores/auth/auth";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // Cambia esto por tu URL base
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para agregar el token en cada solicitud
api.interceptors.request.use((config) => {
  const authStore = useAuthStore();
  const token = authStore.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function showForbiddenNotificationUnlessHandled() {
  const popup = Swal.getPopup();
  const viewAlreadyNotified = Boolean(
    popup && (
      popup.classList.contains("rv-toast-error") ||
      popup.querySelector(".swal2-icon-error")
    )
  );

  if (!viewAlreadyNotified) {
    void SwalService.error("No tienes permiso para realizar esta acción.");
  }
}

// Interceptor para manejar errores de autorización
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      console.warn("Sesión expirada o no autorizada, redirigiendo al login...");
      const authStore = useAuthStore();
      authStore.logout(); // Limpia el estado de autenticación
      router.push({ name: "Login" }); // Redirige al login
    } else if (axios.isAxiosError(error) && error.response?.status === 403) {
      // Deja que la vista maneje primero el error para evitar toasts duplicados.
      window.setTimeout(showForbiddenNotificationUnlessHandled, 0);
    }
    return Promise.reject(error);
  }
);

export default api;
