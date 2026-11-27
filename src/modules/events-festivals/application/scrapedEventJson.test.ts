import { describe, expect, it } from "vitest";
import sample from "./__fixtures__/scraped-events-v1.json?raw";
import malformed from "./__fixtures__/scraped-events-malformed.json?raw";
import unknownVersion from "./__fixtures__/scraped-events-unknown-version.json?raw";
import {
  parseScrapedEventJson,
  SCRAPED_EVENT_JSON_FORMAT,
  SCRAPED_EVENT_JSON_MAX_BYTES,
  ScrapedEventJsonError,
} from "./scrapedEventJson";

describe("parseScrapedEventJson", () => {
  it("parses concerts, multi-day festivals and ordered known/unknown artist names", () => {
    const document = parseScrapedEventJson(sample);
    expect(document.sourceName).toBe("Prosineck");
    expect(document.events[0]?.artists).toEqual(["Architects", "Spiritbox", "Banda Desconocida"]);
    expect(document.events[1]).toMatchObject({
      type: "festival",
      startDate: "2027-07-01",
      endDate: "2027-07-03",
    });
    expect(document.events[0]).toMatchObject({
      originalUrl: "https://example.test/events/123",
      externalId: "scraped-123",
      province: "Cantabria",
    });
    expect(document.events[0]?.issues).toEqual([]);
  });

  it("reports missing optional fields as empty without inventing values", () => {
    const event = parseScrapedEventJson(sample).events[2];
    expect(event).toMatchObject({ venue: "", price: "", additionalInfo: "", title: "" });
  });

  it("marks invalid dates and same-file duplicate rows for review and suppression", () => {
    const document = parseScrapedEventJson(sample);
    expect(document.events[3]?.issues.join(" ")).toContain("Fecha inicial inválida");
    expect(document.duplicateIndexes).toEqual([5]);
    expect(document.events[5]?.issues.join(" ")).toContain("Duplicado del evento 5");
  });

  it("keeps homonymous localities in different provinces distinct for file deduplication", () => {
    const document = parseScrapedEventJson(
      JSON.stringify({
        format: "riffvalley.events-import",
        version: 1,
        source: { name: "fixture" },
        country: "ES",
        events: [
          {
            type: "concert",
            title: "Same event",
            startDate: "2027-06-12",
            artists: ["Artist"],
            locality: "San Martín",
            province: "Sevilla",
          },
          {
            type: "concert",
            title: "Same event",
            startDate: "2027-06-12",
            artists: ["Artist"],
            locality: "San Martín",
            province: "Huesca",
          },
        ],
      })
    );

    expect(document.duplicateIndexes).toEqual([]);
  });

  it("rejects malformed JSON, unknown versions and unexpected formats", () => {
    expect(() => parseScrapedEventJson(malformed)).toThrow(ScrapedEventJsonError);
    expect(() => parseScrapedEventJson(unknownVersion)).toThrow("Versión JSON no compatible");
    expect(() => parseScrapedEventJson(JSON.stringify({ format: "other", version: 1 }))).toThrow(
      SCRAPED_EVENT_JSON_FORMAT
    );
  });

  it("explains when a valid JSON document has no events", () => {
    expect(() =>
      parseScrapedEventJson(
        JSON.stringify({
          format: SCRAPED_EVENT_JSON_FORMAT,
          version: 1,
          source: { name: "fixture" },
          country: "ES",
          events: [],
        })
      )
    ).toThrow("no contiene eventos");
  });

  it("publishes the enforced 2 MiB file limit", () => {
    expect(SCRAPED_EVENT_JSON_MAX_BYTES).toBe(2 * 1024 * 1024);
  });
});
