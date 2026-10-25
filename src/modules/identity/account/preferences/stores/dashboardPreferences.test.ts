// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useDashboardPreferencesStore } from "./dashboardPreferences";

describe("dashboard preferences store with restricted storage", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes with defaults when localStorage reads throw", () => {
    const getItem = vi.spyOn(localStorage, "getItem").mockImplementation(() => {
      throw new DOMException("Storage is blocked", "SecurityError");
    });

    expect(() => useDashboardPreferencesStore()).not.toThrow();

    const store = useDashboardPreferencesStore();
    expect(store.dashboardButtonsEnabled).toBe(false);
    expect(store.dashboardConfig).toBeNull();
    expect(store.mobileDashboardConfig).toBeNull();
    expect(getItem).toHaveBeenCalledTimes(3);
  });

  it("applies session preferences in Pinia when writes throw and persists again when storage recovers", () => {
    const store = useDashboardPreferencesStore();
    const setItem = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new DOMException("Storage is blocked", "SecurityError");
    });
    const dashboardConfig = [{ id: "novedades", enabled: false }];
    const mobileDashboardConfig = [{ id: "comunidad", enabled: false }];

    expect(() => store.applySessionPreferences({
      dashboardButtonsEnabled: true,
      dashboardConfig,
      mobileDashboardConfig,
    })).not.toThrow();

    expect(store.dashboardButtonsEnabled).toBe(true);
    expect(store.dashboardConfig).toEqual(dashboardConfig);
    expect(store.mobileDashboardConfig).toEqual(mobileDashboardConfig);
    expect(setItem.mock.calls.map(([key]) => key)).toEqual([
      "dashboardButtonsEnabled",
      "dashboardConfig",
      "mobileDashboardConfig",
    ]);

    vi.restoreAllMocks();
    store.setDashboardButtonsEnabled(false);
    expect(localStorage.getItem("dashboardButtonsEnabled")).toBe("false");
  });

  it("keeps desktop and mobile edits in Pinia when writes and removals throw", () => {
    const store = useDashboardPreferencesStore();
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new DOMException("Storage is full", "QuotaExceededError");
    });
    const removeItem = vi.spyOn(localStorage, "removeItem").mockImplementation(() => {
      throw new DOMException("Storage is blocked", "SecurityError");
    });
    const desktop = [{ id: "novedades", enabled: false }];
    const mobile = [{ id: "comunidad", enabled: false }];

    expect(() => store.setDashboardConfig(desktop)).not.toThrow();
    expect(() => store.setMobileDashboardConfig(mobile)).not.toThrow();
    expect(() => store.setDashboardConfig(null)).not.toThrow();
    expect(() => store.setMobileDashboardConfig(null)).not.toThrow();

    expect(store.dashboardConfig).toBeNull();
    expect(store.mobileDashboardConfig).toBeNull();
    expect(removeItem.mock.calls.map(([key]) => key)).toEqual([
      "dashboardConfig",
      "mobileDashboardConfig",
    ]);
  });
});
