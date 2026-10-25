import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@services/api/api", () => ({ default: api }));

import { getActivityInactivity } from "./activity";
import type { ActivityInactivityResponse } from "../inactivity/types/activityInactivity";

const response: ActivityInactivityResponse = {
  asOf: "2026-10-24",
  timezone: "Europe/Madrid",
  totalUsers: 1,
  groups: {
    "0_2_days": 0,
    "3_6_days": 0,
    "7_13_days": 0,
    "14_29_days": 0,
    "30_59_days": 0,
    "60_plus_days": 0,
    never_voted: 0,
    insufficient_history: 1,
  },
  coverage: {
    status: "partial",
    captureStartedAt: "2026-10-22T10:00:00.000Z",
    captureDataSince: "2026-10-22",
    interpretation: "Historial fiable desde el inicio de captura.",
  },
  limit: 20,
  offset: 40,
  sortBy: "daysSinceLastVote",
  sortOrder: "desc",
  data: [{
    userId: "user-1",
    username: "listener",
    role: "user",
    isActive: false,
    lastVoteAt: null,
    daysSinceLastVote: null,
    inactivityGroup: "insufficient_history",
    lastPresenceAt: null,
    lastRatingModifiedAt: null,
    currentRatings: 0,
  }],
};

describe("getActivityInactivity", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests the exact backend route and sends every defined contract parameter", async () => {
    api.get.mockResolvedValue({ data: response });
    const signal = new AbortController().signal;

    await expect(getActivityInactivity({
      asOf: "2026-10-24",
      role: "collaborator",
      isActive: "false",
      limit: 15,
      offset: 30,
      sortBy: "lastRatingModifiedAt",
      sortOrder: "asc",
    }, signal)).resolves.toBe(response);

    expect(api.get).toHaveBeenCalledWith("/activity/inactivity", {
      params: {
        asOf: "2026-10-24",
        role: "collaborator",
        isActive: "false",
        limit: 15,
        offset: 30,
        sortBy: "lastRatingModifiedAt",
        sortOrder: "asc",
      },
      signal,
    });
  });

  it("omits unspecified filters and preserves nullable history fields", async () => {
    api.get.mockResolvedValue({ data: response });

    const result = await getActivityInactivity({});

    expect(api.get).toHaveBeenCalledWith("/activity/inactivity", { params: {} });
    expect(result.data[0]?.daysSinceLastVote).toBeNull();
    expect(result.data[0]?.lastVoteAt).toBeNull();
    expect(result.groups.insufficient_history).toBe(1);
  });

  it("propagates HTTP errors without a legacy fallback", async () => {
    const failure = new Error("backend unavailable");
    api.get.mockRejectedValue(failure);

    await expect(getActivityInactivity()).rejects.toBe(failure);
    expect(api.get).toHaveBeenCalledTimes(1);
  });
});
