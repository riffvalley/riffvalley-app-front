// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import router from "./index";
import { useAuthStore } from "@stores/auth/auth";
import type { UserRole } from "@interfaces/auth";

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
});
