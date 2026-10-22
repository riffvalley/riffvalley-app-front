// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const { refresh, login, logout, broadcastAuthLogin, broadcastAuthLogout } = vi.hoisted(() => ({
  refresh: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  broadcastAuthLogin: vi.fn(),
  broadcastAuthLogout: vi.fn(),
}));

vi.mock("@services/auth/sessionAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@services/auth/sessionAuth")>();
  return { ...actual, sessionAuthTransport: { refresh, login, logout } };
});
vi.mock("@services/auth/sessionAuthCoordinator", () => ({
  broadcastAuthLogin,
  broadcastAuthLogout,
  broadcastSessionCsrfUpdated: vi.fn(),
  subscribeToRemoteSessionCsrfUpdated: vi.fn(() => () => undefined),
  withAuthSessionLock: (operation: () => Promise<unknown>) => operation(),
}));

import { SessionAuthError } from "@services/auth/sessionAuth";
import { useAuthStore } from "./auth";

const renewableSession = {
  user: {
    id: "42",
    username: "Mara",
    role: "riffvalley" as const,
    image: "avatar.png",
    dashboardButtonsEnabled: true,
    dashboardConfig: [{ id: "albums", enabled: true }],
    mobileDashboardConfig: [{ id: "news", enabled: false }],
  },
  token: "memory-access-token",
  csrfToken: "csrf",
  logoutCsrfToken: "logout-csrf",
  expiresAt: "2026-10-22T12:00:00.000Z",
};

const loginResponse = {
  id: "42",
  username: "Mara",
  role: "riffvalley" as const,
  image: "avatar.png",
  dashboardButtonsEnabled: true,
  dashboardConfig: [{ id: "albums", enabled: true }],
  mobileDashboardConfig: [{ id: "news", enabled: false }],
  token: "memory-access-token",
  csrfToken: "csrf",
  logoutCsrfToken: "logout-csrf",
};

