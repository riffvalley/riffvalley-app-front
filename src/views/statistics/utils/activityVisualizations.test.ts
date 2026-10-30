import { describe, expect, it } from "vitest";
import {
  buildActivityCalendar,
  buildGenreActivity,
  buildMonthlyActivity,
  formatCivilDate,
  totalActivity,
} from "./activityVisualizations";

describe("statistics activity visualizations", () => {
  it("builds January to December, preserves zero months, excludes other years and matches annual total", () => {
    const months = buildMonthlyActivity(2025, [
      { month: "2025-12", activityCount: 4, topDisc: null },
      { month: "2024-01", activityCount: 90, topDisc: null },
      { month: "2025-02", activityCount: 2, topDisc: null },
    ]);

    expect(months).toHaveLength(12);
    expect(months.map(({ month }) => month)).toEqual(Array.from({ length: 12 }, (_, index) => index + 1));
    expect(months[0]?.count).toBe(0);
    expect(months[1]?.count).toBe(2);
    expect(months[11]?.count).toBe(4);
    expect(months[2]?.topDisc).toBeNull();
    expect(totalActivity(months.map(({ count }) => count))).toBe(6);
    expect(buildMonthlyActivity(2026, [{ month: "2025-02", activityCount: 2, topDisc: null }])[1]?.count).toBe(0);
  });

  it("builds a normal calendar year, fills empty days with no discs, and preserves daily disc details", () => {
    const discs = [
      { discId: "disc-1", title: "Album", artist: null, rate: null, date: "2025-01-02" },
      { discId: "disc-2", title: "Another album", artist: "Artist", rate: 8, date: "2025-01-02" },
    ];
    const weeks = buildActivityCalendar(2025, [
      { date: "2025-01-02", activityCount: 2, discs },
      { date: "2024-01-02", activityCount: 100, discs: [] },
    ]);
    const days = weeks.flat().filter((day) => day !== null);

    expect(days).toHaveLength(365);
    expect(days[0]).toEqual({ date: "2025-01-01", activityCount: 0, discs: [] });
    expect(days[1]).toEqual({ date: "2025-01-02", activityCount: 2, discs });
    expect(days.at(-1)?.date).toBe("2025-12-31");
    expect(totalActivity(days.map(({ activityCount }) => activityCount))).toBe(2);
  });

  it("includes February 29 and keeps civil dates stable in formatted output", () => {
    const weeks = buildActivityCalendar(2024, [{ date: "2024-02-29", activityCount: 2, discs: [] }]);
    const days = weeks.flat().filter((day) => day !== null);

    expect(days).toHaveLength(366);
    expect(days.find(({ date }) => date === "2024-02-29")).toEqual({ date: "2024-02-29", activityCount: 2, discs: [] });
    expect(formatCivilDate("2024-02-29")).toContain("29 de febrero de 2024");
  });

  it("sorts genre rows by count and then deterministically by label, including zero and unassigned activity", () => {
    const genres = buildGenreActivity([
      { genre: "Rock", activityCount: 5, topDisc: null },
      { genre: "Ambient", activityCount: 0, topDisc: null },
      { genre: "Jazz", activityCount: 5, topDisc: null },
    ], 2);

    expect(genres).toEqual([
      { label: "Jazz", count: 5, topDisc: null },
      { label: "Rock", count: 5, topDisc: null },
      { label: "Sin género", count: 2, topDisc: null },
      { label: "Ambient", count: 0, topDisc: null },
    ]);
    expect(totalActivity(genres.map(({ count }) => count))).toBe(12);
  });

  it("returns an empty genre breakdown when neither genres nor unassigned activity exist", () => {
    expect(buildGenreActivity([], 0)).toEqual([]);
    expect(buildGenreActivity([], 1)).toEqual([{ label: "Sin género", count: 1, topDisc: null }]);
    expect(buildGenreActivity([{ genre: "Rock alternativo y post-hardcore", activityCount: 1, topDisc: null }], 0)[0]?.label)
      .toBe("Rock alternativo y post-hardcore");
  });
});
