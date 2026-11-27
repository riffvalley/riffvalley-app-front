import { describe, expect, it } from "vitest";
import { feedbackCategories, feedbackCategoryLabel } from "./categories";

describe("Feedback category catalog", () => {
  it("keeps the backend identifiers and labels in one typed catalog", () => {
    expect(feedbackCategories).toEqual([
      { id: "albums", label: "Discos" },
      { id: "artists", label: "Artistas" },
      { id: "votes", label: "Votaciones" },
      { id: "statistics", label: "Estadísticas" },
      { id: "rankings", label: "Rankings" },
      { id: "events", label: "Conciertos y festivales" },
      { id: "home", label: "Inicio" },
      { id: "account", label: "Perfil y cuenta" },
      { id: "other", label: "General / Otros" },
    ]);
  });

  it("keeps valid other distinct from the uncategorized filter and historical null", () => {
    expect(feedbackCategoryLabel("other")).toBe("General / Otros");
    expect(feedbackCategoryLabel(null)).toBe("Sin categorizar");
    expect(feedbackCategories.some(({ id }) => id === "uncategorized")).toBe(false);
  });
});
