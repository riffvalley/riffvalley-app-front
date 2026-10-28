export const dashboardWidgetRegistry = [
  {
    id: "novedades",
    label: "Novedades Riff Valley",
    icon: "fa-solid fa-newspaper",
    size: "half",
    enabledByDefault: true,
    order: 0,
  },
  {
    id: "comunidad",
    label: "Comunidad / Top usuarios",
    icon: "fa-solid fa-users",
    size: "half",
    enabledByDefault: true,
    order: 1,
  },
  {
    id: "discoAleatorio",
    label: "Disco aleatorio",
    icon: "fa-solid fa-shuffle",
    size: "half",
    enabledByDefault: true,
    order: 2,
  },
  {
    id: "portadaDia",
    label: "Portada del día",
    icon: "fa-solid fa-image",
    size: "half",
    enabledByDefault: true,
    order: 3,
  },
  {
    id: "top3mes",
    label: "Top 3 Mes actual",
    icon: "fa-solid fa-fire",
    size: "full",
    enabledByDefault: true,
    order: 4,
  },
  {
    id: "top3semana",
    label: "Top 3 Semana actual",
    icon: "fa-solid fa-fire",
    size: "full",
    enabledByDefault: true,
    order: 5,
  },
  {
    id: "artistas",
    label: "Tus artistas favoritos",
    icon: "fa-solid fa-heart",
    size: "full",
    enabledByDefault: true,
    order: 6,
  },
  {
    id: "cementerio",
    label: "Cementerio de discos",
    icon: "fa-solid fa-skull",
    size: "half",
    enabledByDefault: true,
    order: 7,
  },
  {
    id: "mundoMusical",
    label: "Tu mundo musical",
    icon: "fa-solid fa-earth-americas",
    size: "half",
    enabledByDefault: true,
    order: 8,
  },
  {
    id: "ultimosVotos",
    label: "Tus últimos 5 votos",
    icon: "fa-solid fa-clock-rotate-left",
    size: "half",
    enabledByDefault: true,
    order: 9,
  },
  {
    id: "aventura",
    label: "Crea tu propia aventura",
    icon: "fa-solid fa-book-open",
    size: "half",
    enabledByDefault: true,
    order: 10,
  },
] as const satisfies readonly {
  id: string;
  label: string;
  icon: string;
  size: "full" | "half";
  enabledByDefault: boolean;
  order: number;
}[];

export type DashboardWidgetDefinition = (typeof dashboardWidgetRegistry)[number];
export type DashboardWidgetId = DashboardWidgetDefinition["id"];
export type DashboardModule = Omit<DashboardWidgetDefinition, "enabledByDefault" | "order"> & {
  enabled: boolean;
};

export const dashboardWidgetIds = Object.fromEntries(
  dashboardWidgetRegistry.map(({ id }) => [id, id]),
) as { readonly [Id in DashboardWidgetId]: Id };

export function isDashboardWidgetId(id: string): id is DashboardWidgetId {
  return Object.hasOwn(dashboardWidgetIds, id);
}

export const dashboardWidgetDefaults: readonly DashboardModule[] = [...dashboardWidgetRegistry]
  .sort((left, right) => left.order - right.order)
  .map((widget) => ({
    id: widget.id,
    label: widget.label,
    icon: widget.icon,
    size: widget.size,
    enabled: widget.enabledByDefault,
  }));
