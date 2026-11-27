export const feedbackCategories = [
  { id: "albums", label: "Discos" },
  { id: "artists", label: "Artistas" },
  { id: "votes", label: "Votaciones" },
  { id: "statistics", label: "Estadísticas" },
  { id: "rankings", label: "Rankings" },
  { id: "events", label: "Conciertos y festivales" },
  { id: "home", label: "Inicio" },
  { id: "account", label: "Perfil y cuenta" },
  { id: "other", label: "General / Otros" },
] as const;

export type FeedbackCategoryId = (typeof feedbackCategories)[number]["id"];
export type FeedbackCategoryFilter = FeedbackCategoryId | "uncategorized";

const categoryLabels: Record<FeedbackCategoryId, string> = Object.fromEntries(
  feedbackCategories.map(({ id, label }) => [id, label])
) as Record<FeedbackCategoryId, string>;

export function feedbackCategoryLabel(category: FeedbackCategoryId | null): string {
  return category === null ? "Sin categorizar" : categoryLabels[category];
}
