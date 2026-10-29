import { describe, expect, it } from "vitest";
import {
  appendDatedDiscGroups,
  useCalendarPagination,
} from "./calendarPagination";

describe("calendar pagination helpers", () => {
  it("merges pages into matching date groups without duplicating the group", () => {
    const groups = [
      { releaseDate: "2026-10-30", discs: ["disc-1"] },
      { releaseDate: "2026-10-31", discs: ["disc-2"] },
    ];

    appendDatedDiscGroups(groups, [
      { releaseDate: "2026-10-30", discs: ["disc-3"] },
      { releaseDate: "2026-11-01", discs: ["disc-4"] },
    ]);

    expect(groups).toEqual([
      { releaseDate: "2026-10-30", discs: ["disc-1", "disc-3"] },
      { releaseDate: "2026-10-31", discs: ["disc-2"] },
      { releaseDate: "2026-11-01", discs: ["disc-4"] },
    ]);
  });

  it("guards concurrent page loads and stops when the recorded offset reaches the total", () => {
    const pagination = useCalendarPagination(2);

    expect(pagination.beginPageLoad()).toBe(true);
    expect(pagination.beginPageLoad()).toBe(false);
    pagination.recordPage(5);
    expect(pagination.offset.value).toBe(2);
    expect(pagination.hasMore.value).toBe(true);

    pagination.finishPageLoad();
    expect(pagination.beginPageLoad()).toBe(true);
    pagination.recordPage(3);
    expect(pagination.offset.value).toBe(4);
    expect(pagination.hasMore.value).toBe(false);

    pagination.finishPageLoad();
    expect(pagination.beginPageLoad()).toBe(false);
  });

  it("resets page position, loading and the end-of-results flag for a new month", () => {
    const pagination = useCalendarPagination(2);
    pagination.beginPageLoad();
    pagination.recordPage(2);
    expect(pagination.hasMore.value).toBe(false);

    pagination.resetForMonth();

    expect(pagination.offset.value).toBe(0);
    expect(pagination.hasMore.value).toBe(true);
    expect(pagination.loading.value).toBe(false);
    expect(pagination.beginPageLoad()).toBe(true);
  });

  it("resets only the offset when a filter requests a refetch", () => {
    const pagination = useCalendarPagination(2);
    pagination.recordPage(4);
    pagination.recordPage(4);
    expect(pagination.hasMore.value).toBe(false);

    pagination.resetOffset();

    expect(pagination.offset.value).toBe(0);
    expect(pagination.hasMore.value).toBe(false);
  });
});