describe("renewable auth store", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    refresh.mockReset();
    login.mockReset();
    logout.mockReset();
    broadcastAuthLogin.mockReset();
    broadcastAuthLogout.mockReset();
    setActivePinia(createPinia());
  });

  it("logs in from the refresh-v1 response and keeps credentials only in memory", async () => {
    login.mockResolvedValue(loginResponse);
    const store = useAuthStore();

    await store.login({ username: "Mara", password: "secret" });

    expect(login).toHaveBeenCalledWith({ username: "Mara", password: "secret" });
    expect(store.token).toBe("memory-access-token");
    expect(store.username).toBe("Mara");
    expect(store.userId).toBe("42");
    expect(store.role).toBe("riffvalley");
    expect(store.isAuthenticated).toBe(true);
    expect(store.sessionMode).toBe("renewable");
    expect(broadcastAuthLogin).toHaveBeenCalledOnce();
    for (const key of ["token", "username", "userId", "image", "role", "roles"]) {
      expect(localStorage.getItem(key)).toBeNull();
      expect(sessionStorage.getItem(key)).toBeNull();
    }
    expect(localStorage.getItem("dashboardConfig")).toBe(JSON.stringify(loginResponse.dashboardConfig));
  });

  it("restores nested profile fields on startup and purges credentials left by legacy builds", async () => {
    localStorage.setItem("token", "legacy-token");
    localStorage.setItem("username", "Legacy user");
    localStorage.setItem("role", "user");
    localStorage.setItem("dashboardButtonsEnabled", "false");
    refresh.mockResolvedValue(renewableSession);

    const store = useAuthStore();
    expect(await store.initializeAuth()).toBe("authenticated");

    expect(store.token).toBe("memory-access-token");
    expect(store.username).toBe("Mara");
    expect(store.userId).toBe("42");
    expect(store.role).toBe("riffvalley");
    expect(store.dashboardConfig).toEqual([{ id: "albums", enabled: true }]);
    expect(store.mobileDashboardConfig).toEqual([{ id: "news", enabled: false }]);
    expect(store.sessionMode).toBe("renewable");
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("role")).toBeNull();
    expect(localStorage.getItem("dashboardButtonsEnabled")).toBe("true");
    expect(sessionStorage.getItem("token")).toBeNull();
  });

  it("clears a definitive anonymous refresh result while preserving preferences", async () => {
    localStorage.setItem("token", "stale-token");
    localStorage.setItem("role", "user");
    localStorage.setItem("dashboardConfig", JSON.stringify([{ id: "albums", enabled: true }]));
    refresh.mockRejectedValue(new SessionAuthError("Unauthenticated", "unauthenticated", 401));

    const store = useAuthStore();
    expect(await store.initializeAuth()).toBe("anonymous");
    expect(store.token).toBeNull();
    expect(store.authStatus).toBe("anonymous");
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("dashboardConfig")).not.toBeNull();
    expect(broadcastAuthLogout).toHaveBeenCalledOnce();
  });

  it.each([
    new SessionAuthError("Rate limited", "rate-limited", 429),
    new SessionAuthError("Unavailable", "unavailable", 503),
    new SessionAuthError("Network error", "network-error", null),
    new SessionAuthError("CSRF proof not yet available in this tab", "protocol-error", null),
  ])("retains a retryable error state for temporary refresh failures", async (error) => {
    refresh.mockRejectedValueOnce(error).mockResolvedValueOnce(renewableSession);
    const store = useAuthStore();

    expect(await store.initializeAuth()).toBe("error");
    expect(store.authStatus).toBe("error");
    expect(store.authInitializationError).not.toBeNull();
    expect(store.isAuthenticated).toBe(false);
    expect(await store.initializeAuth()).toBe("authenticated");
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("shares the initial refresh while concurrent guards initialize the same store", async () => {
    let resolveRefresh!: (value: typeof renewableSession) => void;
    refresh.mockReturnValue(new Promise((resolve) => { resolveRefresh = resolve; }));
    const store = useAuthStore();

    const first = store.initializeAuth();
    const second = store.initializeAuth();
    resolveRefresh(renewableSession);

    await expect(Promise.all([first, second])).resolves.toEqual(["authenticated", "authenticated"]);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("drops stale credentials and restores the replacement session after a remote login", async () => {
    const store = useAuthStore();
    store.$patch({
      token: "old-token",
      username: "Previous user",
      role: "user",
      authStatus: "authenticated",
      sessionMode: "renewable",
    });
    refresh.mockResolvedValue(renewableSession);

    expect(await store.restoreAfterRemoteLogin()).toBe("authenticated");
    expect(store.token).toBe("memory-access-token");
    expect(store.username).toBe("Mara");
    expect(store.role).toBe("riffvalley");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("restarts restoration when a remote login replaces an initialization already in flight", async () => {
    let finishOldRefresh!: (value: typeof renewableSession) => void;
    refresh
      .mockReturnValueOnce(new Promise((resolve) => { finishOldRefresh = resolve; }))
      .mockResolvedValueOnce(renewableSession);
    const store = useAuthStore();

    const oldInitialization = store.initializeAuth();
    const replacementInitialization = store.restoreAfterRemoteLogin();
    await expect(replacementInitialization).resolves.toBe("authenticated");
    finishOldRefresh(renewableSession);
    await expect(oldInitialization).resolves.toBe("authenticated");

    expect(refresh).toHaveBeenCalledTimes(2);
    expect(store.username).toBe("Mara");
  });

  it("invalidates the local generation synchronously and reports confirmed logout", async () => {
    const store = useAuthStore();
    store.token = "memory-access-token";
    store.username = "Mara";
    store.role = "riffvalley";
    store.authStatus = "authenticated";
    store.sessionMode = "renewable";
    localStorage.setItem("dashboardConfig", JSON.stringify([{ id: "albums", enabled: true }]));
    let confirmLogout!: () => void;
    logout.mockReturnValue(new Promise<void>((resolve) => { confirmLogout = resolve; }));

    const generation = store.authSessionGeneration;
    const pending = store.logout();

    expect(store.authSessionGeneration).toBe(generation + 1);
    expect(store.authStatus).toBe("anonymous");
    expect(store.token).toBeNull();
    expect(localStorage.getItem("dashboardConfig")).not.toBeNull();
    expect(logout).toHaveBeenCalledOnce();
    expect(broadcastAuthLogout).toHaveBeenCalledOnce();
    confirmLogout();
    await expect(pending).resolves.toEqual({ revocation: "confirmed" });
  });

  it("treats logout 401 as already absent and reports all unconfirmed revocation failures", async () => {
    const store = useAuthStore();
    store.authStatus = "authenticated";
    store.sessionMode = "renewable";
    logout.mockRejectedValueOnce(new SessionAuthError("Unauthenticated", "unauthenticated", 401));
    await expect(store.logout()).resolves.toEqual({ revocation: "already-absent" });

    for (const error of [
      new SessionAuthError("Forbidden", "forbidden", 403),
      new SessionAuthError("Rate limited", "rate-limited", 429),
      new SessionAuthError("Unavailable", "unavailable", 503),
      new SessionAuthError("Offline", "network-error", null),
    ]) {
      store.authStatus = "authenticated";
      store.sessionMode = "renewable";
      logout.mockRejectedValueOnce(error);
      await expect(store.logout()).resolves.toEqual({ revocation: "unconfirmed", error });
      expect(store.authStatus).toBe("anonymous");
      expect(store.token).toBeNull();
    }
  });

  it("does not let a refresh started by an older session replace a logout", async () => {
    const store = useAuthStore();
    store.authStatus = "authenticated";
    store.sessionMode = "renewable";
    store.token = "old-token";
    let finishRefresh!: (value: typeof renewableSession) => void;
    refresh.mockReturnValue(new Promise((resolve) => { finishRefresh = resolve; }));

    const renewal = store.renewSession();
    const logoutPromise = store.logout();
    finishRefresh(renewableSession);
    await expect(renewal).resolves.toBe("stale");
    logout.mockResolvedValue(undefined);
    await logoutPromise;
    expect(store.authStatus).toBe("anonymous");
    expect(store.token).toBeNull();
  });
});
