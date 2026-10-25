// @vitest-environment happy-dom
import axios, { AxiosError, AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

const { refresh, login, logout } = vi.hoisted(() => ({ refresh: vi.fn(), login: vi.fn(), logout: vi.fn() }));
let routerPush: ReturnType<typeof vi.spyOn>;

vi.mock("@/modules/identity/api/sessionAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/identity/api/sessionAuth")>();
  return { ...actual, sessionAuthTransport: { refresh, login, logout } };
});
vi.mock("sweetalert2", () => ({ default: { getPopup: vi.fn(() => null) } }));
vi.mock("@services/swal/SwalService", () => ({ default: { error: vi.fn() } }));

import { SessionAuthError } from "@/modules/identity/api/sessionAuth";
import SwalService from "@services/swal/SwalService";
import { useAuthStore } from "@/modules/identity/stores/auth";
import router from "/src/router";
import api, { configureApiAuth } from "./api";

const originalAdapter = api.defaults.adapter;

const renewedSession = {
  user: { id: "9", username: "Riff", role: "user" as const },
  token: "fresh-token",
  csrfToken: "fresh-csrf",
  logoutCsrfToken: "fresh-logout-csrf",
  expiresAt: "2026-11-01T00:00:00.000Z",
};

function responseFor(config: InternalAxiosRequestConfig, status: number): AxiosResponse {
  return {
    data: { ok: status === 200 },
    status,
    statusText: status === 200 ? "OK" : "Unauthorized",
    headers: new AxiosHeaders(),
    config,
  };
}

function unauthorized(config: InternalAxiosRequestConfig): AxiosError {
  const response = responseFor(config, 401);
  return new AxiosError("Unauthorized", AxiosError.ERR_BAD_REQUEST, config, undefined, response);
}

function useRenewableSession() {
  const authStore = useAuthStore();
  authStore.token = "expired-token";
  authStore.username = "Riff";
  authStore.userId = "9";
  authStore.role = "user";
  authStore.sessionMode = "renewable";
  authStore.authStatus = "authenticated";
  return authStore;
}

