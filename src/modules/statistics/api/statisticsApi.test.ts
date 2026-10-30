import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@services/api/api", () => ({ default: api }));

import { getStatisticsRatedDiscs, getStatisticsSummary } from "./statisticsApi";
import type { StatisticsSummary } from "../types/statistics";

describe("statistics HTTP contracts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests the annual summary with required year, timezone and cancellation", async () => {
    const controller = new AbortController();
    const summary = { mean: null, topDiscOverall: null } as StatisticsSummary;
    api.get.mockResolvedValue({ data: summary });

    await expect(getStatisticsSummary({ year: 2026, timeZone: "Europe/Madrid" }, controller.signal))
      .resolves.toBe(summary);
    expect(api.get).toHaveBeenCalledWith("/rates/stats", {
      params: { year: 2026, timeZone: "Europe/Madrid" },
      signal: controller.signal,
    });
  });

  it("requests the dedicated galaxy endpoint and preserves nullable relations", async () => {
    const discs = [{ id: "disc-1", name: "Release", rate: 8, artist: null, genre: null }];
    api.get.mockResolvedValue({ data: discs });

    await expect(getStatisticsRatedDiscs({ year: 2025, timeZone: "UTC" })).resolves.toBe(discs);
    expect(api.get).toHaveBeenCalledWith("/rates/stats/discs", {
      params: { year: 2025, timeZone: "UTC" },
      signal: undefined,
    });
  });

  it("rejects invalid years and zones before sending a request", async () => {
    await expect(getStatisticsSummary({ year: 2024, timeZone: "UTC" })).rejects.toThrow(RangeError);
    await expect(getStatisticsSummary({ year: new Date().getUTCFullYear() + 1, timeZone: "UTC" })).rejects.toThrow(RangeError);
    await expect(getStatisticsRatedDiscs({ year: 2026, timeZone: "not-a-zone" })).rejects.toThrow(RangeError);
    expect(api.get).not.toHaveBeenCalled();
  });

  it("propagates HTTP errors unchanged", async () => {
    const error = Object.assign(new Error("request failed"), { response: { status: 503 } });
    api.get.mockRejectedValue(error);
    await expect(getStatisticsSummary({ year: 2026, timeZone: "UTC" })).rejects.toBe(error);
  });
});
