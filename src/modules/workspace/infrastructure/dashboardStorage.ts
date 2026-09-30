import type { DashboardPersistence, DashboardModuleConfig } from "../application/dashboardPreferences";

export function createDashboardPersistence(getStorage: () => Pick<Storage, "getItem" | "setItem" | "removeItem">): DashboardPersistence {
  function readConfig(key: string): DashboardModuleConfig[] | null {
    const raw = getStorage().getItem(key);
    if (!raw) return null;
    try {
      const value: unknown = JSON.parse(raw);
      if (!Array.isArray(value)) return null;
      return value.filter((item): item is DashboardModuleConfig =>
        typeof item === "object" && item !== null && typeof item.id === "string" && typeof item.enabled === "boolean");
    } catch { return null; }
  }
  return {
    read: () => ({ dashboardButtonsEnabled: getStorage().getItem("dashboardButtonsEnabled") === "true",
      dashboardConfig: readConfig("dashboardConfig"), mobileDashboardConfig: readConfig("mobileDashboardConfig") }),
    writeButtons: (enabled) => getStorage().setItem("dashboardButtonsEnabled", String(enabled)),
    writeConfig: (key, config) => getStorage().setItem(key, JSON.stringify(config)),
    clear() {
      for (const key of ["dashboardButtonsEnabled", "dashboardConfig", "mobileDashboardConfig"]) getStorage().removeItem(key);
    },
  };
}
