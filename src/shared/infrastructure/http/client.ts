import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";

export interface HttpSessionCallbacks {
  getToken(): string | null;
  getSessionVersion(): number;
  onUnauthorized(): void | Promise<unknown>;
}

/** Interceptors are installed once per client; configuration only replaces callbacks. */
export function createHttpClient(baseURL: string | undefined) {
  const client = axios.create({ baseURL, headers: { "Content-Type": "application/json" } });
  let callbacks: HttpSessionCallbacks = {
    getToken: () => null, getSessionVersion: () => 0, onUnauthorized: () => undefined,
  };
  const requests = new WeakMap<InternalAxiosRequestConfig, { token: string | null; version: number; callbacks: HttpSessionCallbacks }>();
  let expiration: { version: number; promise: Promise<unknown> } | null = null;

  client.interceptors.request.use((config) => {
    const token = callbacks.getToken();
    requests.set(config, { token, version: callbacks.getSessionVersion(), callbacks });
    if (token) config.headers.set("Authorization", `Bearer ${token}`);
    return config;
  });
  client.interceptors.response.use((response) => response, async (error: AxiosError) => {
    const request = error.config ? requests.get(error.config) : undefined;
    if (error.response?.status === 401 && request && request.callbacks === callbacks &&
      request.token === callbacks.getToken() && request.version === callbacks.getSessionVersion()) {
      if (!expiration || expiration.version !== request.version) {
        // Defer the callback so concurrent responses share the same promise.
        const promise = Promise.resolve().then(() => {
          // A login may have completed between the response check and this microtask.
          if (request.callbacks === callbacks && request.token === callbacks.getToken() &&
            request.version === callbacks.getSessionVersion()) return request.callbacks.onUnauthorized();
        }).catch((cause: unknown) => {
          console.warn("No se pudo completar la navegación tras expirar la sesión", cause);
        }).finally(() => { if (expiration?.promise === promise) expiration = null; });
        expiration = { version: request.version, promise };
      }
      await expiration.promise;
    }
    // Preserve the transport error even if session/navigation cleanup fails.
    return Promise.reject(error);
  });
  return { client, configureSession: (next: HttpSessionCallbacks) => { callbacks = next; } };
}

const transport = createHttpClient(import.meta.env.VITE_API_BASE_URL);
export const configureHttpSession = transport.configureSession;
export default transport.client;
