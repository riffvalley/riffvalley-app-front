import { describe, expect, it, vi } from "vitest";
import { AxiosError } from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import { createHttpClient } from "../../src/shared/infrastructure/http/client";

const unauthorized = (config: InternalAxiosRequestConfig) => new AxiosError("unauthorized", "ERR_BAD_REQUEST", config,
  undefined, { status: 401, statusText: "Unauthorized", headers: {}, config, data: {} });
const response = (config: InternalAxiosRequestConfig) => ({ status: 200, statusText: "OK", headers: {}, config, data: {} });
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
};

function setup() {
  const http = createHttpClient("/api");
  const session = { token: "old" as string | null, version: 0 };
  const onUnauthorized = vi.fn(() => { session.token = null; session.version++; });
  const callbacks = { getToken: () => session.token, getSessionVersion: () => session.version, onUnauthorized };
  http.configureSession(callbacks);
  return { ...http, session, onUnauthorized, callbacks };
}

describe("composed HTTP session", () => {
  it("reads the current token per request and does not retain Authorization after logout", async () => {
    const { client, session } = setup();
    const headers: unknown[] = [];
    client.defaults.adapter = async (config) => { headers.push(config.headers.get("Authorization")); return response(config); };
    await client.get("/first");
    session.token = "new";
    await client.get("/second");
    session.token = null;
    await client.get("/public");
    expect(headers).toEqual(["Bearer old", "Bearer new", undefined]);
  });
  it("configuration can be repeated without installing duplicate interceptors", async () => {
    const { client, configureSession, callbacks, onUnauthorized } = setup();
    configureSession(callbacks); configureSession(callbacks);
    client.defaults.adapter = async (config) => { throw unauthorized(config); };
    await expect(client.get("/protected")).rejects.toThrow("unauthorized");
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
  it("expires once for concurrent 401s, including late responses from the expired session", async () => {
    const { client, onUnauthorized } = setup();
    const late = deferred();
    client.defaults.adapter = async (config) => {
      if (config.url === "/late") await late.promise;
      throw unauthorized(config);
    };
    const result = Promise.allSettled([client.get("/one"), client.get("/two"), client.get("/late")]);
    await vi.waitFor(() => expect(onUnauthorized).toHaveBeenCalledTimes(1));
    late.resolve();
    expect((await result).map((r) => r.status)).toEqual(["rejected", "rejected", "rejected"]);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
  it("ignores pending 401s after a new login, even when its token is unchanged", async () => {
    const { client, session, onUnauthorized } = setup();
    const pending = deferred(); const started = deferred();
    client.defaults.adapter = async (config) => { started.resolve(); await pending.promise; throw unauthorized(config); };
    const request = client.get("/old");
    const result = Promise.allSettled([request]);
    await started.promise;
    session.version++;
    pending.resolve();
    expect((await result)[0].status).toBe("rejected");
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(session.token).toBe("old");
  });
  it("rechecks the session before deferred cleanup if login finishes in the intervening microtask", async () => {
    const { client, configureSession, session, onUnauthorized } = setup();
    let reads = 0;
    configureSession({ getToken: () => session.token, onUnauthorized,
      getSessionVersion: () => {
        if (++reads === 2) Promise.resolve().then(() => { session.version++; });
        return session.version;
      },
    });
    client.defaults.adapter = async (config) => { throw unauthorized(config); };
    await expect(client.get("/pending")).rejects.toThrow("unauthorized");
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(session.token).toBe("old");
  });
  it("expires a new session while the old session navigation is still pending", async () => {
    const { client, session, configureSession } = setup();
    const navigation = deferred();
    const expire = vi.fn(() => { session.token = null; session.version++; return navigation.promise; });
    configureSession({ getToken: () => session.token, getSessionVersion: () => session.version, onUnauthorized: expire });
    client.defaults.adapter = async (config) => { throw unauthorized(config); };
    const first = Promise.allSettled([client.get("/first")]);
    await vi.waitFor(() => expect(expire).toHaveBeenCalledTimes(1));
    session.token = "new"; session.version++;
    const second = Promise.allSettled([client.get("/second")]);
    await vi.waitFor(() => expect(expire).toHaveBeenCalledTimes(2));
    navigation.resolve();
    await first; await second;
  });
  it("keeps 403/network errors and cleanup failures as original request rejections", async () => {
    const { client, onUnauthorized, configureSession, callbacks } = setup();
    const original = new Error("network");
    client.defaults.adapter = async () => { throw original; };
    await expect(client.get("/network")).rejects.toBe(original);
    client.defaults.adapter = async (config) => {
      const error = unauthorized(config); error.response!.status = 403; throw error;
    };
    await expect(client.get("/forbidden")).rejects.toThrow("unauthorized");
    expect(onUnauthorized).not.toHaveBeenCalled();
    configureSession({ ...callbacks, onUnauthorized: () => { throw new Error("navigation"); } });
    client.defaults.adapter = async (config) => { throw unauthorized(config); };
    await expect(client.get("/expired")).rejects.toThrow("unauthorized");
  });
});
