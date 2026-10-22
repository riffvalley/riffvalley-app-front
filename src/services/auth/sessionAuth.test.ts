// @vitest-environment happy-dom
import axios, { type AxiosInstance, type AxiosResponse } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AUTH_SESSION_MODE,
  AUTH_SESSION_MODE_HEADER,
  CSRF_HEADER,
  REFRESH_OPERATION_HEADER,
  SessionAuthError,
  SessionAuthTransport,
  type SessionLoginResponse,
  type SessionRefreshResponse,
} from "./sessionAuth";

const loginResponse: SessionLoginResponse = {
  id: "user-1",
  username: "riff",
  role: "user",
  token: "access-jwt",
  csrfToken: "refresh-csrf-1",
  logoutCsrfToken: "logout-csrf-1",
  image: null,
  dashboardButtonsEnabled: false,
};

const refreshResponse: SessionRefreshResponse = {
  user: {
    id: "user-1",
    username: "riff",
    role: "user",
    image: null,
  },
  token: "next-access-jwt",
  csrfToken: "refresh-csrf-2",
  logoutCsrfToken: "logout-csrf-2",
  expiresAt: "2027-01-01T00:00:00.000Z",
};

function axiosResponse<T>(data: T, status = 200): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: "OK",
    headers: {},
    config: { headers: axios.AxiosHeaders.from({}) },
  } as AxiosResponse<T>;
}

function makeHttpClient(): AxiosInstance {
  return axios.create({ baseURL: "https://backend.riffvalley.es/api" });
}