describe("shared Axios auth refresh", () => {
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    setActivePinia(createPinia());
    useAuthStore().authStatus = "anonymous";
    refresh.mockReset();
    login.mockReset();
    logout.mockReset();
    vi.mocked(SwalService.error).mockClear();
    await router.push("/national-releases/form");
    routerPush = vi.spyOn(router, "push");
    const authStore = useAuthStore();
    configureApiAuth({
      getSession: () => ({
        token: authStore.token,
        isAuthenticated: authStore.isAuthenticated,
        sessionMode: authStore.sessionMode,
        generation: authStore.authSessionGeneration,
      }),
      renewSession: (generation) => authStore.renewSession(generation),
      clearSessionLocally: () => authStore.clearSessionLocally(),
      logout: () => authStore.logout(),
      redirectToLogin: () => router.currentRoute.value.name === "Login"
        ? Promise.resolve()
        : router.push({ name: "Login" }),
    });
    api.defaults.adapter = async (config) => {
      if (config.headers.Authorization !== "Bearer fresh-token") {
        throw unauthorized(config as InternalAxiosRequestConfig);
      }
      return responseFor(config as InternalAxiosRequestConfig, 200);
    };
  });

  afterEach(() => {
    routerPush.mockRestore();
    api.defaults.adapter = originalAdapter;
  });

  it("shares one refresh for concurrent 401s and retries every original request once", async () => {
    const store = useRenewableSession();
    let finishRefresh!: (value: typeof renewedSession) => void;
    refresh.mockReturnValue(new Promise((resolve) => { finishRefresh = resolve; }));

    const requests = [api.get("/one"), api.get("/two"), api.get("/three")];
    await flushPromises();
    expect(refresh).toHaveBeenCalledTimes(1);

    finishRefresh(renewedSession);
    const responses = await Promise.all(requests);

    expect(responses).toHaveLength(3);
    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(store.token).toBe("fresh-token");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("uses a token already refreshed when a late 401 arrives", async () => {
    useRenewableSession();
    let releaseLate401!: () => void;
    api.defaults.adapter = async (config) => {
      if (config.url === "/late" && config.headers.Authorization === "Bearer expired-token") {
        await new Promise<void>((resolve) => { releaseLate401 = resolve; });
        throw unauthorized(config as InternalAxiosRequestConfig);
      }
      if (config.headers.Authorization === "Bearer expired-token") {
        throw unauthorized(config as InternalAxiosRequestConfig);
      }
      return responseFor(config as InternalAxiosRequestConfig, 200);
    };
    refresh.mockResolvedValue(renewedSession);

    const lateRequest = api.get("/late");
    const fastRequest = api.get("/fast");
    await expect(fastRequest).resolves.toMatchObject({ status: 200 });
    releaseLate401();
    await expect(lateRequest).resolves.toMatchObject({ status: 200 });

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("clears and redirects once when refresh definitively returns 401", async () => {
    const store = useRenewableSession();
    refresh.mockRejectedValue(new SessionAuthError("Unauthenticated", "unauthenticated", 401));

    const results = await Promise.allSettled([api.get("/one"), api.get("/two")]);

    expect(results.every((result) => result.status === "rejected")).toBe(true);
    expect(store.authStatus).toBe("anonymous");
    expect(store.token).toBeNull();
    expect(routerPush).toHaveBeenCalledTimes(1);
  });

  it.each([
    new SessionAuthError("Rate limited", "rate-limited", 429),
    new SessionAuthError("Unavailable", "unavailable", 503),
    new SessionAuthError("Offline", "network-error", null),
  ])("preserves the renewable session and surfaces temporary refresh failures", async (failure) => {
    const store = useRenewableSession();
    refresh.mockRejectedValue(failure);

    await expect(api.get("/protected")).rejects.toBe(failure);

    expect(store.authStatus).toBe("authenticated");
    expect(store.token).toBe("expired-token");
    expect(store.sessionMode).toBe("renewable");
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("does not refresh a 403", async () => {
    const store = useRenewableSession();
    api.defaults.adapter = async (config) => {
      const response = responseFor(config as InternalAxiosRequestConfig, 403);
      throw new AxiosError("Forbidden", AxiosError.ERR_BAD_REQUEST, config, undefined, response);
    };

    await expect(api.get("/forbidden")).rejects.toMatchObject({ response: { status: 403 } });
    expect(refresh).not.toHaveBeenCalled();
    expect(store.isAuthenticated).toBe(true);
  });

  it("does not re-enter refresh after the single retry also returns 401", async () => {
    const store = useRenewableSession();
    refresh.mockResolvedValue(renewedSession);
    api.defaults.adapter = async (config) => {
      throw unauthorized(config as InternalAxiosRequestConfig);
    };

    await expect(api.get("/still-unauthorized")).rejects.toMatchObject({ response: { status: 401 } });

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(store.authStatus).toBe("anonymous");
    expect(routerPush).toHaveBeenCalledTimes(1);
  });

  it("reports when cleanup after a second 401 cannot confirm backend revocation", async () => {
    useRenewableSession();
    refresh.mockResolvedValue(renewedSession);
    logout.mockRejectedValue(new SessionAuthError("Unavailable", "unavailable", 503));
    api.defaults.adapter = async (config) => {
      throw unauthorized(config as InternalAxiosRequestConfig);
    };

    await expect(api.get("/still-unauthorized")).rejects.toMatchObject({ response: { status: 401 } });
    await flushPromises();

    expect(SwalService.error).toHaveBeenCalledWith(
      "La sesión dejó de ser válida, pero el servidor no confirmó su revocación. La sesión podría seguir activa.",
    );
  });

  it("does not attach a bearer token or refresh excluded auth endpoints", async () => {
    const store = useRenewableSession();
    let sentAuthorization: unknown;
    api.defaults.adapter = async (config) => {
      sentAuthorization = config.headers.Authorization;
      throw unauthorized(config as InternalAxiosRequestConfig);
    };

    await expect(api.post("/auth/login", { username: "u", password: "p" })).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(sentAuthorization).toBeUndefined();
    expect(refresh).not.toHaveBeenCalled();
    expect(store.isAuthenticated).toBe(true);
  });

  it("does not restore a refresh result after logout has replaced the session", async () => {
    const store = useRenewableSession();
    let finishRefresh!: (value: typeof renewedSession) => void;
    refresh.mockReturnValue(new Promise((resolve) => { finishRefresh = resolve; }));

    const request = api.get("/protected");
    await flushPromises();
    store.logout();
    finishRefresh(renewedSession);
    await expect(request).rejects.toMatchObject({ response: { status: 401 } });

    expect(store.authStatus).toBe("anonymous");
    expect(store.token).toBeNull();
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("does not overwrite a new login with a refresh started by the previous session", async () => {
    const store = useRenewableSession();
    let finishRefresh!: (value: typeof renewedSession) => void;
    refresh.mockReturnValue(new Promise((resolve) => { finishRefresh = resolve; }));
    api.defaults.adapter = async (config) => {
      if (config.url === "/activity/app/daily") {
        return responseFor(config as InternalAxiosRequestConfig, 204);
      }
      if (config.headers.Authorization !== "Bearer fresh-token") {
        throw unauthorized(config as InternalAxiosRequestConfig);
      }
      return responseFor(config as InternalAxiosRequestConfig, 200);
    };
    login.mockResolvedValue({
      id: "22",
      username: "New user",
      role: "collaborator",
      token: "new-login-token",
      csrfToken: "csrf",
      logoutCsrfToken: "logout-csrf",
    });

    const request = api.get("/protected");
    await flushPromises();
    await store.login({ username: "new-user", password: "secret" });
    finishRefresh(renewedSession);
    await expect(request).rejects.toMatchObject({ response: { status: 401 } });

    expect(store.authStatus).toBe("authenticated");
    expect(store.token).toBe("new-login-token");
    expect(store.username).toBe("New user");
    expect(store.sessionMode).toBe("renewable");
    expect(routerPush).not.toHaveBeenCalled();
  });
});
