import { describe, expect, it } from "vitest";
import {
  getDiscListCurrentWeekRange,
  getDiscListDateSelection,
  getDiscListMonthRange,
  getDiscListPeriodOptions,
  getDiscListQuickPeriodRange,
  isDiscListQuickPeriod,
} from "./discListDateFilters";

describe("disc list quick periods", () => {
  it("returns the Friday-to-Thursday release week that contains today", () => {
    // Jueves 26 nov 2026 → semana del viernes 20 al jueves 26.
    expect(getDiscListCurrentWeekRange(new Date(2026, 10, 26, 18))).toEqual([
      "2026-11-20T00:00:00.000Z",
      "2026-11-26T23:59:59.999Z",
    ]);
    // Viernes 27 nov 2026 → empieza una semana nueva.
    expect(getDiscListCurrentWeekRange(new Date(2026, 10, 27, 9))[0]).toBe("2026-11-27T00:00:00.000Z");
  });

  it("matches one of the week options of the period selector, even across months", () => {
    // Martes 1 dic 2026: la semana empezó el viernes 27 de noviembre.
    const range = getDiscListCurrentWeekRange(new Date(2026, 11, 1));
    const { year, month } = getDiscListDateSelection(range);
    expect({ year, month }).toEqual({ year: 2026, month: 11 });
    expect(getDiscListPeriodOptions(year, month).some((option) =>
      option.range.every((value, index) => value === range[index]),
    )).toBe(true);
  });

  it("maps «mes» to the whole current month", () => {
    expect(getDiscListQuickPeriodRange("mes", new Date(2026, 10, 26))).toEqual(getDiscListMonthRange(2026, 11));
  });

  it("maps «hoy» to today only", () => {
    expect(getDiscListQuickPeriodRange("hoy", new Date(2026, 10, 28, 23, 30))).toEqual([
      "2026-11-28T00:00:00.000Z",
      "2026-11-28T23:59:59.999Z",
    ]);
  });

  it("only accepts the supported URL values", () => {
    expect(isDiscListQuickPeriod("hoy")).toBe(true);
    expect(isDiscListQuickPeriod("semana")).toBe(true);
    expect(isDiscListQuickPeriod("mes")).toBe(true);
    expect(isDiscListQuickPeriod("año")).toBe(false);
    expect(isDiscListQuickPeriod(["semana"])).toBe(false);
  });
});
