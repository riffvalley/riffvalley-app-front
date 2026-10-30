import { afterEach, describe, expect, it, vi } from "vitest";
import { isValidStatisticsYear, MIN_STATISTICS_YEAR, useStatisticsFilters } from "./statisticsFilters";

describe("statistics year filters", () => {
  afterEach(() => vi.useRealTimers());

  it("starts at the current year in the browser IANA timezone and never before 2025", () => {
    const filters = useStatisticsFilters();
    const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const expectedYear = Number(new Intl.DateTimeFormat("en", {
      timeZone: browserTimeZone,
      calendar: "gregory",
      numberingSystem: "latn",
      year: "numeric",
    }).format(new Date()));

    expect(MIN_STATISTICS_YEAR).toBe(2025);
    expect(filters.year.value).toBe(Math.max(2025, expectedYear));
    expect(filters.timeZone.value).toBe(browserTimeZone);
  });

  it("accepts 2025 and the dynamic current year, and rejects years outside the range", () => {
    const filters = useStatisticsFilters();
    const originalYear = filters.year.value;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-01-01T00:30:00.000Z"));

    expect(filters.currentYear.value).toBe(2027);
    filters.setYear(2027);
    expect(filters.year.value).toBe(2027);
    expect(isValidStatisticsYear(2024, "UTC")).toBe(false);
    expect(isValidStatisticsYear(2025, "UTC")).toBe(true);
    expect(isValidStatisticsYear(2026, "UTC")).toBe(true);
    expect(isValidStatisticsYear(2027, "UTC")).toBe(true);
    expect(isValidStatisticsYear(2028, "UTC")).toBe(false);
    expect(isValidStatisticsYear(2027, "not/a-zone")).toBe(false);
    filters.setYear(originalYear);
  });

  it("changes the single shared selection and ignores a future year", () => {
    const filters = useStatisticsFilters();
    const originalYear = filters.year.value;
    filters.setYear(2025);
    expect(filters.year.value).toBe(2025);
    filters.setYear(2026);
    expect(filters.year.value).toBe(2026);
    filters.setYear(filters.currentYear.value + 1);
    expect(filters.year.value).toBe(2026);
    filters.setYear(originalYear);
  });
});
