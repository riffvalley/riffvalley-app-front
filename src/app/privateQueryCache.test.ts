// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient } from "@tanstack/vue-query";

const { refresh, logout } = vi.hoisted(() => ({
  refresh: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("@/modules/identity/api/sessionAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/identity/api/sessionAuth")>();
  return { ...actual, sessionAuthTransport: { refresh, login: vi.fn(), logout } };
});
vi.mock("@/modules/identity/api/sessionAuthCoordinator", () => ({
  broadcastAuthLogin: vi.fn(),
  broadcastAuthLogout: vi.fn(),
  broadcastSessionCsrfUpdated: vi.fn(),
  subscribeToRemoteSessionCsrfUpdated: vi.fn(() => () => undefined),
  withAuthSessionLock: (operation: () => Promise<unknown>) => operation(),
}));
vi.mock("@/modules/identity/api/appDailyActivity", () => ({ notifyAppDailyActivity: vi.fn() }));

import { SessionAuthError } from "@/modules/identity/api/sessionAuth";
import { useAuthStore } from "@/modules/identity/stores/auth";
import { observePrivateQueryCache } from "./privateQueryCache";

function createLifecycle() {
  const authStore = useAuthStore();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  observePrivateQueryCache(authStore, client);
  return { authStore, client };
}

function authenticate(authStore: ReturnType<typeof useAuthStore>, userId = "user-a") {
  authStore.$patch({
    authStatus: "authenticated",
    userId,
    username: userId,
    token: "memory-only-token",
    role: "user",
    sessionMode: "renewable",
  });
}

describe("private query cache lifecycle", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    refresh.mockReset();
    logout.mockReset();
    setActivePinia(createPinia());
  });

  it("clears private entries immediately on explicit logout", async () => {
    const { authStore, client } = createLifecycle();
    authenticate(authStore);
    client.setQueryData(["identity", "users"], [{ id: "user-a" }]);

    await authStore.logout();

    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });

  it("clears private entries when refresh confirms session expiration", async () => {
    const { authStore, client } = createLifecycle();
    authenticate(authStore);
    client.setQueryData(["identity", "users"], [{ id: "user-a" }]);
    refresh.mockRejectedValue(new SessionAuthError("Unauthenticated", "unauthenticated", 401));

    await expect(authStore.renewSession()).resolves.toBe("unauthenticated");

    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });

  it("clears private entries when the remote logout callback clears Auth", () => {
    const { authStore, client } = createLifecycle();
    authenticate(authStore);
    client.setQueryData(["community", "ratings", "release-1"], { rating: 5 });

    // main.ts uses this same store action in its remote BroadcastChannel callback.
    authStore.clearSessionLocally();

    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });

  it("isolates one user's data before the replacement identity becomes active", () => {
    const { authStore, client } = createLifecycle();
    authenticate(authStore);
    client.setQueryData(["identity", "users", { page: 1 }], [{ id: "user-a" }]);

    authStore.$patch({ userId: "user-b", username: "user-b" });

    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });

  it("cancels active requests so a late response cannot repopulate private data", async () => {
    const { authStore, client } = createLifecycle();
    authenticate(authStore);
    let resolveRequest!: (value: string) => void;
    let requestSignal: AbortSignal | undefined;
    const pending = client.fetchQuery({
      queryKey: ["identity", "users", { page: 1 }],
      queryFn: ({ signal }) => {
        requestSignal = signal;
        return new Promise<string>((resolve) => { resolveRequest = resolve; });
      },
    }).catch(() => undefined);

    authStore.clearSessionLocally();
    resolveRequest("late private response");
    await pending;

    expect(requestSignal?.aborted).toBe(true);
    expect(client.getQueryData(["identity", "users", { page: 1 }])).toBeUndefined();
  });
});
