import { describe, expect, it } from "vitest";
import {
  configureLocalSessionProxy,
  createApiDevProxy,
  setProductionSessionOrigin,
  type ProxyEventRegistrar,
} from "../../../vite.config";

const productionApi = "https://spammusic-back-99963122d70c.herokuapp.com";
const localApi = "http://127.0.0.1:3000";
const localEdgeSecret = "A".repeat(43);

describe("Vite API proxy configuration", () => {
  it("forwards development API requests over verified HTTPS", () => {
    const proxy = createApiDevProxy("serve", { API_PROXY_TARGET: productionApi });
    const context = "^/api(?:/|\\?|$)";

    expect(proxy?.[context]).toMatchObject({
      target: productionApi,
      changeOrigin: true,
      secure: true,
    });
    expect(proxy?.[context]?.rewrite).toBeUndefined();
    expect(proxy?.[context]?.cookieDomainRewrite).toBeUndefined();
    expect(new RegExp(context).test("/api")).toBe(true);
    expect(new RegExp(context).test("/api/auth/login")).toBe(true);
    expect(new RegExp(context).test("/api?health=1")).toBe(true);
    expect(new RegExp(context).test("/api2/auth/login")).toBe(false);
  });

  it("does not configure a proxy in build mode", () => {
    expect(createApiDevProxy("build", { API_PROXY_TARGET: productionApi })).toBeUndefined();
  });

  it("sends the production App Origin required by refresh-v1", () => {
    const headers = new Map<string, string>();

    setProductionSessionOrigin({
      setHeader: (name, value) => headers.set(name, value),
    });

    expect(headers.get("Origin")).toBe("https://app.riffvalley.es");
  });

  it("leaves the proxy disabled when no target is selected", () => {
    expect(createApiDevProxy("serve", {})).toBeUndefined();
  });

  it.each([
    "http://localhost:3000",
    "https://api.example.test/api",
    "https://user:password@api.example.test",
    "https://api.example.test",
  ])("rejects an unsafe, non-origin, or unapproved proxy target: %s", (target) => {
    expect(() => createApiDevProxy("serve", { API_PROXY_TARGET: target })).toThrow(
      "API_PROXY_TARGET"
    );
  });

  it("proxies to the loopback API and attaches the local edge assertion server-side", () => {
    const proxy = createApiDevProxy("serve", {
      API_PROXY_TARGET: localApi,
      LOCAL_SESSION_EDGE_SECRET: localEdgeSecret,
    });
    const context = "^/api(?:/|\\?|$)";
    expect(proxy?.[context]).toMatchObject({
      target: localApi,
      changeOrigin: true,
      secure: true,
    });

    const listeners: Array<(request: { setHeader(name: string, value: string): void }) => void> =
      [];
    const registrar: ProxyEventRegistrar = {
      on: (_event, listener) => {
        listeners.push(listener);
      },
    };
    configureLocalSessionProxy(registrar, localEdgeSecret);
    const headers = new Map<string, string>();
    listeners[0]?.({ setHeader: (name, value) => headers.set(name, value) });

    expect(headers).toEqual(new Map([["X-RV-Session-Edge", localEdgeSecret]]));
  });

  it("requires a valid local edge secret only for the local API target", () => {
    expect(() => createApiDevProxy("serve", { API_PROXY_TARGET: localApi })).toThrow(
      "LOCAL_SESSION_EDGE_SECRET"
    );
    expect(() =>
      createApiDevProxy("serve", {
        API_PROXY_TARGET: localApi,
        LOCAL_SESSION_EDGE_SECRET: "not-a-secret",
      })
    ).toThrow("LOCAL_SESSION_EDGE_SECRET");
  });
});
