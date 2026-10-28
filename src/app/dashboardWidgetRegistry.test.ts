import { describe, expect, it } from "vitest";
import {
  dashboardWidgetDefaults,
  dashboardWidgetIds,
  dashboardWidgetRegistry,
  isDashboardWidgetId,
  type DashboardWidgetId,
} from "./dashboardWidgetRegistry";

const expectedOrder: DashboardWidgetId[] = [
  "novedades",
  "comunidad",
  "discoAleatorio",
  "portadaDia",
  "top3mes",
  "top3semana",
  "artistas",
  "cementerio",
  "mundoMusical",
  "ultimosVotos",
  "aventura",
];

describe("dashboard widget registry", () => {
  it("keeps the eleven persisted IDs and default order", () => {
    const ids = dashboardWidgetRegistry.map(({ id }) => id);

    expect(ids).toEqual(expectedOrder);
    expect(new Set(ids).size).toBe(11);
    expect(Object.values(dashboardWidgetIds)).toEqual(expectedOrder);
    expect(dashboardWidgetRegistry.map(({ order }) => order)).toEqual(
      expectedOrder.map((_, order) => order),
    );
    expect(dashboardWidgetDefaults.map(({ id }) => id)).toEqual(expectedOrder);
  });

  it("preserves current labels, sizes, icons, and enabled defaults", () => {
    expect(dashboardWidgetDefaults.map(({ label, size, enabled }) => ({ label, size, enabled }))).toEqual([
      { label: "Novedades Riff Valley", size: "half", enabled: true },
      { label: "Comunidad / Top usuarios", size: "half", enabled: true },
      { label: "Disco aleatorio", size: "half", enabled: true },
      { label: "Portada del día", size: "half", enabled: true },
      { label: "Top 3 Mes actual", size: "full", enabled: true },
      { label: "Top 3 Semana actual", size: "full", enabled: true },
      { label: "Tus artistas favoritos", size: "full", enabled: true },
      { label: "Cementerio de discos", size: "half", enabled: true },
      { label: "Tu mundo musical", size: "half", enabled: true },
      { label: "Tus últimos 5 votos", size: "half", enabled: true },
      { label: "Crea tu propia aventura", size: "half", enabled: true },
    ]);
    expect(dashboardWidgetDefaults.every(({ icon }) => icon.startsWith("fa-solid "))).toBe(true);
  });

  it("recognizes registered IDs while leaving unknown saved IDs out of the registry", () => {
    expect(isDashboardWidgetId("novedades")).toBe(true);
    expect(isDashboardWidgetId("widget-futuro")).toBe(false);
  });

  it("keeps the fixed welcome banner outside the configurable registry", () => {
    expect(isDashboardWidgetId("welcome")).toBe(false);
    expect(dashboardWidgetRegistry.some(({ label }) => label.includes("Hola,"))).toBe(false);
  });
});
