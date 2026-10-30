// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import type { RouteRecordNormalized } from "vue-router";
import router from "@/router";
import { useAuthStore } from "@/modules/identity/auth";

describe("Feedback routes", () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    await router.push("/login");
  });

  async function navigate(role: "user" | "riffvalley" | "superadmin" | null, path: string) {
    const auth = useAuthStore();
    auth.$patch({
      authStatus: role ? "authenticated" : "anonymous",
      token: role ? "token" : null,
      userId: role ? `user-${role}` : null,
      role,
    });
    await router.push(path);
    return router.currentRoute.value;
  }

  function route(path: string): RouteRecordNormalized {
    const matched = router.getRoutes().find((record) => record.path === path);
    if (!matched) throw new Error(`Route ${path} was not registered`);
    return matched;
  }

  it("registers the canonical user and admin paths with their previous guards", () => {
    expect(route("/feedback").name).toBe("Feedback");
    expect(route("/feedback").meta).toMatchObject({ requiresAuth: true });
    expect(route("/feedback").meta.requiresRole).toBeUndefined();
    expect(route("/admin/feedback").name).toBe("AdminFeedback");
    expect(route("/admin/feedback").meta).toMatchObject({ requiresAuth: true, requiresRole: "superadmin" });
  });

  it("keeps authentication and the global user minimum role on Feedback", async () => {
    expect((await navigate(null, "/feedback")).name).toBe("Login");
    expect((await navigate("user", "/feedback")).name).toBe("Feedback");
    expect((await navigate("riffvalley", "/feedback")).name).toBe("Feedback");
  });

  it("keeps superadmin access on the canonical path and both legacy paths", async () => {
    expect((await navigate("user", "/admin/feedback")).name).toBe("Forbidden");
    expect((await navigate("user", "/suggestions/management")).name).toBe("Forbidden");
    expect((await navigate("superadmin", "/admin/feedback")).name).toBe("AdminFeedback");
    expect((await navigate("superadmin", "/suggestions/management")).name).toBe("AdminFeedback");
  });

  it.each([
    ["/suggestions", "/feedback", "Feedback"],
    ["/suggestions/management", "/admin/feedback", "AdminFeedback"],
  ])("redirects %s and preserves query and hash", async (legacyPath, canonicalPath, canonicalName) => {
    const current = await navigate(
      legacyPath === "/suggestions" ? "user" : "superadmin",
      `${legacyPath}?source=bookmark&tab=mine#feedback-form`,
    );
    expect(current.path).toBe(canonicalPath);
    expect(current.name).toBe(canonicalName);
    expect(current.query).toEqual({ source: "bookmark", tab: "mine" });
    expect(current.hash).toBe("#feedback-form");
    expect(current.redirectedFrom?.path).toBe(legacyPath);
  });
});
