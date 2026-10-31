import { describe, expect, it } from "vitest";
import { backlogContentFixtures, scheduledContentFixtures } from "./contentFixtures";
import { filterContentCalendarByAuthor } from "./contentCalendarFilters";

describe("filterContentCalendarByAuthor", () => {
  const contents = [...backlogContentFixtures, ...scheduledContentFixtures];

  it("returns every available content when the filter is disabled", () => {
    expect(filterContentCalendarByAuthor(contents, false, "author-1")).toEqual(contents);
  });

  it("returns only content authored by the selected user", () => {
    expect(filterContentCalendarByAuthor(contents, true, "author-1").map(({ id }) => id)).toEqual([
      "video-backlog",
      "article-scheduled",
      "radar-scheduled",
    ]);
  });

  it("treats missing authors and a missing current user as not owned", () => {
    expect(filterContentCalendarByAuthor(contents, true, null)).toEqual([]);
    expect(filterContentCalendarByAuthor(contents, true, "author-1")).not.toContain(
      backlogContentFixtures[0]
    );
  });

  it("returns a derived array without changing its source", () => {
    const source = [...contents];
    const visible = filterContentCalendarByAuthor(source, true, "author-1");

    expect(visible).not.toBe(source);
    expect(source).toEqual(contents);
    expect(source).toHaveLength(contents.length);
  });
});
