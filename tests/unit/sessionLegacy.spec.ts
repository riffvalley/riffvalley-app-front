import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const { login } = vi.hoisted(() => ({ login: vi.fn() }));
vi.mock("../../src/modules/identity/infrastructure/loginApi", () => ({ login }));
import { useAuthStore } from "../../src/stores/auth/auth";

const values = new Map<string, string>();
const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value); },
  removeItem: (key: string) => { values.delete(key); },
};

describe("legacy session contract", () => {
  beforeEach(() => {
    values.clear();
    vi.stubGlobal("localStorage", storage);
    setActivePinia(createPinia());
    login.mockReset();
  });
  it.each(['["user","superUser"]', 'user, superUser'])('restores roles from %s', (roles) => {
    storage.setItem("roles", roles);
    storage.setItem("token", "old-token");
    storage.setItem("image", "");
    const store = useAuthStore();
    expect(store.roles).toEqual(["user", "superUser"]);
    expect(store.isAuthenticated).toBe(true);
    expect(store.avatarUrl).toBe("");
    expect(store.hasRole("superUser")).toBe(true);
  });
  it.each(['[broken', '{broken', '"user"'])('rejects malformed/non-array roles %s', (roles) => {
    storage.setItem("roles", roles);
    expect(useAuthStore().roles).toEqual([]);
  });
  it("logs in, persists the existing formats and clears only owned keys on logout", async () => {
    storage.setItem("theme", "dark");
    storage.setItem("rv_dashboard_config", "[]");
    login.mockResolvedValue({ id: "7", username: "ana", token: "token", roles: ["babyUser"],
      dashboardButtonsEnabled: true, dashboardConfig: [{ id: "artistas", enabled: false }] });
    const store = useAuthStore();
    await store.login({ username: "ana", password: "secret" });
    expect(store.loggedUser).toEqual({ id: "7", username: "ana" });
    expect(Object.fromEntries(values)).toMatchObject({ token: "token", userId: "7", username: "ana",
      image: "", roles: '["babyUser"]', dashboardButtonsEnabled: "true",
      dashboardConfig: '[{"id":"artistas","enabled":false}]', mobileDashboardConfig: "null" });
    store.setImage("avatar");
    expect(storage.getItem("image")).toBe("avatar");
    store.logout();
    expect(store.isAuthenticated).toBe(false);
    expect(Object.fromEntries(values)).toEqual({ theme: "dark", rv_dashboard_config: "[]" });
  });
  it("reports invalid credentials without overwriting session on ordinary failures", async () => {
    storage.setItem("token", "existing");
    login.mockRejectedValue(new Error("offline"));
    await expect(useAuthStore().login({ username: "ana", password: "bad" })).rejects.toThrow("Invalid credentials");
    expect(storage.getItem("token")).toBe("existing");
  });
});
