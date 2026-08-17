import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

declare module 'axios' {
  interface AxiosRequestConfig {
    auth?: { skipAccessToken?: boolean; skipGlobalUnauthorized?: boolean };
  }
  interface InternalAxiosRequestConfig {
    auth?: { skipAccessToken?: boolean; skipGlobalUnauthorized?: boolean; accessToken?: string | null };
  }
}

interface AuthHttpOptions {
  getAccessToken(): string | null;
  onUnauthorized(): void | Promise<void>;
}

export function configureAuthHttp(client: AxiosInstance, options: AuthHttpOptions): void {
  let expiration: Promise<void> | null = null;
  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (config.auth?.skipAccessToken) return config;
    const token = options.getAccessToken();
    config.auth = { ...config.auth, accessToken: token };
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  client.interceptors.response.use(undefined, async (error: AxiosError) => {
    const config = error.config;
    if (error.response?.status === 401 && !config?.auth?.skipGlobalUnauthorized &&
        config?.auth?.accessToken && config.auth.accessToken === options.getAccessToken()) {
      if (!expiration) {
        expiration = Promise.resolve(options.onUnauthorized()).finally(() => { expiration = null; });
      }
      await expiration;
    }
    return Promise.reject(error);
  });
}
