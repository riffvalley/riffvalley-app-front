import { describe, expect, it } from "vitest";
import { getEditorialWeekRange, groupDiscsByEditorialDay } from "./editorialWeek";

describe("editorial week civil dates", () => {
  it("calculates an ordinary Monday-to-Sunday week", () => {
    const week = getEditorialWeekRange("2026-11-06T00:00:00.000Z");

    expect(week?.start.isoDate).toBe("2026-11-02");
    expect(week?.end.isoDate).toBe("2026-11-08");
    expect(week?.days.map((day) => day.label)).toEqual([
      "Lunes 02-11",
      "Martes 03-11",
      "Miércoles 04-11",
      "Jueves 05-11",
      "Viernes 06-11",
      "Sábado 07-11",
      "Domingo 08-11",
    ]);
  });

  it("keeps weeks that cross a month in chronological order", () => {
    const week = getEditorialWeekRange("2026-10-31");

    expect(week?.days.map((day) => day.isoDate)).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
    ]);
  });

  it("keeps weeks that cross December and January", () => {
    const week = getEditorialWeekRange("2027-01-01");

    expect(week?.start.isoDate).toBe("2026-12-28");
    expect(week?.end.isoDate).toBe("2027-01-03");
  });

  it("calculates dates around ISO week 1, week 52, and a valid week 53", () => {
    expect(getEditorialWeekRange("2021-01-04")?.start.isoDate).toBe("2021-01-04");
    expect(getEditorialWeekRange("2021-12-31")?.start.isoDate).toBe("2021-12-27");
    expect(getEditorialWeekRange("2020-12-31")?.start.isoDate).toBe("2020-12-28");
    expect(getEditorialWeekRange("2020-12-31")?.end.isoDate).toBe("2021-01-03");
  });

  it("does not change the week across Madrid daylight-saving transitions", () => {
    expect(getEditorialWeekRange("2026-03-29")?.start.isoDate).toBe("2026-03-23");
    expect(getEditorialWeekRange("2026-03-29")?.end.isoDate).toBe("2026-03-29");
    expect(getEditorialWeekRange("2026-10-25")?.start.isoDate).toBe("2026-10-19");
    expect(getEditorialWeekRange("2026-10-25")?.end.isoDate).toBe("2026-10-25");
  });

  it("returns all seven days and groups by each disc's own release date", () => {
    const week = getEditorialWeekRange("2026-11-06")!;
    const discs = [
      { id: "friday-a", releaseDate: "2026-11-06T00:00:00.000Z" },
      { id: "friday-b", releaseDate: "2026-11-06" },
      { id: "monday", releaseDate: "2026-11-02" },
      { id: "sunday", releaseDate: "2026-11-08T23:59:59.999Z" },
      { id: "outside", releaseDate: "2026-11-09" },
    ];
    const grouped = groupDiscsByEditorialDay(discs, week.days);

    expect(grouped).toHaveLength(7);
    expect(grouped.map(({ day }) => day.label)).toEqual(week.days.map(({ label }) => label));
    expect(
      grouped.find(({ day }) => day.isoDate === "2026-11-02")?.discs.map(({ id }) => id)
    ).toEqual(["monday"]);
    expect(
      grouped.find(({ day }) => day.isoDate === "2026-11-06")?.discs.map(({ id }) => id)
    ).toEqual(["friday-a", "friday-b"]);
    expect(grouped.find(({ day }) => day.isoDate === "2026-11-04")?.discs).toEqual([]);
    expect(
      grouped.find(({ day }) => day.isoDate === "2026-11-08")?.discs.map(({ id }) => id)
    ).toEqual(["sunday"]);
    expect(grouped.flatMap(({ discs: dayDiscs }) => dayDiscs)).toHaveLength(4);
  });

  it("rejects invalid civil dates instead of assigning them to a day", () => {
    expect(getEditorialWeekRange("2026-02-30")).toBeNull();
  });
});
