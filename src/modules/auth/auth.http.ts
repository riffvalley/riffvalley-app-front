import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

declare module 'axios' {
  interface AxiosRequestConfig {
    authMeta?: { skipAccessToken?: boolean; skipGlobalUnauthorized?: boolean };
  }
  interface InternalAxiosRequestConfig {
    authMeta?: { skipAccessToken?: boolean; skipGlobalUnauthorized?: boolean; accessToken?: string | null };
  }
}

interface AuthHttpOptions {
  getAccessToken(): string | null;
  onUnauthorized(): void | Promise<void>;
}

export function configureAuthHttp(client: AxiosInstance, options: AuthHttpOptions): void {
  let expiration: Promise<void> | null = null;
  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (config.authMeta?.skipAccessToken) return config;
    const token = options.getAccessToken();
    config.authMeta = { ...config.authMeta, accessToken: token };
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  client.interceptors.response.use(undefined, async (error: AxiosError) => {
    const config = error.config;
    if (error.response?.status === 401 && !config?.authMeta?.skipGlobalUnauthorized &&
        config?.authMeta?.accessToken && config.authMeta.accessToken === options.getAccessToken()) {
      if (!expiration) {
        expiration = Promise.resolve(options.onUnauthorized()).finally(() => { expiration = null; });
      }
      await expiration;
    }
    return Promise.reject(error);
  });
}
