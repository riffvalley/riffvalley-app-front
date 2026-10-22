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
  private listeners = new Set<(event: MessageEvent<unknown>) => void>();

  constructor(readonly name: string) {
    FakeBroadcastChannel.instances.push(this);
  }

  addEventListener(_type: "message", listener: (event: MessageEvent<unknown>) => void): void {
    this.listeners.add(listener);
  }

  postMessage(data: unknown): void {
    for (const peer of FakeBroadcastChannel.instances) {
      if (peer === this || peer.name !== this.name) continue;
      peer.listeners.forEach((listener) => listener({ data } as MessageEvent<unknown>));
    }
  }
}

describe("auth session cross-tab coordinator", () => {
  beforeEach(() => {
    vi.resetModules();
    FakeBroadcastChannel.instances = [];
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
    const { withAuthSessionLock } = await import("./sessionAuthCoordinator");
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

  it("synchronizes CSRF proofs and notifies peer tabs on logout without echoing it", async () => {
    const {
      broadcastAuthLogin,
      broadcastAuthLogout,
      broadcastSessionCsrf,
      subscribeToRemoteAuthLogin,
      subscribeToRemoteAuthLogout,
      subscribeToRemoteSessionCsrf,
    } = await import("./sessionAuthCoordinator");
    const onRemoteLogout = vi.fn();
    const onRemoteLogin = vi.fn();
    const onRemoteCsrf = vi.fn();
    const unsubscribe = subscribeToRemoteAuthLogout(onRemoteLogout);
    const unsubscribeLogin = subscribeToRemoteAuthLogin(onRemoteLogin);
    const unsubscribeCsrf = subscribeToRemoteSessionCsrf(onRemoteCsrf);
    const peer = new FakeBroadcastChannel("riffvalley-app-auth-session");
    const onPeerMessage = vi.fn();
    peer.addEventListener("message", onPeerMessage);

    broadcastAuthLogout();
    expect(onRemoteLogout).not.toHaveBeenCalled();
    expect(onPeerMessage).toHaveBeenCalledWith({ data: { type: "logout" } });

    broadcastAuthLogin();
    expect(onRemoteLogin).not.toHaveBeenCalled();
    expect(onPeerMessage).toHaveBeenLastCalledWith({ data: { type: "login" } });

    broadcastSessionCsrf({ csrfToken: "new-csrf", logoutCsrfToken: "new-logout-csrf" });
    expect(onRemoteCsrf).not.toHaveBeenCalled();
    expect(onPeerMessage).toHaveBeenLastCalledWith({
      data: {
        type: "session-csrf",
        csrfToken: "new-csrf",
        logoutCsrfToken: "new-logout-csrf",
      },
    });

    peer.postMessage({ type: "logout" });
    expect(onRemoteLogout).toHaveBeenCalledOnce();
    peer.postMessage({ type: "login" });
    expect(onRemoteLogin).toHaveBeenCalledOnce();
    peer.postMessage({
      type: "session-csrf",
      csrfToken: "peer-csrf",
      logoutCsrfToken: "peer-logout-csrf",
    });
    expect(onRemoteCsrf).toHaveBeenCalledWith({
      csrfToken: "peer-csrf",
      logoutCsrfToken: "peer-logout-csrf",
    });
    peer.postMessage({ type: "unrelated" });
    expect(onRemoteLogout).toHaveBeenCalledOnce();
    unsubscribe();
    unsubscribeLogin();
    unsubscribeCsrf();
  });

  it("uses a peer tab's current session CSRF proof for refresh", async () => {
    const { SessionAuthTransport } = await import("./sessionAuth");
    const http = axios.create({ baseURL: "https://backend.riffvalley.es/api" });
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
    peer.postMessage({
      type: "session-csrf",
      csrfToken: "peer-current-csrf",
      logoutCsrfToken: "peer-current-logout-csrf",
    });

    await transport.refresh();

    expect(post.mock.calls[0]?.[2]?.headers).toEqual(expect.objectContaining({
      "X-CSRF-Token": "peer-current-csrf",
    }));
  });
});
