import { describe, expect, it } from "vitest";
import type { ListSummary } from "@services/list/list";
import { classifyRadarLists } from "./radarListClassification";

describe("Radar current and future classification", () => {
  it("keeps lists through the next two Friday releases as current", () => {
    const lists: ListSummary[] = [
      { id: "open", name: "Abierta", type: "week", listDate: "2026-11-02" },
      { id: "next-friday", name: "Viernes próximo", type: "week", listDate: "2026-11-13" },
      { id: "later", name: "Más adelante", type: "week", listDate: "2026-11-14" },
    ];

    expect(classifyRadarLists(lists, new Date(2026, 10, 6))).toEqual({
      current: lists.slice(0, 2),
      future: lists.slice(2),
    });
  });

  it("uses releaseDate when listDate is absent and keeps undated lists in current", () => {
    const releaseDated: ListSummary = {
      id: "release-date",
      name: "Usa releaseDate",
      type: "week",
      releaseDate: "2026-11-14",
    };
    const undated: ListSummary = { id: "undated", name: "Sin fecha", type: "week" };

    expect(classifyRadarLists([releaseDated, undated], new Date(2026, 10, 6))).toEqual({
      current: [undated],
      future: [releaseDated],
    });
  });
});
