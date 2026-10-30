import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildActivityHistoryQueryParams, getActivityHistory } from "./activityApi";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("@services/api/api", () => ({ default: { get } }));

describe("activityApi", () => {
  beforeEach(() => get.mockReset());

  it("serializes only the supported parameters and never adds a user id", () => {
    expect(buildActivityHistoryQueryParams({
      from: "2026-10-01",
      to: "2026-10-29",
      timeZone: "Europe/Madrid",
      type: "change",
      q: "  Radiohead  ",
      limit: 30,
      cursor: "opaque.signed-token",
    })).toEqual({
      from: "2026-10-01",
      to: "2026-10-29",
      timeZone: "Europe/Madrid",
      type: "change",
      q: "  Radiohead  ",
      limit: 30,
      cursor: "opaque.signed-token",
    });
    expect(buildActivityHistoryQueryParams({})).toEqual({});
  });

  it("sends the selected date boundaries and browser time zone unchanged", () => {
    expect(buildActivityHistoryQueryParams({
      from: "2026-10-29",
      to: "2026-10-29",
      timeZone: "America/Los_Angeles",
      limit: 30,
    })).toEqual({
      from: "2026-10-29",
      to: "2026-10-29",
      timeZone: "America/Los_Angeles",
      limit: 30,
    });
  });

  it("uses the authenticated shared client and preserves nullable fields and timestamp text", async () => {
    const occurredAt = "2026-10-29T09:10:11.123456Z";
    const response = {
      items: [{
        id: "event-1",
        type: "change" as const,
        occurredAt,
        previousValue: 7,
        newValue: 8,
        disc: {
          id: "disc-1",
          title: null,
          artist: null,
          coverUrl: null,
          genre: null,
        },
      }, {
        id: "event-2",
        type: "set" as const,
        occurredAt: "2026-10-28T09:10:11.000001Z",
        previousValue: null,
        newValue: 9,
        disc: null,
      }],
      nextCursor: "opaque.signed-token",
      hasMore: true,
      dailySetCounts: { "2026-10-29": 1, "2026-10-28": 0 },
    };
    get.mockResolvedValue({ data: response });
    const signal = new AbortController().signal;

    const result = await getActivityHistory({ limit: 30 }, signal);

    expect(get).toHaveBeenCalledWith("/activity/history", {
      params: { limit: 30 },
      signal,
    });
    expect(result).toBe(response);
    expect(result.items[0]?.occurredAt).toBe(occurredAt);
    expect(typeof result.items[0]?.occurredAt).toBe("string");
    expect(result.items[0]?.disc?.title).toBeNull();
    expect(result.items[0]?.disc?.artist).toBeNull();
    expect(result.items[1]?.disc).toBeNull();
    expect(result.items[1]?.previousValue).toBeNull();
    expect(result.dailySetCounts).toEqual({ "2026-10-29": 1, "2026-10-28": 0 });
  });
});
