// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import type { RouteRecordNormalized } from "vue-router";
import router from "@/router";
import { useAuthStore } from "@/modules/identity/auth";

describe("Requests and Feedback routes", () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    await router.push("/login");
  });

  async function navigate(role: "user" | "collaborator" | "riffvalley" | "superadmin" | null, path: string) {
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

  it.each([
    ["/disc-requests", "DiscRequests", "SuggestPage", "user"],
    ["/admin/disc-requests", "AdminDiscRequests", "PetitionsPage", "riffvalley"],
    ["/feedback", "Feedback", "SuggestionsPage", undefined],
  ] as const)("registers %s with its canonical view and original permissions", async (path, name, viewName, role) => {
    const record = route(path);
    expect(record.name).toBe(name);
    expect(record.meta.requiresAuth).toBe(true);
    expect(record.meta.requiresRole).toBe(role);

    const loader = record.components?.default as () => Promise<{ default: { name?: string } }>;
    expect((await loader()).default.name).toBe(viewName);
  });

  it("requires authentication and retains the user minimum role for disc requests", async () => {
    expect((await navigate(null, "/disc-requests")).name).toBe("Login");
    expect((await navigate(null, "/suggest")).name).toBe("Login");
    expect((await navigate("user", "/disc-requests")).name).toBe("DiscRequests");
    expect((await navigate("collaborator", "/disc-requests")).name).toBe("DiscRequests");
    expect((await navigate("user", "/suggest")).name).toBe("DiscRequests");
    expect((await navigate("collaborator", "/suggest")).name).toBe("DiscRequests");
  });

  it("retains the riffvalley minimum role on canonical and legacy admin routes", async () => {
    expect((await navigate("user", "/admin/disc-requests")).name).toBe("Forbidden");
    expect((await navigate("user", "/petitions")).name).toBe("Forbidden");
    expect((await navigate("riffvalley", "/admin/disc-requests")).name).toBe("AdminDiscRequests");
    expect((await navigate("superadmin", "/petitions")).name).toBe("AdminDiscRequests");
  });

  it("keeps Feedback authenticated with its original base-user permission", async () => {
    expect((await navigate(null, "/feedback")).name).toBe("Login");
    expect((await navigate(null, "/suggestions")).name).toBe("Login");
    expect((await navigate("user", "/feedback")).name).toBe("Feedback");
    expect((await navigate("user", "/suggestions")).name).toBe("Feedback");
    expect(route("/feedback").meta.requiresRole).toBeUndefined();
  });

  it.each([
    ["/suggest", "/disc-requests", "DiscRequests"],
    ["/petitions", "/admin/disc-requests", "AdminDiscRequests"],
    ["/suggestions", "/feedback", "Feedback"],
  ])("redirects %s to %s once and preserves query and hash", async (legacyPath, canonicalPath, canonicalName) => {
    const legacy = route(legacyPath);
    expect(typeof legacy.redirect).toBe("function");
    expect(legacy.components).toBeUndefined();
    expect(legacy.redirect).toEqual(expect.any(Function));

    const current = await navigate(
      legacyPath === "/petitions" ? "riffvalley" : "user",
      `${legacyPath}?source=bookmark&tab=mine#request-form`,
    );
    expect(current.path).toBe(canonicalPath);
    expect(current.name).toBe(canonicalName);
    expect(current.query).toEqual({ source: "bookmark", tab: "mine" });
    expect(current.hash).toBe("#request-form");
    expect(current.redirectedFrom?.path).toBe(legacyPath);
  });
});
