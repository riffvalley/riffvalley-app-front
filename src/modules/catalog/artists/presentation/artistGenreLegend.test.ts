import { describe, expect, it } from "vitest";
import { buildGenreLegend } from "./artistGenreLegend";

const g = (name: string, color: string) => ({ id: name, name, color });

describe("buildGenreLegend", () => {
  it("groups genres by color in the fixed block order, sorted by name", () => {
    const blocks = buildGenreLegend([
      g("Metalcore", "PaleVioletRed"),
      g("Death metal", "dimgray"),
      g("Black metal", "dimgray"),
    ]);

    expect(blocks.map((block) => block.label)).toEqual(["Metal extremo", "Metalcore y progresivo"]);
    expect(blocks[0].genres.map((genre) => genre.name)).toEqual(["Black metal", "Death metal"]);
    expect(blocks[1].color).toBe("PaleVioletRed");
  });

  it("skips the unknown genre and puts unmapped colors under Otros", () => {
    const blocks = buildGenreLegend([g("?", "DarkGray"), g("Ska", "orange")]);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ label: "Otros", color: "orange" });
  });
});
