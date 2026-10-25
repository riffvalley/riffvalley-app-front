// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("@/modules/identity/auth/api/sessionAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/identity/auth/api/sessionAuth")>();
  return { ...actual, sessionAuthTransport: { refresh } };
});

import { SessionAuthError } from "@/modules/identity/auth/api/sessionAuth";
import router from "./index";
import { useAuthStore } from "@/modules/identity/auth/stores/auth";

describe("router authentication bootstrap", () => {
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    refresh.mockReset();
    setActivePinia(createPinia());
    refresh.mockRejectedValue(new SessionAuthError("Unauthenticated", "unauthenticated", 401));
    await router.push("/login");
  });

  it("waits for refresh before deciding a protected initial navigation", async () => {
    let resolveRefresh!: (value: object) => void;
    refresh.mockReturnValueOnce(new Promise((resolve) => { resolveRefresh = resolve; }));
    setActivePinia(createPinia());

    const navigation = router.push("/import");
    await Promise.resolve();
    expect(useAuthStore().authStatus).toBe("initializing");

    resolveRefresh({
      user: { id: "7", username: "Admin", role: "superadmin" },
      token: "access-in-memory",
      csrfToken: "csrf",
      logoutCsrfToken: "logout-csrf",
      expiresAt: "2026-10-22T12:00:00.000Z",
    });

    await navigation;
    expect(router.currentRoute.value.name).toBe("Import");
    expect(useAuthStore().isAuthenticated).toBe(true);
  });

  it("cancels navigation on a temporary failure instead of redirecting to Login", async () => {
    await router.push("/national-releases/form");
    refresh.mockRejectedValueOnce(new SessionAuthError("Unavailable", "unavailable", 503));
    setActivePinia(createPinia());

    const result = await router.push("/import");

    expect(result).toBeTruthy();
    expect(useAuthStore().authStatus).toBe("error");
    expect(router.currentRoute.value.name).toBe("NationalReleasePublic");
  });

  it("preserves the authenticated Password route and redirects anonymous visitors", async () => {
    const authStore = useAuthStore();
    authStore.token = "test-token";
    authStore.role = "user";
    authStore.authStatus = "authenticated";

    await router.push("/password");
    expect(router.currentRoute.value.name).toBe("Password");
    expect(router.currentRoute.value.meta.requiresAuth).toBe(true);

    authStore.token = null;
    authStore.role = null;
    authStore.authStatus = "anonymous";
    await router.push("/login");
    await router.push("/password");
    expect(router.currentRoute.value.name).toBe("Login");
  });
});
