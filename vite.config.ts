import path from "node:path";
import vue from "@vitejs/plugin-vue";
import { defineConfig, loadEnv, type ConfigEnv, type ProxyOptions, type UserConfig } from "vite";

const API_PROXY_PATH = "^/api(?:/|\\?|$)";
const LOCAL_API_TARGET = "http://127.0.0.1:3000";
const LOCAL_SESSION_EDGE_SECRET_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const SESSION_EDGE_HEADER = "X-RV-Session-Edge";
const APPROVED_API_TARGETS = new Set(["https://spammusic-back-99963122d70c.herokuapp.com"]);
const SESSION_ORIGIN = "https://app.riffvalley.es";

interface ProxyRequestHeaderWriter {
  setHeader(name: string, value: string): void;
}

export interface ProxyEventRegistrar {
  on(event: "proxyReq", listener: (request: ProxyRequestHeaderWriter) => void): unknown;
}

export function configureLocalSessionProxy(proxy: ProxyEventRegistrar, edgeSecret: string): void {
  proxy.on("proxyReq", (proxyRequest) => {
    proxyRequest.setHeader(SESSION_EDGE_HEADER, edgeSecret);
  });
}

export function setProductionSessionOrigin(request: ProxyRequestHeaderWriter): void {
  request.setHeader("Origin", SESSION_ORIGIN);
}

export function createApiDevProxy(
  command: ConfigEnv["command"],
  env: Record<string, string | undefined>
): Record<string, ProxyOptions> | undefined {
  if (command !== "serve") return undefined;

  const target = env.API_PROXY_TARGET?.trim();
  if (!target) return undefined;

  if (target === LOCAL_API_TARGET) {
    const edgeSecret = env.LOCAL_SESSION_EDGE_SECRET?.trim();
    if (!edgeSecret || !LOCAL_SESSION_EDGE_SECRET_PATTERN.test(edgeSecret)) {
      throw new Error(
        "LOCAL_SESSION_EDGE_SECRET must be a 32-byte base64url value for the local API proxy."
      );
    }

    return {
      [API_PROXY_PATH]: {
        target,
        changeOrigin: true,
        secure: true,
        configure(proxy) {
          configureLocalSessionProxy(proxy, edgeSecret);
        },
      },
    };
  }

  let parsedTarget: URL;
  try {
    parsedTarget = new URL(target);
  } catch {
    throw new Error("API_PROXY_TARGET must be an HTTPS API origin.");
  }

  if (
    parsedTarget.protocol !== "https:" ||
    parsedTarget.origin !== target ||
    parsedTarget.pathname !== "/" ||
    parsedTarget.search ||
    parsedTarget.hash
  ) {
    throw new Error("API_PROXY_TARGET must be an HTTPS API origin without a path.");
  }
  if (!APPROVED_API_TARGETS.has(target)) {
    throw new Error("API_PROXY_TARGET is not an approved Riff Valley API origin.");
  }

  return {
    [API_PROXY_PATH]: {
      target,
      changeOrigin: true,
      secure: true,
      configure(proxy) {
        proxy.on("proxyReq", (proxyRequest) => {
          // The backend binds refresh-v1 to the exact production App Origin.
          // The browser still talks only to localhost; this header is set on
          // the server-to-server request made by Vite.
          setProductionSessionOrigin(proxyRequest);
        });
      },
    },
  };
}

export function createViteConfig(
  { command }: Pick<ConfigEnv, "command">,
  env: Record<string, string | undefined>
): UserConfig {
  const apiProxy = createApiDevProxy(command, env);

  return {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@stores": path.resolve(__dirname, "src/stores"),
        "@views": path.resolve(__dirname, "src/views"),
        "@components": path.resolve(__dirname, "src/components"),
        "@services": path.resolve(__dirname, "src/services"),
        "@interfaces": path.resolve(__dirname, "src/interfaces"),
        "@helpers": path.resolve(__dirname, "src/helpers"),
        "@assets": path.resolve(__dirname, "src/helpers"),
      },
    },
    plugins: [vue()],
    ...(apiProxy ? { server: { proxy: apiProxy } } : {}),
  };
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return createViteConfig({ command }, env);
});
