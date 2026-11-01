import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@services/api/api", () => ({ default: api }));

import {
  getCurrentMonthlyLists,
  getCurrentWeeklyLists,
  getPastMonthlyLists,
  getPastWeeklyLists,
} from "./list";

describe("Radar and monthly list period requests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: [] });
  });

  it("loads current lists without period parameters", async () => {
    await getCurrentWeeklyLists();
    await getCurrentMonthlyLists();

    expect(api.get).toHaveBeenNthCalledWith(1, "/lists/weekly/current");
    expect(api.get).toHaveBeenNthCalledWith(2, "/lists/month/current");
  });

  it("sends the required numeric year and month in Radar path order", async () => {
    await getPastWeeklyLists(2026, 11);

    expect(api.get).toHaveBeenCalledWith("/lists/weekly/past/2026/11");
  });

  it("sends only the required numeric year for Mejores del Mes", async () => {
    await getPastMonthlyLists(2026);

    expect(api.get).toHaveBeenCalledWith("/lists/month/past/2026");
  });

  it.each([
    ["non-integer year", 2026.5, 11],
    ["year below the DTO minimum", 99, 11],
    ["year above the DTO maximum", 275760, 11],
    ["non-integer month", 2026, 1.5],
    ["month below the DTO minimum", 2026, 0],
    ["month above the DTO maximum", 2026, 13],
    ["undefined year", undefined, 11],
    ["null year", null, 11],
    ["empty string year", "", 11],
    ["undefined month", 2026, undefined],
    ["null month", 2026, null],
    ["empty string month", 2026, ""],
  ] as const)("rejects %s before making a Radar request", async (_case, year, month) => {
    await expect(getPastWeeklyLists(year as number, month as number)).rejects.toThrow(RangeError);
    expect(api.get).not.toHaveBeenCalled();
  });

  it.each([
    ["non-integer year", 2026.5],
    ["year below the DTO minimum", 99],
    ["year above the DTO maximum", 275760],
    ["undefined year", undefined],
    ["null year", null],
    ["empty string year", ""],
  ] as const)("rejects %s before making a monthly request", async (_case, year) => {
    await expect(getPastMonthlyLists(year as number)).rejects.toThrow(RangeError);
    expect(api.get).not.toHaveBeenCalled();
  });
});
