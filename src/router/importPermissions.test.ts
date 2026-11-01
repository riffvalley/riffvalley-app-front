// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import router from "./index";
import { useAuthStore } from "@/modules/identity/auth";
import type { UserRole } from "@/modules/identity/shared";
import TopDiscsView from "@/modules/catalog/top-discs/presentation/views/TopDiscsView.vue";
import RadarDetailView from "@/modules/editorial/radar-best-lists/presentation/views/RadarDetailView.vue";

describe("import route permissions", () => {
  beforeEach(async () => {
    localStorage.clear();
    setActivePinia(createPinia());
    await router.push("/login");
  });

  async function navigateAs(role: UserRole | null, path: string) {
    const authStore = useAuthStore();
    authStore.token = role ? "test-token" : null;
    authStore.role = role;
    authStore.authStatus = role ? "authenticated" : "anonymous";

    await router.push(path);
    return router.currentRoute.value;
  }

  it("redirects unauthenticated users from both import routes to login", async () => {
    expect((await navigateAs(null, "/import")).name).toBe("Login");
    expect((await navigateAs(null, "/import-discs")).name).toBe("Login");
  });

  it("protects Rankings for anonymous users and permits any authenticated user role", async () => {
    expect((await navigateAs(null, "/rankings")).name).toBe("Login");
    expect((await navigateAs("user", "/rankings")).name).toBe("Rankings");
  });

  it("loads the TopDiscs feature view for Rankings", async () => {
    expect((await navigateAs("user", "/rankings")).name).toBe("Rankings");
    const route = router.getRoutes().find(({ name }) => name === "Rankings");

    expect(route?.path).toBe("/rankings");
    expect(route?.meta.requiresAuth).toBe(true);
    expect(route?.components?.default).toBe(TopDiscsView);
  });

  it("keeps the Radar detail route behind the riffvalley guard and loads its editorial module view", async () => {
    expect((await navigateAs("user", "/discos/radar/radar-1")).name).toBe("Forbidden");
    expect((await navigateAs("riffvalley", "/discos/radar/radar-1")).name).toBe("RadarDetalle");

    const route = router.getRoutes().find(({ name }) => name === "RadarDetalle");
    expect(route?.path).toBe("/discos/radar/:id");
    expect(route?.meta).toMatchObject({ requiresAuth: true, requiresRole: "riffvalley" });
    expect(route?.components?.default).toBe(RadarDetailView);
  });

  it("redirects Rankings to Login when the active session is cleared", async () => {
    const authStore = useAuthStore();
    await navigateAs("user", "/rankings");

    authStore.clearSessionLocally();
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe("Login"));
  });

  it.each(["user", "collaborator"] as const)(
    "shows forbidden for %s on Manual and Excel",
    async (role) => {
      expect((await navigateAs(role, "/import")).name).toBe("Forbidden");
      expect((await navigateAs(role, "/import-discs")).name).toBe("Forbidden");
    },
  );

  it("allows riffvalley to use Excel while denying Manual", async () => {
    expect((await navigateAs("riffvalley", "/import")).name).toBe("Forbidden");
    expect((await navigateAs("riffvalley", "/import-discs")).name).toBe(
      "ImportDiscs",
    );
  });

  it("allows superadmin to use both import routes", async () => {
    expect((await navigateAs("superadmin", "/import")).name).toBe("Import");
    expect((await navigateAs("superadmin", "/import-discs")).name).toBe(
      "ImportDiscs",
    );
  });

  it("keeps user administration restricted to superadmin", async () => {
    expect((await navigateAs("user", "/users")).name).toBe("Forbidden");
    expect((await navigateAs("riffvalley", "/users")).name).toBe("Forbidden");
    expect((await navigateAs("superadmin", "/users")).name).toBe("Users");
    expect(router.currentRoute.value.path).toBe("/users");
  });

  it("keeps administrative statistics restricted to superadmin", async () => {
    expect((await navigateAs("user", "/users/stats")).name).toBe("Forbidden");
    expect((await navigateAs("riffvalley", "/users/stats")).name).toBe("Forbidden");
    expect((await navigateAs("superadmin", "/users/stats")).name).toBe("UserStats");
  });

  it("evacuates an open administrative route when refresh revokes superadmin", async () => {
    const authStore = useAuthStore();
    authStore.$patch({ userId: "admin-a", authSessionGeneration: 8 });
    await navigateAs("superadmin", "/users/stats/users");

    // Permission refresh keeps the identity and session generation unchanged.
    authStore.$patch({ role: "user" });
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe("Forbidden"));
    expect(authStore.userId).toBe("admin-a");
    expect(authStore.authSessionGeneration).toBe(8);
  });

  it("redirects an open administrative route to Login when its session is cleared", async () => {
    const authStore = useAuthStore();
    await navigateAs("superadmin", "/users/stats/inactivity");

    authStore.clearSessionLocally();
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe("Login"));
  });

  it("keeps all three usage statistics tabs restricted to superadmin", async () => {
    for (const path of ["/users/stats/users", "/users/stats/inactivity"]) {
      expect((await navigateAs("user", path)).name).toBe("Forbidden");
      expect((await navigateAs("riffvalley", path)).name).toBe("Forbidden");
    }

    expect((await navigateAs("superadmin", "/users/stats/users")).name).toBe("UserStatsUsers");
    expect((await navigateAs("superadmin", "/users/stats/inactivity")).name).toBe("UserStatsInactivity");
  });

  it("keeps administrative inactivity restricted to superadmin", async () => {
    expect((await navigateAs("user", "/users/inactivity")).name).toBe("Forbidden");
    expect((await navigateAs("riffvalley", "/users/inactivity")).name).toBe("Forbidden");
    expect((await navigateAs("superadmin", "/users/inactivity")).name).toBe("UserStatsInactivity");
    expect(router.currentRoute.value.path).toBe("/users/stats/inactivity");
  });

  it("keeps administrative activity restricted to superadmin", async () => {
    expect((await navigateAs("user", "/users/activity")).name).toBe("Forbidden");
    expect((await navigateAs("riffvalley", "/users/activity")).name).toBe("Forbidden");
    expect((await navigateAs("superadmin", "/users/activity?userId=member-1")).name).toBe("UserStatsUsers");
    expect(router.currentRoute.value.path).toBe("/users/stats/users");
    expect(router.currentRoute.value.query.userId).toBe("member-1");
  });
});
