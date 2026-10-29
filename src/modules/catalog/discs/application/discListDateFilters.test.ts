import { describe, expect, it } from "vitest";
import {
  getDiscListDateSelection,
  getDiscListMonthRange,
  getDiscListPeriodOptions,
  getDiscListYearRange,
} from "./discListDateFilters";

describe("disc list date filters", () => {
  it("maps all years, full years, and month ranges to their controlled selection", () => {
    expect(getDiscListDateSelection(null)).toEqual({ year: 0, month: 0 });
    expect(getDiscListDateSelection(getDiscListYearRange(2025))).toEqual({ year: 2025, month: 0 });
    expect(getDiscListDateSelection(getDiscListMonthRange(2025, 2))).toEqual({
      year: 2025,
      month: 2,
    });
  });

  it("retains Friday-to-Thursday week ranges, including the last week crossing a month", () => {
    const options = getDiscListPeriodOptions(2025, 2);
    expect(options[0]).toEqual({
      value: "M-2025-2",
      label: "Mes completo",
      range: ["2025-02-01T00:00:00.000Z", "2025-02-28T23:59:59.999Z"],
    });
    expect(options.slice(1).map(({ range }) => range)).toEqual([
      ["2025-02-07T00:00:00.000Z", "2025-02-13T23:59:59.999Z"],
      ["2025-02-14T00:00:00.000Z", "2025-02-20T23:59:59.999Z"],
      ["2025-02-21T00:00:00.000Z", "2025-02-27T23:59:59.999Z"],
      ["2025-02-28T00:00:00.000Z", "2025-03-06T23:59:59.999Z"],
    ]);
    expect(getDiscListPeriodOptions(0, 0)).toEqual([]);
  });
});
