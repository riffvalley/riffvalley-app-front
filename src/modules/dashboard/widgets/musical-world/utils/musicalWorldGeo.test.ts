import { describe, expect, it } from "vitest";
import type { RatesGeographyCountryDto } from "@services/rates/rates";
import geometryData from "../assets/world-countries-110m.min.json";
import { colorIndexForCount, createCountBands, matchCountriesToGeometry, normalizeCountryCode } from "./musicalWorldGeo";

const country = (isoCode: string, count: number): RatesGeographyCountryDto => ({
  isoCode, name: `Country ${isoCode}`, count, percentage: 0,
});

describe("musical world geography helpers", () => {
  it("normalizes valid two-letter ISO codes and rejects invalid codes", () => {
    expect(normalizeCountryCode(" es ")).toBe("ES");
    expect(normalizeCountryCode("-99")).toBeNull();
    expect(normalizeCountryCode("ESP")).toBeNull();
    expect(normalizeCountryCode("España")).toBeNull();
  });

  it("matches only exact codes and returns geometry gaps without guessing by name", () => {
    const result = matchCountriesToGeometry([country("FR", 9), country("ZZ", 3), country("-99", 2)], ["FR", null]);
    expect(result.represented.map(({ isoCode }) => isoCode)).toEqual(["FR"]);
    expect(result.unrepresented.map(({ isoCode }) => isoCode)).toEqual(["ZZ", "-99"]);
  });

  it("keeps duplicate service codes unrepresented instead of choosing one arbitrarily", () => {
    const result = matchCountriesToGeometry([country("FR", 9), country("FR", 2)], ["FR"]);
    expect(result.represented).toEqual([]);
    expect(result.unrepresented).toHaveLength(2);
    expect(result.ambiguousCodes).toEqual(["FR"]);
  });

  it("marks duplicate geometry codes ambiguous rather than assigning to an arbitrary territory", () => {
    const result = matchCountriesToGeometry([country("FR", 9)], ["FR", "fr"]);
    expect(result.represented).toEqual([]);
    expect(result.unrepresented).toHaveLength(1);
    expect(result.ambiguousCodes).toEqual(["FR"]);
  });

  it("uses deterministic discrete bands with truthful count ranges and handles dominant distributions", () => {
    const bands = createCountBands([100, 1, 1, 4, 12, 0]);
    expect(bands).toEqual([
      { min: 1, max: 1, colorIndex: 0 },
      { min: 4, max: 4, colorIndex: 1 },
      { min: 12, max: 12, colorIndex: 2 },
      { min: 100, max: 100, colorIndex: 3 },
    ]);
    expect(colorIndexForCount(100, bands)).toBe(3);
    expect(colorIndexForCount(0, bands)).toBe(-1);
    expect(createCountBands([0])).toEqual([]);
  });

  it("ships a local geometry resource with verified unique two-letter codes and explicit uncoded features", () => {
    const features = geometryData.features as Array<{ properties: { isoCode: string | null; name: string } }>;
    const codes = features.map(({ properties }) => properties.isoCode).filter((code): code is string => code !== null);
    expect(features.length).toBe(177);
    expect(new Set(codes).size).toBe(codes.length);
    expect(features.filter(({ properties }) => properties.isoCode === null).map(({ properties }) => properties.name).sort())
      .toEqual(["N. Cyprus", "Somaliland"]);
    expect(codes).toContain("FR");
    expect(codes).toContain("NO");
    expect(codes).toContain("XK");
  });
});
