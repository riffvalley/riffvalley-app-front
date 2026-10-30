import { describe, expect, it } from "vitest";
import type { ActivityHistoryEvent } from "../types/activity";
import { groupActivityEventsByLocalDay } from "./groupActivityEvents";

function event(id: string, occurredAt: string): ActivityHistoryEvent {
  return { id, type: "set", occurredAt, previousValue: null, newValue: 8, disc: null };
}

describe("groupActivityEventsByLocalDay", () => {
  it("groups pages together, preserves backend order, and removes repeated event ids", () => {
    const groups = groupActivityEventsByLocalDay([
      event("newest", "2026-10-31T12:00:00.000001Z"),
      event("same-day-second-page", "2026-10-31T08:00:00.000002Z"),
      event("duplicate", "2026-10-30T23:00:00Z"),
      event("duplicate", "2026-10-30T22:00:00Z"),
      event("older", "2026-10-29T22:00:00Z"),
    ], "UTC");

    expect(groups.map(({ dateKey }) => dateKey)).toEqual(["2026-10-31", "2026-10-30", "2026-10-29"]);
    expect(groups[0]?.events.map(({ id }) => id)).toEqual(["newest", "same-day-second-page"]);
    expect(groups[1]?.events.map(({ id }) => id)).toEqual(["duplicate"]);
    expect(groups[0]?.dateLabel).toContain("31");
  });

  it("uses the supplied local zone for midnight boundaries", () => {
    const groups = groupActivityEventsByLocalDay([
      event("before-midnight", "2026-11-01T06:59:59.999999Z"),
      event("after-midnight", "2026-11-01T07:00:00.000001Z"),
    ], "America/Los_Angeles");

    expect(groups.map(({ dateKey }) => dateKey)).toEqual(["2026-10-31", "2026-11-01"]);
  });

  it("groups across both daylight-saving transitions without assuming 24-hour days", () => {
    const spring = groupActivityEventsByLocalDay([
      event("before-spring", "2026-03-08T09:59:59.999999Z"),
      event("after-spring", "2026-03-08T10:00:00.000001Z"),
    ], "America/Los_Angeles");
    const autumn = groupActivityEventsByLocalDay([
      event("first-one-am", "2026-11-01T08:30:00Z"),
      event("second-one-am", "2026-11-01T09:30:00Z"),
    ], "America/Los_Angeles");

    expect(spring.map(({ dateKey }) => dateKey)).toEqual(["2026-03-08"]);
    expect(autumn.map(({ dateKey }) => dateKey)).toEqual(["2026-11-01"]);
    expect(autumn[0]?.events.map(({ id }) => id)).toEqual(["first-one-am", "second-one-am"]);
  });
});
