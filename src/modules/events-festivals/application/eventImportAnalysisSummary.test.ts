import { describe, expect, it } from "vitest";
import { parseScrapedEventJson } from "./scrapedEventJson";
import { summarizeEventImportAnalysis } from "./eventImportAnalysisSummary";

function createDocument() {
  return parseScrapedEventJson(
    JSON.stringify({
      format: "riffvalley.events-import",
      version: 2,
      source: { name: "fixture" },
      country: "ES",
      events: [
        { type: "concert", title: "Ready", startDate: "2027-06-12", artists: ["A"], locality: "X" },
        {
          type: "festival",
          title: "Needs review",
          startDate: "2027-06-13",
          artists: ["B"],
          locality: "Y",
        },
        { type: "concert", title: "Ready", startDate: "2027-06-12", artists: ["A"], locality: "X" },
        {
          type: "unknown",
          title: "Unsupported",
          startDate: "2027-06-14",
          artists: ["C"],
          locality: "Z",
        },
        {
          type: "concert",
          title: "Already present",
          startDate: "2027-06-15",
          artists: ["D"],
          locality: "W",
        },
      ],
    })
  );
}

describe("summarizeEventImportAnalysis", () => {
  it("uses exclusive categories that sum to the file total and keeps resolution errors separate", () => {
    const counts = summarizeEventImportAnalysis(
      createDocument(),
      { 0: "row-ready", 1: "row-review" },
      new Set(["row-ready"]),
      2
    );

    expect(counts).toEqual({
      total: 5,
      prepared: 1,
      needsIntervention: 1,
      conflicts: 0,
      duplicates: 1,
      invalid: 1,
      alreadyInDraft: 1,
      resolutionErrors: 2,
    });
    expect(
      counts.prepared +
        counts.needsIntervention +
        counts.duplicates +
        counts.invalid +
        counts.alreadyInDraft
    ).toBe(counts.total);
    expect(counts).not.toHaveProperty("unchanged");
  });

  it("keeps validation errors and conflicts exclusive from intervention and prepared counts", () => {
    const counts = summarizeEventImportAnalysis(
      createDocument(),
      { 0: "row-ready", 1: "row-invalid", 4: "row-conflict" },
      new Set(["row-ready", "row-conflict"]),
      0,
      new Set(["row-invalid"]),
      new Set(["row-conflict"])
    );
    expect(counts).toMatchObject({
      total: 5,
      prepared: 1,
      needsIntervention: 0,
      conflicts: 1,
      invalid: 2,
      duplicates: 1,
      alreadyInDraft: 0,
    });
    expect(
      counts.prepared +
        counts.needsIntervention +
        counts.conflicts +
        counts.duplicates +
        counts.invalid +
        counts.alreadyInDraft
    ).toBe(counts.total);
  });

  it("counts a 585-row concert, festival and tour document as fully prepared despite 50-row snapshots", () => {
    const events = Array.from({ length: 585 }, (_, index) => {
      const type = index < 125 ? "concert" : index < 161 ? "festival" : "tour";
      return {
        type,
        ...(type === "concert" ? {} : { title: `Event ${index}` }),
        startDate: "2027-06-12",
        artists: [`Artist ${index}`],
        locality: "Madrid",
      };
    });
    const document = parseScrapedEventJson(
      JSON.stringify({
        format: "riffvalley.events-import",
        version: 2,
        source: { name: "concertsmetal" },
        country: "ES",
        events,
      })
    );
    const rowIds = Object.fromEntries(events.map((_, index) => [index, `row-${index}`]));
    const counts = summarizeEventImportAnalysis(
      document,
      rowIds,
      new Set(Object.values(rowIds)),
      0
    );

    expect(counts).toMatchObject({
      total: 585,
      prepared: 585,
      needsIntervention: 0,
      conflicts: 0,
      duplicates: 0,
      invalid: 0,
      alreadyInDraft: 0,
      resolutionErrors: 0,
    });
  });

  it("counts concert and festival event types from the actual file rows", () => {
    const document = createDocument();
    expect(document.events.filter(({ type }) => type === "concert")).toHaveLength(4);
    expect(document.events.filter(({ type }) => type === "festival")).toHaveLength(1);
  });
});
