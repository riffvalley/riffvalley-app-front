import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
const { login, updateUserStore } = vi.hoisted(() => ({ login: vi.fn(), updateUserStore: vi.fn() }));
vi.mock("../../src/modules/identity/infrastructure/loginApi", () => ({ login }));
vi.mock("../../src/stores/user/users", () => ({ useUserStore: () => ({ updateUserStore }) }));
vi.mock("../../src/services/swal/SwalService", () => ({ default: { success: vi.fn(), error: vi.fn() } }));
import { useAuthStore } from "../../src/app/dependencies/identity";
import { useWorkspaceStore } from "../../src/app/dependencies/workspace";
import { useDashboardConfig } from "../../src/composables/useDashboardConfig";

const values = new Map<string, string>();
const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value); },
  removeItem: (key: string) => { values.delete(key); },
};

describe("workspace preference compatibility", () => {
  beforeEach(() => {
    values.clear(); vi.stubGlobal("localStorage", storage);
    setActivePinia(createPinia()); login.mockReset();
    updateUserStore.mockReset().mockResolvedValue({});
  });
  it("restores desktop/mobile independently, without putting preferences in identity", () => {
    storage.setItem("dashboardButtonsEnabled", "true");
    storage.setItem("dashboardConfig", '[{"id":"artistas","enabled":false}]');
    storage.setItem("mobileDashboardConfig", "[]");
    const workspace = useWorkspaceStore();
    expect(workspace.dashboardButtonsEnabled).toBe(true);
    expect(workspace.dashboardConfig).toEqual([{ id: "artistas", enabled: false }]);
    expect(workspace.mobileDashboardConfig).toEqual([]);
    expect(useAuthStore().$state).not.toHaveProperty("dashboardConfig");
    workspace.setDashboardButtonsEnabled(false);
    workspace.setMobileDashboardConfig([{ id: "aventura", enabled: false }]);
    expect(storage.getItem("dashboardButtonsEnabled")).toBe("false");
    expect(storage.getItem("mobileDashboardConfig")).toBe('[{"id":"aventura","enabled":false}]');
  });
  it("initializes missing login preferences to the same defaults and clears them on logout", async () => {
    useWorkspaceStore().setDashboardButtonsEnabled(true);
    login.mockResolvedValue({ id: "7", username: "ana", token: "token" });
    await useAuthStore().login({ username: "ana", password: "secret" });
    expect(useWorkspaceStore().$state).toEqual({ dashboardButtonsEnabled: false, dashboardConfig: null, mobileDashboardConfig: null });
    expect(storage.getItem("dashboardConfig")).toBe("null");
    expect(storage.getItem("roles")).toBe("[]");
    useAuthStore().logout();
    expect(values.size).toBe(0);
  });
  it.each(["null", "{}", "broken"])("restores unusable dashboard config %s as null", (raw) => {
    storage.setItem("dashboardConfig", raw);
    expect(useWorkspaceStore().dashboardConfig).toBeNull();
  });
  it("migrates rv_dashboard_config only for desktop and preserves reset payload []", () => {
    storage.setItem("rv_dashboard_config", '[{"id":"artistas","enabled":false}]');
    const mobile = useDashboardConfig("mobile");
    expect(mobile.isEnabled("artistas")).toBe(true);
    expect(storage.getItem("rv_dashboard_config")).not.toBeNull();
    const desktop = useDashboardConfig();
    expect(desktop.isEnabled("artistas")).toBe(false);
    expect(desktop.orderOf("artistas")).toBe(0);
    expect(storage.getItem("rv_dashboard_config")).toBeNull();
    expect(updateUserStore).toHaveBeenCalledWith({ dashboardConfig: expect.arrayContaining([{ id: "artistas", enabled: false }]) });
    desktop.resetToDefault();
    expect(storage.getItem("dashboardConfig")).toBe("[]");
    expect(updateUserStore).toHaveBeenLastCalledWith({ dashboardConfig: [] });
    expect(desktop.isEnabled("artistas")).toBe(true);
  });
  it("does not override a persisted dashboard with the old local-only config", () => {
    storage.setItem("dashboardConfig", '[{"id":"artistas","enabled":true}]');
    storage.setItem("rv_dashboard_config", '[{"id":"artistas","enabled":false}]');
    expect(useDashboardConfig().isEnabled("artistas")).toBe(true);
    expect(updateUserStore).not.toHaveBeenCalled();
    expect(storage.getItem("rv_dashboard_config")).not.toBeNull();
  });
});
