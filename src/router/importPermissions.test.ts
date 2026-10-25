// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import router from "./index";
import { useAuthStore } from "@/modules/identity/stores/auth";
import type { UserRole } from "@/modules/identity/types/auth";

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

  it.each(["user", "collaborator"] as const)(
    "denies %s access to Manual and Excel",
    async (role) => {
      expect((await navigateAs(role, "/import")).name).toBe("Home");
      expect((await navigateAs(role, "/import-discs")).name).toBe("Home");
    },
  );

  it("allows riffvalley to use Excel while denying Manual", async () => {
    expect((await navigateAs("riffvalley", "/import")).name).toBe("Home");
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
    expect((await navigateAs("user", "/users")).name).toBe("Home");
    expect((await navigateAs("riffvalley", "/users")).name).toBe("Home");
    expect((await navigateAs("superadmin", "/users")).name).toBe("Users");
    expect(router.currentRoute.value.path).toBe("/users");
  });

  it("keeps administrative statistics restricted to superadmin", async () => {
    expect((await navigateAs("user", "/users/stats")).name).toBe("Home");
    expect((await navigateAs("riffvalley", "/users/stats")).name).toBe("Home");
    expect((await navigateAs("superadmin", "/users/stats")).name).toBe("UserStats");
  });

  it("keeps all three usage statistics tabs restricted to superadmin", async () => {
    for (const path of ["/users/stats/users", "/users/stats/inactivity"]) {
      expect((await navigateAs("user", path)).name).toBe("Home");
      expect((await navigateAs("riffvalley", path)).name).toBe("Home");
    }

    expect((await navigateAs("superadmin", "/users/stats/users")).name).toBe("UserStatsUsers");
    expect((await navigateAs("superadmin", "/users/stats/inactivity")).name).toBe("UserStatsInactivity");
  });

  it("keeps administrative inactivity restricted to superadmin", async () => {
    expect((await navigateAs("user", "/users/inactivity")).name).toBe("Home");
    expect((await navigateAs("riffvalley", "/users/inactivity")).name).toBe("Home");
    expect((await navigateAs("superadmin", "/users/inactivity")).name).toBe("UserStatsInactivity");
    expect(router.currentRoute.value.path).toBe("/users/stats/inactivity");
  });

  it("keeps administrative activity restricted to superadmin", async () => {
    expect((await navigateAs("user", "/users/activity")).name).toBe("Home");
    expect((await navigateAs("riffvalley", "/users/activity")).name).toBe("Home");
    expect((await navigateAs("superadmin", "/users/activity?userId=member-1")).name).toBe("UserStatsUsers");
    expect(router.currentRoute.value.path).toBe("/users/stats/users");
    expect(router.currentRoute.value.query.userId).toBe("member-1");
  });
});
