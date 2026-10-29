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

describe("/calendar route access", () => {
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    refresh.mockReset();
    refresh.mockRejectedValue(new SessionAuthError("Unauthenticated", "unauthenticated", 401));
    setActivePinia(createPinia());
    await router.push("/login");
  });

  it("keeps the canonical path, authentication guard, and user minimum role", async () => {
    const route = router.getRoutes().find(({ name }) => name === "Calendar");
    expect(route?.path).toBe("/calendar");
    expect(route?.meta.requiresAuth).toBe(true);
    expect(route?.meta.requiresRole).toBe("user");

    await router.push("/calendar");
    expect(router.currentRoute.value.name).toBe("Login");

    const authStore = useAuthStore();
    authStore.token = "test-token";
    authStore.role = "user";
    authStore.authStatus = "authenticated";
    await router.push("/calendar");
    expect(router.currentRoute.value.name).toBe("Calendar");
  });

  it("redirects /calendar-baby to the canonical calendar with its authentication guard", async () => {
    const route = router.getRoutes().find(({ name }) => name === "CalendarBabyCompatibility");
    expect(route?.path).toBe("/calendar-baby");
    expect(route?.redirect).toEqual({ name: "Calendar" });
    expect(route?.meta.requiresAuth).toBe(true);
    expect(route?.meta.requiresRole).toBe("user");

    const authStore = useAuthStore();
    authStore.token = "test-token";
    authStore.role = "user";
    authStore.authStatus = "authenticated";
    await router.push("/calendar-baby");
    expect(router.currentRoute.value.name).toBe("Calendar");
    expect(router.currentRoute.value.path).toBe("/calendar");
  });

  it("keeps the independent content calendar route", () => {
    const route = router.getRoutes().find(({ name }) => name === "ContentCalendar");
    expect(route?.path).toBe("/content-calendar");
    expect(route?.meta.requiresAuth).toBe(true);
    expect(route?.meta.requiresRole).toBe("riffvalley");
  });
});
