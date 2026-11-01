// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import router from "./index";
import { useAuthStore } from "@/modules/identity/auth";

describe("Reunions route contract", () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    await router.push("/login");
  });

  it("preserves the guarded list and detail routes", () => {
    const list = router.getRoutes().find(({ name }) => name === "ReunionsList");
    const detail = router.getRoutes().find(({ name }) => name === "EditReunion");
    expect(list?.path).toBe("/reunions/list");
    expect(detail?.path).toBe("/reunions/:id");
    expect(list?.meta).toMatchObject({ requiresAuth: true, requiresRole: "riffvalley" });
    expect(detail?.meta).toMatchObject({ requiresAuth: true, requiresRole: "riffvalley" });
  });

  it("keeps the current authentication and role guard behavior", async () => {
    const auth = useAuthStore();
    auth.$patch({ authStatus: "anonymous", role: null, userId: null, token: null });
    await router.push("/reunions/list");
    expect(router.currentRoute.value.name).toBe("Login");

    auth.$patch({ authStatus: "authenticated", role: "user", userId: "reader", token: "token" });
    await router.push("/reunions/meeting-1");
    expect(router.currentRoute.value.name).toBe("Forbidden");

    auth.$patch({ role: "riffvalley" });
    await router.push("/reunions/list");
    expect(router.currentRoute.value.name).toBe("ReunionsList");
    await router.push("/reunions/meeting-1");
    expect(router.currentRoute.value.name).toBe("EditReunion");
  });
});
