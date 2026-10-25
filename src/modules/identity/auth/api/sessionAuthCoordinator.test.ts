// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import axios, { type AxiosResponse } from "axios";

type LockCallback = () => Promise<unknown>;

class FakeLockManager {
  private tail: Promise<void> = Promise.resolve();

  request<T>(_name: string, _options: { mode: "exclusive" }, callback: LockCallback): Promise<T> {
    const previous = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>((resolve) => { release = resolve; });
    return previous.then(callback).finally(release) as Promise<T>;
  }
}

class FakeBroadcastChannel {
  static instances: FakeBroadcastChannel[] = [];
  static deferMessages = false;
  private listeners = new Set<(event: MessageEvent<unknown>) => void>();

  constructor(readonly name: string) {
    FakeBroadcastChannel.instances.push(this);
  }

  addEventListener(_type: "message", listener: (event: MessageEvent<unknown>) => void): void {
    this.listeners.add(listener);
  }

  postMessage(data: unknown): void {
    const deliver = () => {
      for (const peer of FakeBroadcastChannel.instances) {
        if (peer === this || peer.name !== this.name) continue;
        peer.listeners.forEach((listener) => listener({ data } as MessageEvent<unknown>));
      }
    };
    if (FakeBroadcastChannel.deferMessages) globalThis.setTimeout(deliver, 0);
    else deliver();
  }
}

