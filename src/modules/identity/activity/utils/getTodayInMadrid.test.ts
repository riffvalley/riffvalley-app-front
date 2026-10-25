import { describe, expect, it } from "vitest";
import { getTodayInMadrid } from "./getTodayInMadrid";

describe("getTodayInMadrid", () => {
  it("uses the Madrid calendar date when it differs from UTC", () => {
    expect(getTodayInMadrid(new Date("2026-06-01T22:30:00.000Z"))).toBe("2026-06-02");
  });

  it("changes date at Madrid midnight, not UTC midnight", () => {
    expect(getTodayInMadrid(new Date("2026-01-15T22:59:59.000Z"))).toBe("2026-01-15");
    expect(getTodayInMadrid(new Date("2026-01-15T23:00:00.000Z"))).toBe("2026-01-16");
  });

  it("keeps the calendar date stable across the spring DST transition", () => {
    expect(getTodayInMadrid(new Date("2026-03-29T00:30:00.000Z"))).toBe("2026-03-29");
    expect(getTodayInMadrid(new Date("2026-03-29T01:30:00.000Z"))).toBe("2026-03-29");
    expect(getTodayInMadrid(new Date("2026-03-29T22:30:00.000Z"))).toBe("2026-03-30");
  });

  it("keeps the calendar date stable across the autumn DST transition", () => {
    expect(getTodayInMadrid(new Date("2026-10-25T00:30:00.000Z"))).toBe("2026-10-25");
    expect(getTodayInMadrid(new Date("2026-10-25T01:30:00.000Z"))).toBe("2026-10-25");
    expect(getTodayInMadrid(new Date("2026-10-25T23:30:00.000Z"))).toBe("2026-10-26");
  });
});
