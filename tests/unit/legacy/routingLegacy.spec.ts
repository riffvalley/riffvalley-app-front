import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ authenticated: false, roles: [] as string[], guard: null as unknown }));
vi.mock("vue-router", () => ({
  createWebHistory: () => ({}),
  createRouter: () => ({ beforeEach: (guard: unknown) => { state.guard = guard; } }),
}));
vi.mock("../../../src/app/dependencies/identity", () => ({ useAuthStore: () => ({
  get isAuthenticated() { return state.authenticated; }, get roles() { return state.roles; },
}) }));
vi.mock("@views/loginPage/LoginPage.vue", () => ({ default: {} }));
import "../../../src/router/index";
const navigate = (path: string, name: string, meta: Record<string, unknown> = {}) =>
  (state.guard as (to: unknown) => unknown)({ path, name, meta });

describe("legacy routing decisions", () => {
  beforeEach(() => { state.authenticated = false; state.roles = []; vi.stubEnv("VITE_MAINTENANCE_MODE", "false"); });
  it("permits login/public form and redirects protected routes", () => {
    expect(navigate("/login", "Login")).toBe(true);
    expect(navigate("/national-releases/form", "NationalReleasePublic", { requiresAuth: false })).toBe(true);
    expect(navigate("/", "Home", { requiresAuth: true })).toEqual({ name: "Login" });
    expect(navigate("/maintenance", "Maintenance")).toEqual({ name: "Home" });
  });
  it("maintenance takes precedence for authenticated and public routes", () => {
    vi.stubEnv("VITE_MAINTENANCE_MODE", "true");
    expect(navigate("/login", "Login")).toEqual({ name: "Maintenance" });
    state.authenticated = true; state.roles = ["superUser"];
    expect(navigate("/users", "Users", { requiresRole: "superUser" })).toEqual({ name: "Maintenance" });
    expect(navigate("/maintenance", "Maintenance", { requiresAuth: false })).toBe(true);
  });
  it.each(["user", "babyUser", "riffValley", "superUser"])("requires the exact %s role", (role) => {
    state.authenticated = true;
    expect(navigate("/target", "Target", { requiresAuth: true, requiresRole: role })).toEqual({ name: "Home" });
    state.roles = [role];
    expect(navigate("/target", "Target", { requiresAuth: true, requiresRole: role })).toBe(true);
  });
  it("restricts only exact /import for babyUser, even with user role", () => {
    state.authenticated = true; state.roles = ["babyUser", "user"];
    expect(navigate("/import", "Import", { requiresAuth: true })).toEqual({ name: "Home" });
    expect(navigate("/import/", "Import", { requiresAuth: true })).toBe(true);
    expect(navigate("/suggest", "Suggest", { requiresRole: "babyUser" })).toBe(true);
    expect(navigate("/login", "Login")).toBe(true);
  });
});
