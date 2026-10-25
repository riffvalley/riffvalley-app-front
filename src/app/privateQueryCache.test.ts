// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient } from "@tanstack/vue-query";

const { refresh, logout, broadcastAuthPermissionsChanged } = vi.hoisted(() => ({
  refresh: vi.fn(),
  logout: vi.fn(),
  broadcastAuthPermissionsChanged: vi.fn(),
}));

vi.mock("@/modules/identity/auth/api/sessionAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/identity/auth/api/sessionAuth")>();
  return { ...actual, sessionAuthTransport: { refresh, login: vi.fn(), logout } };
});
vi.mock("@/modules/identity/auth/api/sessionAuthCoordinator", () => ({
  broadcastAuthPermissionsChanged,
  broadcastAuthLogin: vi.fn(),
  broadcastAuthLogout: vi.fn(),
  broadcastSessionCsrfUpdated: vi.fn(),
  subscribeToRemoteSessionCsrfUpdated: vi.fn(() => () => undefined),
  withAuthSessionLock: (operation: () => Promise<unknown>) => operation(),
}));
vi.mock("@/modules/identity/activity/api/appDailyActivity", () => ({ notifyAppDailyActivity: vi.fn() }));

import { SessionAuthError } from "@/modules/identity/auth/api/sessionAuth";
import { useAuthStore } from "@/modules/identity/auth/stores/auth";
import { observePrivateQueryCache } from "./privateQueryCache";

function createLifecycle() {
  const authStore = useAuthStore();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  observePrivateQueryCache(authStore, client);
  return { authStore, client };
}

function authenticate(
  authStore: ReturnType<typeof useAuthStore>,
  userId = "user-a",
  role: "user" | "superadmin" = "user",
) {
  authStore.$patch({
    role,
    authStatus: "authenticated",
    userId,
    username: userId,
    token: "memory-only-token",
    sessionMode: "renewable",
  });
}

describe("private query cache lifecycle", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    refresh.mockReset();
    logout.mockReset();
    broadcastAuthPermissionsChanged.mockReset();
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

  it("removes admin data on a refresh downgrade without changing identity or session generation", async () => {
    const { authStore, client } = createLifecycle();
    authenticate(authStore, "user-a", "superadmin");
    const generation = authStore.authSessionGeneration;
    client.setQueryData(["identity", "users", "admin-list"], [{ id: "private-user" }]);
    client.setQueryData(["identity", "activity", "dashboard"], { total: 42 });
    refresh.mockResolvedValue({
      user: { id: "user-a", username: "user-a", role: "user" },
      token: "renewed-token",
    });

    await expect(authStore.renewSession()).resolves.toBe("renewed");

    expect(authStore.userId).toBe("user-a");
    expect(authStore.authSessionGeneration).toBe(generation);
    expect(authStore.role).toBe("user");
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    expect(broadcastAuthPermissionsChanged).toHaveBeenCalledOnce();
  });

  it("keeps cached data on a refresh with unchanged or equivalent effective permissions", async () => {
    const { authStore, client } = createLifecycle();
    authenticate(authStore);
    client.setQueryData(["identity", "users"], [{ id: "user-a" }]);

    refresh.mockResolvedValueOnce({
      user: { id: "user-a", username: "user-a", role: "user" },
      token: "renewed-token",
    });
    await authStore.renewSession();
    expect(client.getQueryData(["identity", "users"])).toEqual([{ id: "user-a" }]);

    refresh.mockResolvedValueOnce({
      user: { id: "user-a", username: "user-a", role: "riffvalley" },
      token: "renewed-token-2",
    });
    await authStore.renewSession();
    expect(authStore.role).toBe("riffvalley");
    expect(client.getQueryData(["identity", "users"])).toEqual([{ id: "user-a" }]);
    expect(broadcastAuthPermissionsChanged).not.toHaveBeenCalled();
  });

  it("cancels pending queries and prevents their late result from restoring admin data", async () => {
    const { authStore, client } = createLifecycle();
    authenticate(authStore, "user-a", "superadmin");
    let resolveRequest!: (value: string) => void;
    let requestSignal: AbortSignal | undefined;
    const pending = client.fetchQuery({
      queryKey: ["identity", "activity", "pending"],
      queryFn: ({ signal }) => {
        requestSignal = signal;
        return new Promise<string>((resolve) => { resolveRequest = resolve; });
      },
    }).catch(() => undefined);
    refresh.mockResolvedValue({
      user: { id: "user-a", username: "user-a", role: "user" },
      token: "renewed-token",
    });

    await authStore.renewSession();
    resolveRequest("late private response");
    await pending;

    expect(requestSignal?.aborted).toBe(true);
    expect(client.getQueryData(["identity", "activity", "pending"])).toBeUndefined();
  });

  it("clears again when administrative permissions are restored", async () => {
    const { authStore, client } = createLifecycle();
    authenticate(authStore);
    client.setQueryData(["identity", "activity", "dashboard"], { old: true });
    refresh.mockResolvedValue({
      user: { id: "user-a", username: "user-a", role: "superadmin" },
      token: "renewed-token",
    });

    await authStore.renewSession();

    expect(authStore.role).toBe("superadmin");
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    expect(broadcastAuthPermissionsChanged).toHaveBeenCalledOnce();
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
