import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("@services/api/api", () => ({ default: api }));

import {
  getActivitySummary,
  getActivityUserDetail,
  getActivityUsers,
  getGlobalActivity,
} from "./activity";
import type {
  GlobalActivityResponse,
  ActivitySummaryResponse,
  ActivityUserDetailResponse,
  ActivityUsersResponse,
} from "../types/activity";

describe("Identity activity statistics HTTP contracts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("preserves the global activity endpoint, pagination, cancellation and response", async () => {
    const controller = new AbortController();
    const feed: GlobalActivityResponse = {
      totalItems: 1,
      totalPages: 1,
      currentPage: 2,
      limit: 20,
      data: [
        {
          id: "vote-1",
          rate: 5,
          cover: null,
          createdAt: "2025-03-04T12:30:00.000Z",
          editedAt: null,
          user: { id: "user-1", username: "Member" },
          disc: { id: "disc-1", name: "Release" },
        },
      ],
    };
    api.get.mockResolvedValue({ data: feed });

    await expect(getGlobalActivity(20, 20, controller.signal)).resolves.toBe(feed);

    expect(api.get).toHaveBeenCalledWith("/auth/activity", {
      params: { limit: 20, offset: 20 },
      signal: controller.signal,
    });
  });

  it("preserves the default global activity pagination", async () => {
    api.get.mockResolvedValue({
      data: { data: [], totalItems: 0, totalPages: 0, currentPage: 1, limit: 20 },
    });

    await getGlobalActivity();

    expect(api.get).toHaveBeenCalledWith("/auth/activity", { params: { limit: 20, offset: 0 } });
  });

  it("requests the summary with date-only Madrid range values and preserves nullable metrics", async () => {
    const summary: ActivitySummaryResponse = {
      from: "2026-10-01",
      to: "2026-10-31",
      timezone: "Europe/Madrid",
      activityDataSince: "2026-10-22",
      voteDataSince: null,
      periods: {
        activeUsers7: 12,
        activeUsers30: 34,
        voteActions7: null,
        voteActions30: null,
        votingUsers7: null,
        votingUsers30: null,
      },
      series: [{ date: "2026-10-01", activeUsers: null, voteActions: null, votingUsers: null }],
    };
    api.get.mockResolvedValue({ data: summary });

    await expect(getActivitySummary({ from: "2026-10-01", to: "2026-10-31" })).resolves.toBe(
      summary
    );

    expect(api.get).toHaveBeenCalledWith("/activity/summary", {
      params: { from: "2026-10-01", to: "2026-10-31" },
    });
  });

  it("omits unspecified summary dates so the backend applies its documented default range", async () => {
    api.get.mockResolvedValue({ data: {} });

    await getActivitySummary();

    expect(api.get).toHaveBeenCalledWith("/activity/summary", { params: {} });
  });

  it.each([7, 30, 90] as const)("serializes the %s-day summary preset", async (period) => {
    api.get.mockResolvedValue({ data: {} });

    await getActivitySummary({ period });

    expect(api.get).toHaveBeenCalledWith("/activity/summary", { params: { period } });
  });

  it("serializes a legacy one-sided custom range without adding a preset", async () => {
    api.get.mockResolvedValue({ data: {} });

    await getActivitySummary({ from: "2026-10-01" });

    expect(api.get).toHaveBeenCalledWith("/activity/summary", {
      params: { from: "2026-10-01" },
    });
  });

  it("returns the complete dashboard contract, including nulls and partial coverage", async () => {
    const coverage = { status: "incomplete" as const, dataSince: "2026-10-03" };
    const completeCoverage = { status: "complete" as const, dataSince: "2026-10-03" };
    const unavailableCoverage = { status: "unavailable" as const, dataSince: null };
    const summary: ActivitySummaryResponse = {
      from: "2026-10-01",
      to: "2026-10-07",
      timezone: "Europe/Madrid",
      activityDataSince: "2026-10-03",
      voteDataSince: null,
      periods: {
        activeUsers7: null,
        activeUsers30: null,
        voteActions7: null,
        voteActions30: null,
        votingUsers7: null,
        votingUsers30: null,
      },
      series: [],
      dashboard: {
        periods: {
          current: { from: "2026-10-01", to: "2026-10-07" },
          previous: { from: "2026-09-24", to: "2026-09-30" },
          baseline: { from: "2026-09-17", to: "2026-09-23" },
        },
        timezone: "Europe/Madrid",
        asOf: "2026-10-07T10:00:00.000Z",
        activityDataSince: "2026-10-03",
        voteDataSince: null,
        activeUsers: {
          current: null,
          previous: null,
          delta: null,
          changePercent: null,
          coverage: { current: coverage, previous: coverage },
        },
        newVotes: {
          current: null,
          previous: null,
          delta: null,
          changePercent: null,
          coverage: { current: unavailableCoverage, previous: unavailableCoverage },
        },
        votingUsers: {
          current: null,
          previous: null,
          delta: null,
          changePercent: null,
          coverage: { current: unavailableCoverage, previous: unavailableCoverage },
        },
        participationRate: {
          current: null,
          previous: null,
          delta: null,
          changePercent: null,
          coverage: { current: coverage, previous: coverage },
          reason: "zero_denominator",
        },
        votesPerActiveUser: {
          current: null,
          previous: null,
          delta: null,
          changePercent: null,
          coverage: { current: coverage, previous: coverage },
          reason: "zero_denominator",
        },
        returningUsers: {
          current: null,
          previous: null,
          delta: null,
          changePercent: null,
          coverage: { current: coverage, previous: coverage, baseline: coverage },
        },
        retentionRate: {
          current: null,
          previous: null,
          delta: null,
          changePercent: null,
          coverage: { current: coverage, previous: coverage, baseline: coverage },
          reason: "zero_denominator",
        },
        currentRatings: {
          current: 42,
          previous: null,
          delta: null,
          changePercent: null,
          coverage: { current: completeCoverage, previous: unavailableCoverage },
          reason: "unavailable",
        },
        series: {
          current: [{ date: "2026-10-01", dayIndex: 1, activeUsers: null, newVotes: null }],
          previous: [{ date: "2026-09-24", dayIndex: 1, activeUsers: 0, newVotes: 0 }],
        },
      },
    };
    api.get.mockResolvedValue({ data: summary });

    await expect(getActivitySummary({ from: "2026-10-01", to: "2026-10-07" })).resolves.toBe(
      summary
    );
    expect(summary.dashboard?.newVotes.current).toBeNull();
    expect(summary.dashboard?.series.current[0]?.activeUsers).toBeNull();
    expect(summary.dashboard?.series.previous[0]?.newVotes).toBe(0);
    expect(api.get).toHaveBeenCalledWith("/activity/summary", {
      params: { from: "2026-10-01", to: "2026-10-07" },
    });
  });

  it("forwards AbortSignal for a summary request", async () => {
    const controller = new AbortController();
    api.get.mockResolvedValue({ data: {} });

    await getActivitySummary({ period: 90 }, controller.signal);

    expect(api.get).toHaveBeenCalledWith("/activity/summary", {
      params: { period: 90 },
      signal: controller.signal,
    });
  });

  it("requests paginated activity users and forwards the optional cancellation signal", async () => {
    const response: ActivityUsersResponse = {
      totalItems: 1,
      limit: 20,
      offset: 40,
      from: "2026-10-01",
      to: "2026-10-31",
      timezone: "Europe/Madrid",
      activityDataSince: "2026-10-22",
      voteDataSince: null,
      data: [
        {
          userId: "user-1",
          username: "listener",
          lastActiveDate: "2026-10-22",
          activeDays7: 1,
          activeDays30: null,
          currentVotes: 3,
          voteActions7: null,
          voteActions30: null,
          voteActionsRecorded: 0,
          lastVoteAt: null,
          votesByDay: [],
        },
      ],
    };
    const controller = new AbortController();
    api.get.mockResolvedValue({ data: response });

    await expect(
      getActivityUsers(
        {
          from: "2026-10-01",
          to: "2026-10-31",
          limit: 20,
          offset: 40,
        },
        controller.signal
      )
    ).resolves.toBe(response);

    expect(api.get).toHaveBeenCalledWith("/activity/users", {
      params: { from: "2026-10-01", to: "2026-10-31", limit: 20, offset: 40 },
      signal: controller.signal,
    });
  });

  it("omits undefined filters rather than sending invented defaults", async () => {
    api.get.mockResolvedValue({ data: { data: [] } });

    await getActivityUsers({ from: "2026-10-22", limit: 100 });

    expect(api.get).toHaveBeenCalledWith("/activity/users", {
      params: { from: "2026-10-22", limit: 100 },
    });
  });

  it("requests one user's activity detail with the supplied range and signal", async () => {
    const detail: ActivityUserDetailResponse = {
      userId: "user-1",
      lastActiveDate: null,
      activeDays7: null,
      activeDays30: null,
      activeDates: [],
      presenceByDay: [
        { date: "2026-10-01", present: null },
        { date: "2026-10-02", present: false },
      ],
      activityDataSince: null,
      activityCoverage: { status: "unavailable", dataSince: null },
      currentVotes: 0,
      newVotes7: null,
      newVotes30: null,
      newVotesRecorded: 0,
      changedVotes7: null,
      changedVotes30: null,
      changedVotesRecorded: 0,
      lastVoteEventAt: null,
      voteDataSince: null,
      voteCoverage: { status: "unavailable", dataSince: null },
      newVotesByDay: [
        { date: "2026-10-01", count: null },
        { date: "2026-10-02", count: 0 },
      ],
      changedVotesByDay: [
        { date: "2026-10-01", count: null },
        { date: "2026-10-02", count: 0 },
      ],
    };
    const controller = new AbortController();
    api.get.mockResolvedValue({ data: detail });

    await expect(
      getActivityUserDetail(
        "user-1",
        {
          from: "2026-10-01",
          to: "2026-10-31",
        },
        controller.signal
      )
    ).resolves.toBe(detail);

    expect(api.get).toHaveBeenCalledWith("/activity/users/user-1", {
      params: { from: "2026-10-01", to: "2026-10-31" },
      signal: controller.signal,
    });
    expect(detail.presenceByDay[1]?.present).toBe(false);
    expect(detail.newVotesByDay[0]?.count).toBeNull();
    expect(detail.newVotesByDay[1]?.count).toBe(0);
    expect(detail.activityCoverage.status).toBe("unavailable");
  });

  it("propagates HTTP errors unchanged for normal shared-client handling", async () => {
    const error = new Error("Forbidden");
    api.get.mockRejectedValue(error);

    await expect(getActivitySummary()).rejects.toBe(error);
  });
});
