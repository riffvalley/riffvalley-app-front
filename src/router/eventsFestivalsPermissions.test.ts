// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import router from "./index";
import { useAuthStore } from "@/modules/identity/auth";

describe("Events and festivals route contract", () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    await router.push("/login");
  });

  it("registers the listing and importer as authenticated Riff Valley routes", () => {
    const listing = router.getRoutes().find(({ name }) => name === "EventsFestivals");
    const route = router.getRoutes().find(({ name }) => name === "EventsFestivalsImport");
    expect(listing?.path).toBe("/concerts-festivals");
    expect(listing?.meta).toMatchObject({ requiresAuth: true, requiresRole: "riffvalley" });
    expect(route?.path).toBe("/concerts-festivals/import");
    expect(route?.meta).toMatchObject({ requiresAuth: true, requiresRole: "riffvalley" });
  });

  it("applies the existing authentication and role guard", async () => {
    const auth = useAuthStore();
    auth.$patch({ authStatus: "anonymous", role: null, userId: null, token: null });
    await router.push("/concerts-festivals");
    expect(router.currentRoute.value.name).toBe("Login");

    auth.$patch({ authStatus: "authenticated", role: "user", userId: "reader", token: "token" });
    await router.push("/concerts-festivals");
    expect(router.currentRoute.value.name).toBe("Forbidden");

    auth.$patch({ role: "riffvalley" });
    await router.push("/concerts-festivals");
    expect(router.currentRoute.value.name).toBe("EventsFestivals");
    await router.push("/concerts-festivals/import");
    expect(router.currentRoute.value.name).toBe("EventsFestivalsImport");
  });
});

describe("Venues route contract", () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    await router.push("/login");
  });

  it("registers Salas y recintos as an authenticated Riff Valley route", () => {
    const route = router.getRoutes().find(({ name }) => name === "VenuesHome");
    expect(route?.path).toBe("/venues");
    expect(route?.meta).toMatchObject({ requiresAuth: true, requiresRole: "riffvalley" });
  });

  it("protects the section with the existing authentication and role guard", async () => {
    const auth = useAuthStore();
    auth.$patch({ authStatus: "anonymous", role: null, userId: null, token: null });
    await router.push("/venues");
    expect(router.currentRoute.value.name).toBe("Login");

    auth.$patch({ authStatus: "authenticated", role: "user", userId: "reader", token: "token" });
    await router.push("/venues");
    expect(router.currentRoute.value.name).toBe("Forbidden");

    auth.$patch({ role: "riffvalley" });
    await router.push("/venues");
    expect(router.currentRoute.value.name).toBe("VenuesHome");
  });
});
