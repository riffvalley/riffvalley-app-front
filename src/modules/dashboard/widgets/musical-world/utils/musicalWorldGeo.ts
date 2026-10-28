import type { RatesGeographyCountryDto } from "@services/rates/rates";

export interface WorldGeometryProperties {
  isoCode: string | null;
  name: string;
}

export interface CountryMatchResult {
  represented: RatesGeographyCountryDto[];
  unrepresented: RatesGeographyCountryDto[];
  ambiguousCodes: string[];
}

export function normalizeCountryCode(code: string): string | null {
  const normalized = code.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

export function matchCountriesToGeometry(
  countries: RatesGeographyCountryDto[],
  featureCodes: Array<string | null>,
): CountryMatchResult {
  const geometryCounts = new Map<string, number>();
  for (const code of featureCodes) {
    const normalized = code ? normalizeCountryCode(code) : null;
    if (normalized) geometryCounts.set(normalized, (geometryCounts.get(normalized) ?? 0) + 1);
  }

  const countryCounts = new Map<string, number>();
  for (const country of countries) {
    const normalized = normalizeCountryCode(country.isoCode);
    if (normalized) countryCounts.set(normalized, (countryCounts.get(normalized) ?? 0) + 1);
  }
  const represented: RatesGeographyCountryDto[] = [];
  const unrepresented: RatesGeographyCountryDto[] = [];
  const ambiguous = new Set<string>();
  for (const country of countries) {
    const normalized = normalizeCountryCode(country.isoCode);
    const featureOccurrences = normalized ? geometryCounts.get(normalized) ?? 0 : 0;
    const countryOccurrences = normalized ? countryCounts.get(normalized) ?? 0 : 0;
    if (featureOccurrences === 1 && countryOccurrences === 1) represented.push(country);
    else {
      unrepresented.push(country);
      if (normalized && (featureOccurrences > 1 || countryOccurrences > 1)) ambiguous.add(normalized);
    }
  }
  const ambiguousCodes = [...ambiguous];
  return { represented, unrepresented, ambiguousCodes };
}

export interface CountBand {
  min: number;
  max: number;
  colorIndex: number;
}

export function createCountBands(counts: number[], maxBands = 5): CountBand[] {
  const distinct = [...new Set(counts.filter((count) => Number.isFinite(count) && count > 0))].sort((a, b) => a - b);
  if (!distinct.length) return [];
  const bandCount = Math.min(maxBands, distinct.length);
  const bands: CountBand[] = [];
  for (let bandIndex = 0; bandIndex < bandCount; bandIndex += 1) {
    const start = Math.floor((bandIndex * distinct.length) / bandCount);
    const end = Math.floor(((bandIndex + 1) * distinct.length) / bandCount);
    bands.push({ min: distinct[start], max: distinct[end - 1], colorIndex: bandIndex });
  }
  return bands;
}

export function colorIndexForCount(count: number, bands: CountBand[]): number {
  if (count <= 0 || bands.length === 0) return -1;
  return bands.find((band) => count >= band.min && count <= band.max)?.colorIndex ?? -1;
}
