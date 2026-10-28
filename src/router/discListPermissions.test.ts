// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("@/modules/identity/auth/api/sessionAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/identity/auth/api/sessionAuth")>();
  return { ...actual, sessionAuthTransport: { refresh } };
});
vi.mock("@/modules/identity/activity/api/appDailyActivity", () => ({
  notifyAppDailyActivity: vi.fn(),
}));

import { SessionAuthError } from "@/modules/identity/auth/api/sessionAuth";
import { useAuthStore } from "@/modules/identity/auth";
import router from "./index";

describe("/disc-list route access", () => {
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    refresh.mockReset();
    refresh.mockRejectedValue(new SessionAuthError("Unauthenticated", "unauthenticated", 401));
    setActivePinia(createPinia());
    await router.push("/login");
  });

  it("requires authentication and allows an authenticated user role", async () => {
    const route = router.getRoutes().find(({ name }) => name === "DiscList");
    expect(route?.path).toBe("/disc-list");
    expect(route?.meta.requiresAuth).toBe(true);
    expect(route?.meta.requiresRole).toBeUndefined();

    const authStore = useAuthStore();
    authStore.token = null;
    authStore.role = null;
    authStore.authStatus = "anonymous";
    await router.push("/disc-list");
    expect(router.currentRoute.value.name).toBe("Login");

    authStore.token = "test-token";
    authStore.role = "user";
    authStore.authStatus = "authenticated";
    await router.push("/disc-list");
    expect(router.currentRoute.value.name).toBe("DiscList");
  });

  it("leaves the protected page when the active session is cleared", async () => {
    const authStore = useAuthStore();
    authStore.token = "test-token";
    authStore.role = "user";
    authStore.authStatus = "authenticated";

    await router.push("/disc-list");
    expect(router.currentRoute.value.name).toBe("DiscList");

    authStore.clearSessionLocally();
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe("Login"));
  });
});
