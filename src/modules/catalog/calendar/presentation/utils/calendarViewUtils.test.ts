// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import {
  formatCalendarDate,
  scrollCalendarToTop,
  toggleCalendarGroup,
} from "./calendarViewUtils";

describe("calendar view utilities", () => {
  it("formats dates consistently in Spanish", () => {
    expect(formatCalendarDate("2026-10-29T12:00:00.000Z")).toBe(
      "29/10/2026, jueves"
    );
  });

  it("toggles only the requested group state", () => {
    const groupState: Record<number, boolean> = { 1: true };

    toggleCalendarGroup(groupState, 1);
    toggleCalendarGroup(groupState, 2);

    expect(groupState).toEqual({ 1: false, 2: true });
  });

  it("scrolls the nearest scrolling parent to the top", () => {
    const scrollTo = vi.fn();
    const parent = { scrollTop: 20, scrollTo, parentElement: null };
    const sentinel = { parentElement: parent } as unknown as HTMLElement;

    scrollCalendarToTop(sentinel);

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("falls back to the window when no scrolling parent exists", () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    scrollCalendarToTop(null);

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
    scrollTo.mockRestore();
  });
});
