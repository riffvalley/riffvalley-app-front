import { describe, expect, it } from "vitest";
import {
  getBrowserIanaTimeZone,
  isValidActivityDate,
  isValidActivityDateFilter,
} from "./activityDateFilter";

describe("activityDateFilter", () => {
  it("accepts only real calendar dates in YYYY-MM-DD form", () => {
    expect(isValidActivityDate("2024-02-29")).toBe(true);
    expect(isValidActivityDate("2025-02-29")).toBe(false);
    expect(isValidActivityDate("2026-13-01")).toBe(false);
    expect(isValidActivityDate("2026-1-01")).toBe(false);
    expect(isValidActivityDate("2026-01-01T00:00:00Z")).toBe(false);
  });

  it("accepts all dates, a valid day, and ordered inclusive ranges", () => {
    expect(isValidActivityDateFilter({ mode: "all" })).toBe(true);
    expect(isValidActivityDateFilter({ mode: "day", date: "2026-10-29" })).toBe(true);
    expect(isValidActivityDateFilter({ mode: "range", from: "2026-10-01", to: "2026-10-01" })).toBe(true);
    expect(isValidActivityDateFilter({ mode: "range", from: "2026-10-02", to: "2026-10-01" })).toBe(false);
    expect(isValidActivityDateFilter({ mode: "range", from: "", to: "2026-10-01" })).toBe(false);
  });

  it("returns a valid browser IANA time zone without inventing a fallback", () => {
    expect(getBrowserIanaTimeZone()).toMatch(/^[A-Za-z_+-]+(?:\/[A-Za-z_+-]+)*$/);
  });
});
