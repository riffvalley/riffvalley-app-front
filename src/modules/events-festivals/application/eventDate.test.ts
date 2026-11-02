import { describe, expect, it } from "vitest";
import { formatCalendarDate, parseCalendarDate } from "./eventDate";

describe("event calendar dates", () => {
  it.each([
    ["3/2/2026", "2026-02-03", "03/02/2026"],
    ["03/02/2026", "2026-02-03", "03/02/2026"],
    ["12/11/2026", "2026-11-12", "12/11/2026"],
    ["29/02/2028", "2028-02-29", "29/02/2028"],
  ])("parses %s as %s without a Date or timezone conversion", (input, normalized, display) => {
    expect(parseCalendarDate(input)).toBe(normalized);
    expect(formatCalendarDate(normalized!)).toBe(display);
  });

  it.each(["29/02/2026", "31/04/2026", "12/13/2026", "1/1/26", "2026-02-03"])(
    "rejects impossible or non-Spanish dates: %s",
    (input) => {
      expect(parseCalendarDate(input)).toBeNull();
    }
  );
});