describe("auth session cross-tab coordinator", () => {
  beforeEach(() => {
    vi.resetModules();
    FakeBroadcastChannel.instances = [];
    FakeBroadcastChannel.deferMessages = false;
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(globalThis, "BroadcastChannel", {
      configurable: true,
      value: FakeBroadcastChannel,
    });
  });

  it("serializes refresh and logout mutations through the origin lock", async () => {
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: new FakeLockManager(),
    });
    const { withAuthSessionLock } = await import("@/modules/identity/auth/api/sessionAuthCoordinator");
    const order: string[] = [];
    let finishRefresh!: () => void;

    const refresh = withAuthSessionLock(async () => {
      order.push("refresh:start");
      await new Promise<void>((resolve) => { finishRefresh = resolve; });
      order.push("refresh:end");
    });
    const logout = withAuthSessionLock(async () => { order.push("logout"); });

    await Promise.resolve();
    expect(order).toEqual(["refresh:start"]);
    finishRefresh();
    await Promise.all([refresh, logout]);
    expect(order).toEqual(["refresh:start", "refresh:end", "logout"]);
  });

  it("broadcasts auth lifecycle and CSRF change notifications without carrying proofs", async () => {
    const {
      broadcastAuthLogin,
      broadcastAuthLogout,
      broadcastAuthPermissionsChanged,
      broadcastSessionCsrfUpdated,
      subscribeToRemoteAuthLogin,
      subscribeToRemoteAuthLogout,
      subscribeToRemoteAuthPermissionsChanged,
      subscribeToRemoteSessionCsrfUpdated,
    } = await import("@/modules/identity/auth/api/sessionAuthCoordinator");
    const onRemoteLogout = vi.fn();
    const onSecondTabLogout = vi.fn();
    const onRemoteLogin = vi.fn();
    const onRemoteCsrfUpdated = vi.fn();
    const onRemotePermissionsChanged = vi.fn();
    const unsubscribe = subscribeToRemoteAuthLogout(onRemoteLogout);
    const unsubscribeSecondTab = subscribeToRemoteAuthLogout(onSecondTabLogout);
    const unsubscribeLogin = subscribeToRemoteAuthLogin(onRemoteLogin);
    const unsubscribeCsrf = subscribeToRemoteSessionCsrfUpdated(onRemoteCsrfUpdated);
    const unsubscribePermissions = subscribeToRemoteAuthPermissionsChanged(onRemotePermissionsChanged);
    const peer = new FakeBroadcastChannel("riffvalley-app-auth-session");
    const onPeerMessage = vi.fn();
    peer.addEventListener("message", onPeerMessage);

    broadcastAuthLogout();
    expect(onRemoteLogout).not.toHaveBeenCalled();
    expect(onPeerMessage).toHaveBeenCalledWith({ data: { type: "logout" } });

    broadcastAuthLogin();
    expect(onRemoteLogin).not.toHaveBeenCalled();
    expect(onPeerMessage).toHaveBeenLastCalledWith({ data: { type: "login" } });

    broadcastSessionCsrfUpdated();
    expect(onRemoteCsrfUpdated).not.toHaveBeenCalled();
    expect(onPeerMessage).toHaveBeenLastCalledWith({
      data: { type: "session-csrf-updated" },
    });

    broadcastAuthPermissionsChanged();
    expect(onRemotePermissionsChanged).not.toHaveBeenCalled();
    expect(onPeerMessage).toHaveBeenLastCalledWith({ data: { type: "permissions-changed" } });

    peer.postMessage({ type: "logout" });
    expect(onRemoteLogout).toHaveBeenCalledOnce();
    expect(onSecondTabLogout).toHaveBeenCalledOnce();
    peer.postMessage({ type: "login" });
    expect(onRemoteLogin).toHaveBeenCalledOnce();
    peer.postMessage({ type: "session-csrf-updated" });
    expect(onRemoteCsrfUpdated).toHaveBeenCalledOnce();
    peer.postMessage({ type: "permissions-changed" });
    expect(onRemotePermissionsChanged).toHaveBeenCalledOnce();
    peer.postMessage({ type: "unrelated" });
    expect(onRemoteLogout).toHaveBeenCalledOnce();
    expect(onSecondTabLogout).toHaveBeenCalledOnce();
    expect(onPeerMessage.mock.calls.map(([event]) => event.data)).toEqual([
      { type: "logout" },
      { type: "login" },
      { type: "session-csrf-updated" },
      { type: "permissions-changed" },
    ]);
    unsubscribe();
    unsubscribeSecondTab();
    unsubscribeLogin();
    unsubscribeCsrf();
    unsubscribePermissions();
  });

  it("loads the current origin-shared session CSRF proof for refresh", async () => {
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: new FakeLockManager(),
    });
    const { SessionAuthTransport } = await import("@/modules/identity/auth/api/sessionAuth");
    const http = axios.create({ baseURL: "https://backend.riffvalley.es/api" });
    localStorage.setItem("rv.auth.session-csrf", "peer-current-csrf");
    localStorage.setItem("rv.auth.logout-csrf", "peer-current-logout-csrf");
    const post = vi.spyOn(http, "post").mockResolvedValue({
      data: {
        user: { id: "user-1", username: "riff", role: "user" },
        token: "access-jwt",
        csrfToken: "rotated-csrf",
        logoutCsrfToken: "rotated-logout-csrf",
        expiresAt: "2027-01-01T00:00:00.000Z",
      },
      status: 200,
      statusText: "OK",
      headers: {},
      config: { headers: axios.AxiosHeaders.from({}) },
    } as AxiosResponse);
    const transport = new SessionAuthTransport(http, () => "d65f45e4-9fe6-4d4a-b754-4256ba06b833");
    const peer = new FakeBroadcastChannel("riffvalley-app-auth-session");
    peer.postMessage({ type: "session-csrf-updated" });

    await transport.refresh();

    expect(post.mock.calls[0]?.[2]?.headers).toEqual(expect.objectContaining({
      "X-CSRF-Token": "peer-current-csrf",
    }));
  });

  it("refuses refresh from both tabs without Web Locks and never posts or retries", async () => {
    expect(navigator.locks).toBeUndefined();
    const { SessionAuthTransport } = await import("@/modules/identity/auth/api/sessionAuth");
    const firstHttp = axios.create({ baseURL: "https://backend.riffvalley.es/api" });
    const secondHttp = axios.create({ baseURL: "https://backend.riffvalley.es/api" });
    const firstGet = vi.spyOn(firstHttp, "get");
    const secondGet = vi.spyOn(secondHttp, "get");
    const firstPost = vi.spyOn(firstHttp, "post");
    const secondPost = vi.spyOn(secondHttp, "post");
    localStorage.setItem("rv.auth.session-csrf", "shared-session-csrf");
    localStorage.setItem("rv.auth.logout-csrf", "shared-logout-csrf");
    const firstTab = new SessionAuthTransport(firstHttp);
    const secondTab = new SessionAuthTransport(secondHttp);

    const attempts = await Promise.allSettled([firstTab.refresh(), secondTab.refresh()]);
    expect(attempts).toEqual([
      { status: "rejected", reason: expect.objectContaining({ category: "coordination-unavailable" }) },
      { status: "rejected", reason: expect.objectContaining({ category: "coordination-unavailable" }) },
    ]);
    await expect(firstTab.refresh()).rejects.toMatchObject({ category: "coordination-unavailable" });
    expect(firstGet).not.toHaveBeenCalled();
    expect(secondGet).not.toHaveBeenCalled();
    expect(firstPost).not.toHaveBeenCalled();
    expect(secondPost).not.toHaveBeenCalled();
    expect(localStorage.getItem("rv.auth.session-csrf")).toBe("shared-session-csrf");
  });

  it("keeps login and logout available without Web Locks and does not refresh during logout", async () => {
    expect(navigator.locks).toBeUndefined();
    const { SessionAuthTransport } = await import("@/modules/identity/auth/api/sessionAuth");
    const http = axios.create({ baseURL: "https://backend.riffvalley.es/api" });
    const get = vi.spyOn(http, "get").mockResolvedValue({
      data: { csrfToken: "bootstrap-csrf" }, status: 200, statusText: "OK", headers: {},
      config: { headers: axios.AxiosHeaders.from({}) },
    } as AxiosResponse);
    const post = vi.spyOn(http, "post").mockResolvedValueOnce({
      data: {
        id: "user-1", username: "riff", role: "user", token: "access-jwt",
        csrfToken: "session-csrf", logoutCsrfToken: "logout-csrf",
      }, status: 200, statusText: "OK", headers: {},
      config: { headers: axios.AxiosHeaders.from({}) },
    } as AxiosResponse).mockResolvedValueOnce({
      data: undefined, status: 204, statusText: "No Content", headers: {},
      config: { headers: axios.AxiosHeaders.from({}) },
    } as AxiosResponse);
    const transport = new SessionAuthTransport(http);

    await transport.login({ username: "riff", password: "secret" });
    await transport.logout();

    expect(get).toHaveBeenCalledOnce();
    expect(post.mock.calls.map(([url]) => url)).toEqual(["/auth/login", "/auth/logout"]);
  });

  it("restores from a newly opened tab using the shared session cookie", async () => {
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: new FakeLockManager(),
    });
    const { SessionAuthTransport } = await import("@/modules/identity/auth/api/sessionAuth");
    const sharedCookie = { present: false };
    const session = {
      user: { id: "user-1", username: "riff", role: "user" },
      token: "access-jwt",
      csrfToken: "rotated-csrf",
      logoutCsrfToken: "rotated-logout-csrf",
      expiresAt: "2027-01-01T00:00:00.000Z",
    };
    const firstHttp = axios.create({ baseURL: "https://backend.riffvalley.es/api" });
    vi.spyOn(firstHttp, "get").mockResolvedValue({
      data: { csrfToken: "bootstrap-csrf" }, status: 200, statusText: "OK", headers: {},
      config: { headers: axios.AxiosHeaders.from({}) },
    } as AxiosResponse);
    vi.spyOn(firstHttp, "post").mockResolvedValueOnce({
      data: {
        id: "user-1", username: "riff", role: "user", token: "access-jwt",
        csrfToken: "session-csrf", logoutCsrfToken: "logout-csrf",
      }, status: 200, statusText: "OK", headers: {},
      config: { headers: axios.AxiosHeaders.from({}) },
    } as AxiosResponse).mockResolvedValueOnce({
      data: session, status: 200, statusText: "OK", headers: {},
      config: { headers: axios.AxiosHeaders.from({}) },
    } as AxiosResponse);
    const firstTab = new SessionAuthTransport(firstHttp);
    await firstTab.login({ username: "riff", password: "secret" });
    // Model the HttpOnly Set-Cookie side effect of the mocked login response.
    sharedCookie.present = true;

    // A separate tab shares localStorage and the HttpOnly cookie, but not sessionStorage.
    sessionStorage.clear();
    const secondHttp = axios.create({ baseURL: "https://backend.riffvalley.es/api" });
    const secondPost = vi.spyOn(secondHttp, "post").mockImplementation(async (_url, _body, config) => {
      expect(sharedCookie.present).toBe(true);
      expect(config?.withCredentials).toBe(true);
      expect(config?.headers).toEqual(expect.objectContaining({ "X-CSRF-Token": "session-csrf" }));
      return {
        data: session, status: 200, statusText: "OK", headers: {},
        config: { headers: axios.AxiosHeaders.from({}) },
      } as AxiosResponse;
    });
    const secondTab = new SessionAuthTransport(secondHttp);

    await expect(secondTab.refresh()).resolves.toMatchObject({ token: "access-jwt" });
    expect(secondPost).toHaveBeenCalledOnce();
  });

  it("serializes concurrent refreshes and reloads the CSRF proof after the lock", async () => {
    FakeBroadcastChannel.deferMessages = true;
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: new FakeLockManager(),
    });
    const { SessionAuthTransport } = await import("@/modules/identity/auth/api/sessionAuth");
    localStorage.setItem("rv.auth.session-csrf", "csrf-1");
    localStorage.setItem("rv.auth.logout-csrf", "logout-csrf-1");
    let currentCsrf = "csrf-1";
    const observedCsrf: string[] = [];
    let finishFirstRefresh!: () => void;
    let firstRefreshStarted!: () => void;
    const firstStarted = new Promise<void>((resolve) => { firstRefreshStarted = resolve; });

    const makeTabHttp = (blockFirst: boolean) => {
      const http = axios.create({ baseURL: "https://backend.riffvalley.es/api" });
      let responseNumber = 0;
      vi.spyOn(http, "post").mockImplementation(async (_url, _body, config) => {
        expect(config?.withCredentials).toBe(true);
        const csrf = axios.AxiosHeaders.from(config?.headers).get("X-CSRF-Token");
        expect(csrf).toBe(currentCsrf);
        observedCsrf.push(String(csrf));
        responseNumber += 1;
        if (blockFirst && responseNumber === 1) {
          firstRefreshStarted();
          await new Promise<void>((resolve) => { finishFirstRefresh = resolve; });
        }
        const nextCsrf = `csrf-${observedCsrf.length + 1}`;
        currentCsrf = nextCsrf;
        return {
          data: {
            user: { id: "user-1", username: "riff", role: "user" },
            token: `access-${responseNumber}`,
            csrfToken: nextCsrf,
            logoutCsrfToken: `logout-${observedCsrf.length + 1}`,
            expiresAt: "2027-01-01T00:00:00.000Z",
          },
          status: 200,
          statusText: "OK",
          headers: {},
          config: { headers: axios.AxiosHeaders.from({}) },
        } as AxiosResponse;
      });
      return http;
    };

    const firstTab = new SessionAuthTransport(makeTabHttp(true));
    const secondTab = new SessionAuthTransport(makeTabHttp(false));
    const firstRefresh = firstTab.refresh();
    const secondRefresh = secondTab.refresh();
    await firstStarted;
    expect(observedCsrf).toEqual(["csrf-1"]);
    finishFirstRefresh();

    await expect(Promise.all([firstRefresh, secondRefresh])).resolves.toHaveLength(2);
    expect(observedCsrf).toEqual(["csrf-1", "csrf-2"]);
    expect(currentCsrf).toBe("csrf-3");
  });

  it("releases the origin lock after a refresh failure so a retry can reach Identity", async () => {
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: new FakeLockManager(),
    });
    const { SessionAuthTransport } = await import("@/modules/identity/auth/api/sessionAuth");
    localStorage.setItem("rv.auth.session-csrf", "csrf-1");
    localStorage.setItem("rv.auth.logout-csrf", "logout-csrf-1");
    const http = axios.create({ baseURL: "https://backend.riffvalley.es/api" });
    const post = vi.spyOn(http, "post");
    post.mockRejectedValueOnce(Object.assign(new Error("unavailable"), {
      isAxiosError: true,
      response: { status: 503, headers: {} },
    }));
    post.mockResolvedValueOnce({
      data: {
        user: { id: "user-1", username: "riff", role: "user" },
        token: "access-jwt",
        csrfToken: "csrf-2",
        logoutCsrfToken: "logout-csrf-2",
        expiresAt: "2027-01-01T00:00:00.000Z",
      }, status: 200, statusText: "OK", headers: {},
      config: { headers: axios.AxiosHeaders.from({}) },
    } as AxiosResponse);
    const transport = new SessionAuthTransport(http);

    await expect(transport.refresh()).rejects.toMatchObject({ category: "unavailable" });
    await expect(transport.refresh()).resolves.toMatchObject({ token: "access-jwt" });
    expect(post).toHaveBeenCalledTimes(2);
  });

  it("rejects a lock request that cannot acquire within the bounded wait", async () => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: {
        request: (_name: string, options: LockOptions) => new Promise((_resolve, reject) => {
          options.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        }),
      },
    });
    const { AuthSessionLockTimeoutError, withAuthSessionLock } = await import("@/modules/identity/auth/api/sessionAuthCoordinator");
    const pending = withAuthSessionLock(async () => "never acquired");
    const rejection = expect(pending).rejects.toBeInstanceOf(AuthSessionLockTimeoutError);
    await vi.advanceTimersByTimeAsync(30_000);

    await rejection;
    vi.useRealTimers();
  });
});