describe("SessionAuthTransport", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("bootstraps CSRF and negotiates refresh-v1 login with browser credentials", async () => {
    const http = makeHttpClient();
    const get = vi.spyOn(http, "get").mockResolvedValue(
      axiosResponse({ csrfToken: "bootstrap-csrf" }),
    );
    const post = vi.spyOn(http, "post").mockResolvedValue(axiosResponse(loginResponse));
    const transport = new SessionAuthTransport(http);

    const result = await transport.login({ username: "riff", password: "secret" });

    expect(get).toHaveBeenCalledWith("/auth/csrf", {
      withCredentials: true,
      timeout: 15_000,
    });
    expect(post).toHaveBeenCalledWith(
      "/auth/login",
      { username: "riff", password: "secret" },
      expect.objectContaining({
        withCredentials: true,
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          [AUTH_SESSION_MODE_HEADER]: AUTH_SESSION_MODE,
          [CSRF_HEADER]: "bootstrap-csrf",
        }),
      }),
    );
    expect(post.mock.calls[0]?.[2]?.headers).not.toHaveProperty("Authorization");
    expect(result).not.toHaveProperty("refreshToken");
    expect(localStorage.getItem("rv.auth.session-csrf")).toBe("refresh-csrf-1");
    expect(localStorage.getItem("rv.auth.logout-csrf")).toBe("logout-csrf-1");
    expect(localStorage.getItem("rv.auth.session-csrf")).not.toBe("access-jwt");
    expect(sessionStorage.length).toBe(0);
  });

  it("uses the current session CSRF token and an operation UUID for refresh", async () => {
    const http = makeHttpClient();
    vi.spyOn(http, "get").mockResolvedValue(axiosResponse({ csrfToken: "bootstrap-csrf" }));
    const post = vi.spyOn(http, "post");
    post.mockResolvedValueOnce(axiosResponse(loginResponse));
    post.mockResolvedValueOnce(axiosResponse(refreshResponse));
    const operationId = "d65f45e4-9fe6-4d4a-b754-4256ba06b833";
    const transport = new SessionAuthTransport(http, () => operationId);

    await transport.login({ username: "riff", password: "secret" });
    const transportAfterReload = new SessionAuthTransport(http, () => operationId);
    const refreshed = await transportAfterReload.refresh();

    expect(post).toHaveBeenNthCalledWith(
      2,
      "/auth/refresh",
      {},
      expect.objectContaining({
        withCredentials: true,
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          [AUTH_SESSION_MODE_HEADER]: AUTH_SESSION_MODE,
          [REFRESH_OPERATION_HEADER]: operationId,
          [CSRF_HEADER]: "refresh-csrf-1",
        }),
      }),
    );
    expect(post.mock.calls[1]?.[2]?.headers).not.toHaveProperty("Authorization");
    expect(refreshed.user.id).toBe("user-1");
    expect(refreshed.token).toBe("next-access-jwt");
    expect(refreshed).not.toHaveProperty("refreshToken");
  });

  it("migrates existing per-tab CSRF proofs to shared origin storage", async () => {
    sessionStorage.setItem("rv.auth.session-csrf", "legacy-session-csrf");
    sessionStorage.setItem("rv.auth.logout-csrf", "legacy-logout-csrf");
    const http = makeHttpClient();
    const post = vi.spyOn(http, "post").mockResolvedValue(axiosResponse(refreshResponse));
    const transport = new SessionAuthTransport(http);

    await transport.refresh();

    expect(post.mock.calls[0]?.[2]?.headers).toEqual(expect.objectContaining({
      [CSRF_HEADER]: "legacy-session-csrf",
    }));
    expect(localStorage.getItem("rv.auth.session-csrf")).toBe("refresh-csrf-2");
    expect(localStorage.getItem("rv.auth.logout-csrf")).toBe("logout-csrf-2");
    expect(sessionStorage.length).toBe(0);
  });

  it("clears session CSRF proofs after a definitive refresh 401", async () => {
    localStorage.setItem("rv.auth.session-csrf", "session-csrf");
    localStorage.setItem("rv.auth.logout-csrf", "logout-csrf");
    const http = makeHttpClient();
    const post = vi.spyOn(http, "post").mockRejectedValue(Object.assign(new Error("unauthenticated"), {
      isAxiosError: true,
      response: { status: 401, headers: {} },
    }));
    const transport = new SessionAuthTransport(http);

    await expect(transport.refresh()).rejects.toMatchObject({ category: "unauthenticated" });
    expect(localStorage.getItem("rv.auth.session-csrf")).toBeNull();
    expect(localStorage.getItem("rv.auth.logout-csrf")).toBeNull();
    await expect(transport.refresh()).rejects.toMatchObject({ category: "protocol-error" });
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("uses the session logout CSRF token and clears in-memory CSRF state after 204", async () => {
    const http = makeHttpClient();
    vi.spyOn(http, "get").mockResolvedValue(axiosResponse({ csrfToken: "bootstrap-csrf" }));
    const post = vi.spyOn(http, "post");
    post.mockResolvedValueOnce(axiosResponse(loginResponse));
    post.mockResolvedValueOnce(axiosResponse(undefined, 204));
    const transport = new SessionAuthTransport(http);

    await transport.login({ username: "riff", password: "secret" });
    await transport.logout();

    expect(post).toHaveBeenNthCalledWith(
      2,
      "/auth/logout",
      {},
      expect.objectContaining({
        withCredentials: true,
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          [CSRF_HEADER]: "logout-csrf-1",
        }),
      }),
    );
    expect(post.mock.calls[1]?.[2]?.headers).not.toHaveProperty(AUTH_SESSION_MODE_HEADER);
    expect(localStorage.getItem("rv.auth.session-csrf")).toBeNull();
    expect(localStorage.getItem("rv.auth.logout-csrf")).toBeNull();
    await expect(transport.refresh()).rejects.toMatchObject({ category: "protocol-error" });
  });

  it("shares an in-flight refresh and makes logout wait for the rotated logout CSRF token", async () => {
    const http = makeHttpClient();
    vi.spyOn(http, "get").mockResolvedValue(axiosResponse({ csrfToken: "bootstrap-csrf" }));
    const post = vi.spyOn(http, "post");
    post.mockResolvedValueOnce(axiosResponse(loginResponse));
    let finishRefresh!: (response: AxiosResponse<SessionRefreshResponse>) => void;
    post.mockReturnValueOnce(new Promise((resolve) => { finishRefresh = resolve; }));
    post.mockResolvedValueOnce(axiosResponse(undefined, 204));
    const transport = new SessionAuthTransport(http);

    await transport.login({ username: "riff", password: "secret" });
    const firstRefresh = transport.refresh();
    const secondRefresh = transport.refresh();
    const logout = transport.logout();
    expect(post).toHaveBeenCalledTimes(2);

    finishRefresh(axiosResponse(refreshResponse));
    await expect(Promise.all([firstRefresh, secondRefresh])).resolves.toHaveLength(2);
    await logout;

    expect(post).toHaveBeenCalledTimes(3);
    expect(post.mock.calls[2]?.[0]).toBe("/auth/logout");
    expect(post.mock.calls[2]?.[2]?.headers).toEqual(expect.objectContaining({
      [CSRF_HEADER]: "logout-csrf-2",
    }));
    expect(sessionStorage.length).toBe(0);
  });

  it("clears session CSRF proofs after logout returns a definitive 401", async () => {
    localStorage.setItem("rv.auth.session-csrf", "session-csrf");
    localStorage.setItem("rv.auth.logout-csrf", "logout-csrf");
    const http = makeHttpClient();
    const post = vi.spyOn(http, "post").mockRejectedValue(Object.assign(new Error("unauthenticated"), {
      isAxiosError: true,
      response: { status: 401, headers: {} },
    }));
    const transport = new SessionAuthTransport(http);

    await expect(transport.logout()).rejects.toMatchObject({ category: "unauthenticated" });
    expect(localStorage.getItem("rv.auth.session-csrf")).toBeNull();
    expect(localStorage.getItem("rv.auth.logout-csrf")).toBeNull();
    expect(post).toHaveBeenCalledTimes(1);
  });

  it.each([
    [401, "unauthenticated"],
    [403, "forbidden"],
    [429, "rate-limited"],
    [503, "unavailable"],
  ] as const)("maps HTTP %i to a typed session error without logging", async (status, category) => {
    const http = makeHttpClient();
    const error = Object.assign(new Error("request failed"), {
      isAxiosError: true,
      response: {
        status,
        headers: { "retry-after": "12" },
      },
    });
    vi.spyOn(http, "get").mockRejectedValue(error);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const transport = new SessionAuthTransport(http);

    const result = transport.getCsrf();
    await expect(result).rejects.toBeInstanceOf(SessionAuthError);
    await expect(result).rejects.toMatchObject({ status, category, retryAfter: "12" });
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
  });

  it("rejects malformed login data and invalid operation IDs before posting", async () => {
    const http = makeHttpClient();
    vi.spyOn(http, "get").mockResolvedValue(axiosResponse({ csrfToken: "bootstrap-csrf" }));
    const post = vi.spyOn(http, "post").mockResolvedValue(
      axiosResponse({ ...loginResponse, role: "unknown" }),
    );
    const transport = new SessionAuthTransport(http);

    await expect(transport.login({ username: "riff", password: "secret" })).rejects.toMatchObject({
      category: "protocol-error",
    });

    post.mockResolvedValueOnce(axiosResponse(loginResponse));
    await transport.login({ username: "riff", password: "secret" });
    const postCountAfterLogin = post.mock.calls.length;
    await expect(transport.refresh({ operationId: "not-a-uuid" })).rejects.toMatchObject({
      category: "protocol-error",
    });
    expect(post).toHaveBeenCalledTimes(postCountAfterLogin);
  });
});
