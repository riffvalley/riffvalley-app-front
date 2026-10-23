import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
import Swal from "sweetalert2";
import router from "/src/router";
import SwalService from "@services/swal/SwalService";
import { useAuthStore } from "/src/stores/auth/auth";
import type { RenewSessionResult } from "/src/stores/auth/auth";

declare module "axios" {
  interface AxiosRequestConfig {
    _authRetry?: boolean;
    _authSessionGeneration?: number;
    _authAccessToken?: string | null;
  }
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

interface RefreshFlight {
  generation: number;
  promise: Promise<RenewSessionResult>;
}

let refreshFlight: RefreshFlight | null = null;
let loginRedirect: Promise<unknown> | null = null;

const SESSION_ENDPOINTS = ["/auth/csrf", "/auth/login", "/auth/refresh", "/auth/logout"];

function isSessionEndpoint(url?: string): boolean {
  if (!url) return false;
  const path = url.split("?")[0]?.replace(/\/+$/, "") ?? "";
  return SESSION_ENDPOINTS.some((endpoint) => path.endsWith(endpoint));
}

function redirectToLoginOnce(): void {
  if (router.currentRoute.value.name === "Login" || loginRedirect) return;
  loginRedirect = router.push({ name: "Login" }).finally(() => {
    loginRedirect = null;
  });
}

function getSharedRefresh(generation: number) {
  const authStore = useAuthStore();
  if (refreshFlight?.generation === generation) return refreshFlight.promise;

  const promise = authStore.renewSession(generation);
  refreshFlight = { generation, promise };
  const clearFlight = () => {
    if (refreshFlight?.promise === promise) refreshFlight = null;
  };
  void promise.then(clearFlight, clearFlight);
  return promise;
}

function retryWithCurrentAccessToken(config: InternalAxiosRequestConfig) {
  config._authRetry = true;
  return api.request(config);
}

api.interceptors.request.use((config) => {
  const authStore = useAuthStore();
  if (isSessionEndpoint(config.url)) {
    delete config.headers.Authorization;
    return config;
  }

  const token = authStore.isAuthenticated ? authStore.token : null;
  delete config.headers.Authorization;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config._authSessionGeneration = authStore.authSessionGeneration;
  config._authAccessToken = token;
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

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);

    const status = error.response?.status;
    const config = error.config as (AxiosRequestConfig & InternalAxiosRequestConfig) | undefined;
    if (status === 403) {
      // Deja que la vista maneje primero el error para evitar toasts duplicados.
      window.setTimeout(showForbiddenNotificationUnlessHandled, 0);
      return Promise.reject(error);
    }
    if (status !== 401 || !config || isSessionEndpoint(config.url)) {
      return Promise.reject(error);
    }

    const authStore = useAuthStore();
    const requestGeneration = config._authSessionGeneration;
    if (!authStore.isAuthenticated || !authStore.token || requestGeneration === undefined) {
      return Promise.reject(error);
    }
    if (requestGeneration !== authStore.authSessionGeneration) {
      return Promise.reject(error);
    }

    if (authStore.sessionMode !== "renewable") {
      authStore.clearSessionLocally();
      redirectToLoginOnce();
      return Promise.reject(error);
    }

    if (config._authRetry) {
      void authStore.logout().then((outcome) => {
        if (outcome.revocation === "unconfirmed") {
          void SwalService.error(
            "La sesión dejó de ser válida, pero el servidor no confirmó su revocación. La sesión podría seguir activa.",
          );
        }
      });
      redirectToLoginOnce();
      return Promise.reject(error);
    }

    config._authRetry = true;
    if (config._authAccessToken !== authStore.token) {
      return retryWithCurrentAccessToken(config as InternalAxiosRequestConfig);
    }

    try {
      const refreshResult = await getSharedRefresh(requestGeneration);
      if (refreshResult !== "renewed") {
        if (refreshResult === "unauthenticated") {
          redirectToLoginOnce();
        }
        return Promise.reject(error);
      }
      if (
        authStore.authSessionGeneration !== requestGeneration ||
        !authStore.isAuthenticated ||
        !authStore.token
      ) {
        return Promise.reject(error);
      }
      return retryWithCurrentAccessToken(config as InternalAxiosRequestConfig);
    } catch (refreshError: unknown) {
      // A transient refresh failure preserves the session and is surfaced to the caller.
      return Promise.reject(refreshError);
    }
  },
);

export default api;
