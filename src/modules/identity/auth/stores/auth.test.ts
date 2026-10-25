// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const { refresh, login, logout, broadcastAuthLogin, broadcastAuthLogout, notifyAppDailyActivity } = vi.hoisted(() => ({
  refresh: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  broadcastAuthLogin: vi.fn(),
  broadcastAuthLogout: vi.fn(),
  notifyAppDailyActivity: vi.fn(),
}));

vi.mock("@/modules/identity/auth/api/sessionAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/identity/auth/api/sessionAuth")>();
  return { ...actual, sessionAuthTransport: { refresh, login, logout } };
});
vi.mock("@/modules/identity/auth/api/sessionAuthCoordinator", () => ({
  broadcastAuthLogin,
  broadcastAuthLogout,
  broadcastSessionCsrfUpdated: vi.fn(),
  subscribeToRemoteSessionCsrfUpdated: vi.fn(() => () => undefined),
  withAuthSessionLock: (operation: () => Promise<unknown>) => operation(),
}));
vi.mock("@/modules/identity/activity/api/appDailyActivity", () => ({ notifyAppDailyActivity }));

import { SessionAuthError } from "@/modules/identity/auth/api/sessionAuth";
import { useAuthStore } from "./auth";
import { useDashboardPreferencesStore } from "../../account/preferences/stores/dashboardPreferences";

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
  const legacyCredentialKeys = ["token", "username", "userId", "image", "role", "roles"];

  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    refresh.mockReset();
    login.mockReset();
    logout.mockReset();
    broadcastAuthLogin.mockReset();
    broadcastAuthLogout.mockReset();
    notifyAppDailyActivity.mockReset();
    setActivePinia(createPinia());
  });

  it("clears every legacy credential when storage is available", () => {
    for (const key of legacyCredentialKeys) localStorage.setItem(key, `legacy-${key}`);
    const removeItem = vi.spyOn(localStorage, "removeItem");

    const store = useAuthStore();

    expect(store.authStatus).toBe("initializing");
    expect(removeItem.mock.calls.map(([key]) => key)).toEqual(legacyCredentialKeys);
    for (const key of legacyCredentialKeys) expect(localStorage.getItem(key)).toBeNull();
  });

  it("continues clearing the remaining credentials when one key fails", () => {
    const nativeRemoveItem = localStorage.removeItem;
    const removeItem = vi.spyOn(localStorage, "removeItem").mockImplementation(function (key) {
      if (key === "token") throw new DOMException("Storage is blocked", "SecurityError");
      return nativeRemoveItem.call(this, key);
    });

    const store = useAuthStore();

    expect(store.authStatus).toBe("initializing");
    expect(removeItem.mock.calls.map(([key]) => key)).toEqual(legacyCredentialKeys);
  });

  it("creates Auth and restores the session when legacy storage cleanup is restricted", async () => {
    const removeItem = vi.spyOn(localStorage, "removeItem").mockImplementation(() => {
      throw new DOMException("Storage is blocked", "SecurityError");
    });
    refresh.mockResolvedValue(renewableSession);

    const store = useAuthStore();
    expect(store.authStatus).toBe("initializing");
    await expect(store.initializeAuth()).resolves.toBe("authenticated");

    expect(removeItem).toHaveBeenCalledTimes(legacyCredentialKeys.length * 2);
    expect(removeItem.mock.calls.map(([key]) => key)).toEqual([
      ...legacyCredentialKeys,
      ...legacyCredentialKeys,
    ]);
    expect(refresh).toHaveBeenCalledOnce();
    expect(store.authStatus).toBe("authenticated");
    expect(store.token).toBe("memory-access-token");
    expect(store.username).toBe("Mara");
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
    expect(notifyAppDailyActivity).toHaveBeenCalledOnce();
    for (const key of ["token", "username", "userId", "image", "role", "roles"]) {
      expect(localStorage.getItem(key)).toBeNull();
      expect(sessionStorage.getItem(key)).toBeNull();
    }
    expect(localStorage.getItem("dashboardConfig")).toBe(JSON.stringify(loginResponse.dashboardConfig));
    expect(useDashboardPreferencesStore().dashboardConfig).toEqual(loginResponse.dashboardConfig);
  });

  it("completes login and applies session preferences when preference storage writes are denied", async () => {
    login.mockResolvedValue(loginResponse);
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new DOMException("Storage is blocked", "SecurityError");
    });
    const store = useAuthStore();

    await expect(store.login({ username: "Mara", password: "secret" })).resolves.toBeUndefined();

    const preferences = useDashboardPreferencesStore();
    expect(store.isAuthenticated).toBe(true);
    expect(store.username).toBe("Mara");
    expect(preferences.dashboardButtonsEnabled).toBe(true);
    expect(preferences.dashboardConfig).toEqual(loginResponse.dashboardConfig);
    expect(preferences.mobileDashboardConfig).toEqual(loginResponse.mobileDashboardConfig);
  });

  it("characterizes retention if an incomplete mocked refresh profile omits optional fields", async () => {
    login.mockResolvedValue(loginResponse);
    const store = useAuthStore();
    await store.login({ username: "Mara", password: "secret" });

    refresh.mockResolvedValue({
      ...renewableSession,
      user: { id: "84", username: "Nara", role: "user" },
    });

    await expect(store.renewSession()).resolves.toBe("renewed");

    const preferences = useDashboardPreferencesStore();
    expect(store.userId).toBe("84");
    expect(store.username).toBe("Nara");
    expect(preferences.dashboardButtonsEnabled).toBe(true);
    expect(preferences.dashboardConfig).toEqual(loginResponse.dashboardConfig);
    expect(preferences.mobileDashboardConfig).toEqual(loginResponse.mobileDashboardConfig);
  });

  it("replaces all preferences when refresh-v1 restores a different account with a complete profile", async () => {
    login.mockResolvedValue(loginResponse);
    const store = useAuthStore();
    await store.login({ username: "Mara", password: "secret" });

    const nextMobileConfig = [{ id: "music", enabled: true }];
    refresh.mockResolvedValue({
      ...renewableSession,
      user: {
        id: "84",
        username: "Nara",
        role: "user",
        dashboardButtonsEnabled: false,
        dashboardConfig: null,
        mobileDashboardConfig: nextMobileConfig,
      },
    });

    await expect(store.renewSession()).resolves.toBe("renewed");

    const preferences = useDashboardPreferencesStore();
    expect(store.userId).toBe("84");
    expect(store.username).toBe("Nara");
    expect(preferences.dashboardButtonsEnabled).toBe(false);
    expect(preferences.dashboardConfig).toBeNull();
    expect(preferences.mobileDashboardConfig).toEqual(nextMobileConfig);
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
    const preferences = useDashboardPreferencesStore();
    expect(preferences.dashboardButtonsEnabled).toBe(true);
    expect(preferences.dashboardConfig).toEqual([{ id: "albums", enabled: true }]);
    expect(preferences.mobileDashboardConfig).toEqual([{ id: "news", enabled: false }]);
    expect(store.sessionMode).toBe("renewable");
    expect(notifyAppDailyActivity).toHaveBeenCalledOnce();
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
    expect(logout).not.toHaveBeenCalled();
  });

  it("clears and broadcasts a definitive expiration during an authenticated refresh", async () => {
    const store = useAuthStore();
    store.$patch({
      token: "expired-token",
      username: "Mara",
      userId: "42",
      role: "riffvalley",
      authStatus: "authenticated",
      sessionMode: "renewable",
    });
    localStorage.setItem("token", "legacy-token");
    refresh.mockRejectedValue(new SessionAuthError("Unauthenticated", "unauthenticated", 401));

    await expect(store.renewSession()).resolves.toBe("unauthenticated");

    expect(store.token).toBeNull();
    expect(store.authStatus).toBe("anonymous");
    expect(store.sessionMode).toBeNull();
    expect(localStorage.getItem("token")).toBeNull();
    expect(broadcastAuthLogout).toHaveBeenCalledOnce();
    expect(logout).not.toHaveBeenCalled();
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

  it("does not repeat unsupported startup refresh attempts and still permits login", async () => {
    refresh.mockRejectedValue(new SessionAuthError(
      "Web Locks unavailable",
      "coordination-unavailable",
      null,
    ));
    login.mockResolvedValue(loginResponse);
    const store = useAuthStore();

    expect(await store.initializeAuth()).toBe("error");
    expect(await store.initializeAuth()).toBe("error");
    expect(refresh).toHaveBeenCalledOnce();
    expect(store.authInitializationError).toBe("coordination-unavailable");
    expect(store.token).toBeNull();

    await store.login({ username: "Mara", password: "secret" });
    expect(store.authStatus).toBe("authenticated");
    expect(store.isAuthenticated).toBe(true);
    expect(login).toHaveBeenCalledOnce();
  });

  it("clears only this tab locally when an expired access token cannot be renewed", async () => {
    refresh.mockRejectedValue(new SessionAuthError(
      "Web Locks unavailable",
      "coordination-unavailable",
      null,
    ));
    const store = useAuthStore();
    store.$patch({
      token: "expired-token",
      username: "Mara",
      userId: "42",
      role: "riffvalley",
      authStatus: "authenticated",
      sessionMode: "renewable",
    });

    await expect(store.renewSession()).resolves.toBe("unauthenticated");

    expect(store.authStatus).toBe("anonymous");
    expect(store.token).toBeNull();
    expect(store.sessionMode).toBeNull();
    expect(broadcastAuthLogout).not.toHaveBeenCalled();
    expect(logout).not.toHaveBeenCalled();
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

  it("does not notify daily activity during an automatic session renewal", async () => {
    const store = useAuthStore();
    store.$patch({
      token: "memory-access-token",
      username: "Mara",
      userId: "42",
      role: "riffvalley",
      authStatus: "authenticated",
      sessionMode: "renewable",
    });
    refresh.mockResolvedValue(renewableSession);

    await expect(store.renewSession()).resolves.toBe("renewed");

    expect(notifyAppDailyActivity).not.toHaveBeenCalled();
  });
});
