import { describe, expect, it } from "vitest";
import type { EventImportRow } from "./useEventImportRows";
import type { ScrapedEventJsonDocument } from "./scrapedEventJson";
import {
  buildEventImportReviewEntries,
  filterEventImportReviewEntries,
  normalizeEventReviewSearch,
} from "./eventImportReview";

function event(title: string, overrides: Record<string, unknown> = {}) {
  return {
    type: "concert",
    title,
    startDate: "2027-06-12",
    endDate: "",
    artists: ["Artista Ácido"],
    venue: "Sala Central",
    locality: "Santander",
    province: "Cantabria",
    region: "",
    country: "España",
    price: "",
    additionalInfo: "",
    originalUrl: "",
    externalId: "",
    issues: [],
    ...overrides,
  };
}

function row(id: string, title: string): EventImportRow {
  return {
    id,
    type: "concert",
    event: title,
    lineup: [{ key: `artist-${id}`, name: "Artista Ácido", artistId: null }],
    startDate: "2027-06-12",
    startDateDraft: "12/06/2027",
    endDate: null,
    endDateDraft: "",
    venue: { name: "Sala Central", venueId: null, localityId: null },
    price: "",
    otherInfo: "",
    city: "Santander",
    province: "Cantabria",
    administrativeRegionId: null,
  };
}

function review(
  events: ReturnType<typeof event>[],
  options: {
    duplicates?: number[];
    invalid?: string[];
    conflicts?: string[];
    prepared?: string[];
    rows?: EventImportRow[];
  } = {}
) {
  const document = {
    version: 2,
    sourceName: "fixture",
    country: "España",
    events,
    duplicateIndexes: options.duplicates ?? [],
  } as ScrapedEventJsonDocument;
  const rows = options.rows ?? events.map((item, index) => row(`row-${index}`, item.title));
  return buildEventImportReviewEntries({
    document,
    analyzedRowIds: Object.fromEntries(rows.map((item, index) => [index, item.id])),
    rows,
    preparedRowIds: new Set(options.prepared ?? []),
    invalidRowIds: new Set(options.invalid ?? []),
    conflictRowIds: new Set(options.conflicts ?? []),
  });
}

describe("event import review", () => {
  it("uses mutually exclusive categories with duplicate and validation priority", () => {
    const result = review(
      [
        event("Duplicate", { issues: ["Fecha inicial inválida"] }),
        event("Invalid"),
        event("Conflict"),
        event("Prepared"),
        event("Needs attention"),
      ],
      {
        duplicates: [0],
        invalid: ["row-1"],
        conflicts: ["row-2"],
        prepared: ["row-2", "row-3"],
      }
    );
    expect(result.entries.map(({ category }) => category)).toEqual([
      "duplicates",
      "invalid",
      "conflicts",
      "prepared",
      "needs-review",
    ]);
    expect(
      Object.values(result.counts)
        .slice(0, 5)
        .reduce((sum, count) => sum + count, 0)
    ).toBe(5);
  });

  it("searches artists, lineup, festival, locality, venue and date without accent sensitivity", () => {
    const result = review([
      event("Festival del Norte", { type: "festival", artists: ["Niño de Elche"] }),
    ]);
    for (const query of [
      "nino",
      "artista acido",
      "festival del norte",
      "santander",
      "sala central",
      "2027-06-12",
    ]) {
      expect(filterEventImportReviewEntries(result.entries, "all", query)).toHaveLength(1);
    }
    expect(normalizeEventReviewSearch("Árbol Ñandú")).toBe("arbol nandu");
  });

  it("combines search and category filters and recalculates after an edited row changes eligibility", () => {
    const initial = review([event("Evento A"), event("Evento B")], {
      prepared: ["row-0"],
    });
    expect(filterEventImportReviewEntries(initial.entries, "prepared", "evento a")).toHaveLength(1);
    expect(filterEventImportReviewEntries(initial.entries, "prepared", "evento b")).toHaveLength(0);
    const edited = review([event("Evento A"), event("Evento B")], {
      prepared: ["row-0", "row-1"],
    });
    expect(edited.entries[1]?.rowId).toBe(initial.entries[1]?.rowId);
    expect(filterEventImportReviewEntries(edited.entries, "prepared", "evento b")).toHaveLength(1);
  });

  it("handles a 600-event document while keeping counts exclusive", () => {
    const events = Array.from({ length: 600 }, (_, index) => event(`Evento ${index}`));
    const result = review(events, {
      prepared: Array.from({ length: 300 }, (_, index) => `row-${index}`),
      conflicts: ["row-300"],
      invalid: ["row-301"],
    });
    expect(result.entries).toHaveLength(600);
    expect(result.counts.all).toBe(600);
    expect(
      Object.values(result.counts)
        .slice(0, 5)
        .reduce((sum, count) => sum + count, 0)
    ).toBe(600);
  });
});
