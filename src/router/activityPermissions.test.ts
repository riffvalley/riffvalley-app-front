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

describe("/activity route access", () => {
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    refresh.mockReset();
    refresh.mockRejectedValue(new SessionAuthError("Unauthenticated", "unauthenticated", 401));
    setActivePinia(createPinia());
    await router.push("/login");
  });

  it("registers /activity with authentication and the user minimum role", () => {
    const route = router.getRoutes().find(({ name }) => name === "Activity");
    expect(route?.path).toBe("/activity");
    expect(route?.meta.requiresAuth).toBe(true);
    expect(route?.meta.requiresRole).toBe("user");
  });

  it("redirects anonymous users and permits all four roles in the hierarchy", async () => {
    await router.push("/activity");
    expect(router.currentRoute.value.name).toBe("Login");

    for (const role of ["user", "collaborator", "riffvalley", "superadmin"] as const) {
      const authStore = useAuthStore();
      authStore.token = "test-token";
      authStore.role = role;
      authStore.authStatus = "authenticated";

      await router.push("/activity");
      expect(router.currentRoute.value.name).toBe("Activity");
    }
  });

  it("keeps Statistics independently registered and authenticated", () => {
    const route = router.getRoutes().find(({ name }) => name === "Statistics");
    expect(route?.path).toBe("/statistics");
    expect(route?.meta.requiresAuth).toBe(true);
    expect(route?.meta.requiresRole).toBeUndefined();
  });
});
