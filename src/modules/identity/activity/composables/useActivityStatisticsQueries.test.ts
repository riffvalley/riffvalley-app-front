// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, ref, type Ref } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";

const { getActivitySummary, getActivityUsers, getActivityUserDetail } = vi.hoisted(() => ({
  getActivitySummary: vi.fn(),
  getActivityUsers: vi.fn(),
  getActivityUserDetail: vi.fn(),
}));

vi.mock("@/modules/identity/activity/api/activity", () => ({
  getActivitySummary,
  getActivityUsers,
  getActivityUserDetail,
}));

import { observePrivateQueryCache } from "@/app/privateQueryCache";
import { useAuthStore } from "@/modules/identity/auth/stores/auth";
import type {
  ActivityDateRangeParams,
  ActivityDashboardResponse,
  ActivitySummaryParams,
  ActivitySummaryResponse,
  ActivityUserDetailResponse,
  ActivityUsersParams,
  ActivityUsersResponse,
} from "@/modules/identity/activity/types/activity";
import {
  activityDashboardQueryKeyForSession,
  activityUserDetailQueryKeyForSession,
  activityUsersQueryKeyForSession,
  ActivityDashboardContractError,
  ActivityUserDetailContractError,
  normalizeActivitySummaryParams,
  useActivityDashboardQuery,
  useActivityUserDetailQuery,
  useActivityUsersQuery,
} from "./useActivityStatisticsQueries";

const dashboardResponse = (): ActivityDashboardResponse => ({
  periods: {
    current: { from: "2026-10-01", to: "2026-10-31" },
    previous: { from: "2026-09-01", to: "2026-09-30" },
    baseline: { from: "2026-08-01", to: "2026-08-31" },
  },
  timezone: "Europe/Madrid",
  asOf: "2026-10-31T10:00:00.000Z",
  activityDataSince: "2026-10-03",
  voteDataSince: null,
  activeUsers: { current: null, previous: null, delta: null, changePercent: null, coverage: {
    current: { status: "incomplete", dataSince: "2026-10-03" },
    previous: { status: "unavailable", dataSince: null },
  } },
  newVotes: { current: null, previous: null, delta: null, changePercent: null, coverage: {
    current: { status: "unavailable", dataSince: null },
    previous: { status: "unavailable", dataSince: null },
  } },
  votingUsers: { current: null, previous: null, delta: null, changePercent: null, coverage: {
    current: { status: "unavailable", dataSince: null },
    previous: { status: "unavailable", dataSince: null },
  } },
  participationRate: { current: null, previous: null, delta: null, changePercent: null, coverage: {
    current: { status: "unavailable", dataSince: null },
    previous: { status: "unavailable", dataSince: null },
  } },
  votesPerActiveUser: { current: null, previous: null, delta: null, changePercent: null, coverage: {
    current: { status: "unavailable", dataSince: null },
    previous: { status: "unavailable", dataSince: null },
  } },
  returningUsers: { current: null, previous: null, delta: null, changePercent: null, coverage: {
    current: { status: "unavailable", dataSince: null },
    previous: { status: "unavailable", dataSince: null },
  } },
  retentionRate: { current: null, previous: null, delta: null, changePercent: null, coverage: {
    current: { status: "unavailable", dataSince: null },
    previous: { status: "unavailable", dataSince: null },
  } },
  currentRatings: { current: 7, previous: null, delta: null, changePercent: null, coverage: {
    current: { status: "complete", dataSince: "2026-10-31" },
    previous: { status: "unavailable", dataSince: null },
  } },
  series: {
    current: [{ date: "2026-10-01", dayIndex: 0, activeUsers: null, newVotes: null }],
    previous: [{ date: "2026-09-01", dayIndex: 0, activeUsers: null, newVotes: 0 }],
  },
});

const summaryResponse = (): ActivitySummaryResponse => ({
  from: "2026-10-01",
  to: "2026-10-31",
  timezone: "Europe/Madrid",
  activityDataSince: "2026-10-22",
  voteDataSince: null,
  periods: {
    activeUsers7: 4,
    activeUsers30: 12,
    voteActions7: null,
    voteActions30: null,
    votingUsers7: null,
    votingUsers30: null,
  },
  series: [{ date: "2026-10-01", activeUsers: null, voteActions: null, votingUsers: null }],
  dashboard: dashboardResponse(),
});

const usersResponse = (offset = 0): ActivityUsersResponse => ({
  totalItems: 1,
  limit: 20,
  offset,
  from: "2026-10-01",
  to: "2026-10-31",
  timezone: "Europe/Madrid",
  activityDataSince: "2026-10-22",
  voteDataSince: null,
  data: [{
    userId: "target-1",
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
  }],
});

const detailResponse = (): ActivityUserDetailResponse => ({
  userId: "target-1",
  lastActiveDate: null,
  activeDays7: null,
  activeDays30: null,
  activeDates: [],
  presenceByDay: [
    { date: "2026-10-01", present: null },
    { date: "2026-10-02", present: false },
  ],
  activityDataSince: null,
  activityCoverage: { status: "incomplete", dataSince: "2026-10-03" },
  currentVotes: 0,
  newVotes7: null,
  newVotes30: null,
  newVotesRecorded: 0,
  changedVotes7: null,
  changedVotes30: null,
  changedVotesRecorded: 0,
  lastVoteEventAt: null,
  voteDataSince: null,
  voteCoverage: { status: "complete", dataSince: "2026-09-20" },
  newVotesByDay: [
    { date: "2026-10-01", count: null },
    { date: "2026-10-02", count: 0 },
  ],
  changedVotesByDay: [
    { date: "2026-10-01", count: null },
    { date: "2026-10-02", count: 0 },
  ],
});

describe("useActivityStatisticsQueries", () => {
  let queryClient: QueryClient;
  let wrapper: ReturnType<typeof mount> | undefined;
  let stopPrivateCacheObserver: (() => void) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 60_000, gcTime: Infinity } },
    });
    useAuthStore().$patch({
      authStatus: "authenticated",
      token: "access-token-in-memory",
      userId: "admin-a",
      username: "admin-a",
      role: "superadmin",
      authSessionGeneration: 3,
    });
    stopPrivateCacheObserver = observePrivateQueryCache(useAuthStore(), queryClient);
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    stopPrivateCacheObserver?.();
    stopPrivateCacheObserver = undefined;
    queryClient.clear();
  });

  function mountComposable<T>(create: () => T): T {
    let result!: T;
    wrapper = mount(defineComponent({
      setup() {
        result = create();
        return () => null;
      },
    }), { global: { plugins: [[VueQueryPlugin, { queryClient }]] } });
    return result;
  }

  it("creates resource-specific normalized keys for filters, pagination, target user and session", () => {
    expect(activityDashboardQueryKeyForSession({ from: undefined, to: "2026-10-31" }, "admin-a", 3)).toEqual([
      "identity", "activity", "dashboard", { to: "2026-10-31" }, "admin-a", 3,
    ]);
    expect(activityDashboardQueryKeyForSession({ period: 7 }, "admin-a", 3)).not.toEqual(
      activityDashboardQueryKeyForSession({ period: 30 }, "admin-a", 3),
    );
    expect(activityDashboardQueryKeyForSession({ period: 30 }, "admin-a", 3)).not.toEqual(
      activityDashboardQueryKeyForSession({ from: "2026-10-01", to: "2026-10-31" }, "admin-a", 3),
    );
    expect(activityUsersQueryKeyForSession({
      from: "2026-10-01", to: "2026-10-31", limit: 20, offset: 40,
    }, "admin-a", 3)).toEqual([
      "identity", "activity", "users",
      { from: "2026-10-01", to: "2026-10-31", limit: 20, offset: 40 },
      "admin-a", 3,
    ]);
    expect(activityUserDetailQueryKeyForSession(
      "target-1", { from: "2026-10-01" }, "admin-a", 3,
    )).toEqual([
      "identity", "activity", "user-detail", "target-1", { from: "2026-10-01" }, "admin-a", 3,
    ]);
    expect(activityUsersQueryKeyForSession({ limit: 20, offset: 40 }, "admin-b", 4))
      .not.toEqual(activityUsersQueryKeyForSession({ limit: 20, offset: 40 }, "admin-a", 3));
    expect(activityDashboardQueryKeyForSession({ period: 30 }, "admin-b", 4))
      .not.toEqual(activityDashboardQueryKeyForSession({ period: 30 }, "admin-a", 3));
    expect(activityDashboardQueryKeyForSession({ period: 30 }, "admin-a", 4))
      .not.toEqual(activityDashboardQueryKeyForSession({ period: 30 }, "admin-a", 3));
  });

  it("loads the summary with nullable metrics unchanged and uses its session key", async () => {
    const response = summaryResponse();
    const params: Ref<ActivitySummaryParams> = ref({ from: "2026-10-01", to: "2026-10-31" });
    getActivitySummary.mockResolvedValue(response);

    const query = mountComposable(() => useActivityDashboardQuery(() => params.value));

    const key = activityDashboardQueryKeyForSession(params.value, "admin-a", 3);
    await vi.waitFor(() => expect(queryClient.getQueryData(key)).toEqual(response.dashboard));
    expect(query.data.value).toEqual(response.dashboard);
    expect(response.periods.voteActions7).toBeNull();
    expect(response.series[0]?.activeUsers).toBeNull();
    expect(query.data.value?.activeUsers.current).toBeNull();
    expect(query.data.value?.activeUsers.coverage.current.dataSince).toBe("2026-10-03");
    expect(query.data.value?.series.previous[0]?.newVotes).toBe(0);
    expect(getActivitySummary).toHaveBeenCalledWith(params.value, expect.any(AbortSignal));
  });

  it("treats a missing dashboard block as an identifiable contract error without a legacy fallback", async () => {
    const { dashboard: _dashboard, ...legacyOnlyResponse } = summaryResponse();
    getActivitySummary.mockResolvedValue(legacyOnlyResponse);
    const query = mountComposable(() => useActivityDashboardQuery(() => ({ period: 30 })));

    await vi.waitFor(() => expect(query.isError.value).toBe(true));
    expect(query.error.value).toBeInstanceOf(ActivityDashboardContractError);
    expect(query.error.value).toMatchObject({ category: "contract-missing-dashboard" });
    expect(query.data.value).toBeUndefined();
    expect(getActivitySummary).toHaveBeenCalledOnce();
    expect(getActivitySummary).toHaveBeenCalledWith({ period: 30 }, expect.any(AbortSignal));
  });

  it.each([7, 30, 90] as const)("queries the %s-day preset under its own key", async (period) => {
    getActivitySummary.mockResolvedValue(summaryResponse());
    const params = ref<ActivitySummaryParams>({ period });
    mountComposable(() => useActivityDashboardQuery(() => params.value));

    const key = activityDashboardQueryKeyForSession({ period }, "admin-a", 3);
    await vi.waitFor(() => expect(queryClient.getQueryData(key)).toEqual(dashboardResponse()));
    expect(getActivitySummary).toHaveBeenCalledWith({ period }, expect.any(AbortSignal));
  });

  it("keeps the query disabled until a custom range is ready", async () => {
    getActivitySummary.mockResolvedValue(summaryResponse());
    const params = ref<ActivitySummaryParams | null>(null);
    const query = mountComposable(() => useActivityDashboardQuery(() => params.value));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(getActivitySummary).not.toHaveBeenCalled();
    expect(query.isFetching.value).toBe(false);

    params.value = { from: "2026-10-01", to: "2026-10-07" };
    await vi.waitFor(() => expect(getActivitySummary).toHaveBeenCalledOnce());
    expect(getActivitySummary).toHaveBeenCalledWith({ from: "2026-10-01", to: "2026-10-07" }, expect.any(AbortSignal));
  });

  it("switches reactively between presets and custom dates without combining them", async () => {
    getActivitySummary.mockResolvedValue(summaryResponse());
    const params = ref<ActivitySummaryParams>({ period: 7 });
    mountComposable(() => useActivityDashboardQuery(() => params.value));
    await vi.waitFor(() => expect(getActivitySummary).toHaveBeenCalledTimes(1));

    params.value = { period: 90 };
    await vi.waitFor(() => expect(getActivitySummary).toHaveBeenCalledTimes(2));
    params.value = { from: "2026-10-01", to: "2026-10-31" };
    await vi.waitFor(() => expect(getActivitySummary).toHaveBeenCalledTimes(3));

    expect(getActivitySummary.mock.calls.map(([requested]) => requested)).toEqual([
      { period: 7 }, { period: 90 }, { from: "2026-10-01", to: "2026-10-31" },
    ]);
    expect(normalizeActivitySummaryParams({ period: 30, from: "2026-10-01" } as ActivitySummaryParams))
      .toEqual({ period: 30 });
  });

  it("loads paginated users under a key containing range, limit, offset and session", async () => {
    const response = usersResponse(40);
    const params: Ref<ActivityUsersParams> = ref({
      from: "2026-10-01", to: "2026-10-31", limit: 20, offset: 40,
    });
    getActivityUsers.mockResolvedValue(response);

    mountComposable(() => useActivityUsersQuery(() => params.value));

    const key = activityUsersQueryKeyForSession(params.value, "admin-a", 3);
    await vi.waitFor(() => expect(queryClient.getQueryData(key)).toEqual(response));
    expect(response.data[0]?.activeDays30).toBeNull();
    expect(response.data[0]?.currentVotes).toBe(3);
    expect(response.data[0]?.voteActions30).toBeNull();
    expect(getActivityUsers).toHaveBeenCalledWith(params.value, expect.any(AbortSignal));
  });

  it("refetches on reactive range and pagination changes without sharing entries", async () => {
    const params: Ref<ActivityUsersParams> = ref({
      from: "2026-10-01", to: "2026-10-31", limit: 20, offset: 0,
    });
    getActivityUsers.mockImplementation(async (requested: ActivityUsersParams) => usersResponse(requested.offset ?? 0));
    mountComposable(() => useActivityUsersQuery(() => params.value));

    const firstKey = activityUsersQueryKeyForSession(params.value, "admin-a", 3);
    await vi.waitFor(() => expect(queryClient.getQueryData(firstKey)).toEqual(usersResponse(0)));

    params.value = { from: "2026-10-10", to: "2026-10-31", limit: 20, offset: 20 };
    const nextKey = activityUsersQueryKeyForSession(params.value, "admin-a", 3);
    await vi.waitFor(() => expect(queryClient.getQueryData(nextKey)).toEqual(usersResponse(20)));

    expect(getActivityUsers).toHaveBeenCalledTimes(2);
    expect(getActivityUsers).toHaveBeenLastCalledWith(params.value, expect.any(AbortSignal));
    expect(queryClient.getQueryData(firstKey)).toEqual(usersResponse(0));
  });

  it("keeps an unselected user detail disabled and loads after a user is selected", async () => {
    const targetUserId: Ref<string> = ref("");
    const range: Ref<ActivityDateRangeParams> = ref({});
    const detail = detailResponse();
    getActivityUserDetail.mockResolvedValue(detail);
    const query = mountComposable(() => useActivityUserDetailQuery(
      () => targetUserId.value,
      () => range.value,
    ));

    expect(query.isFetching.value).toBe(false);
    expect(getActivityUserDetail).not.toHaveBeenCalled();

    targetUserId.value = "target-1";
    await vi.waitFor(() => expect(getActivityUserDetail).toHaveBeenCalledOnce());
    const key = activityUserDetailQueryKeyForSession("target-1", {}, "admin-a", 3);
    await vi.waitFor(() => expect(queryClient.getQueryData(key)).toEqual(detail));
    expect(detail.activeDays7).toBeNull();
    expect(detail.newVotesByDay[0]?.count).toBeNull();
    expect(detail.newVotesByDay[1]?.count).toBe(0);
    expect(detail.presenceByDay[1]?.present).toBe(false);
    expect(detail.activityCoverage.status).toBe("incomplete");
    expect(detail.voteCoverage.status).toBe("complete");
    expect(getActivityUserDetail).toHaveBeenCalledWith("target-1", {}, expect.any(AbortSignal));
  });

  it("uses reactive date ranges as part of the detail query key and request", async () => {
    const targetUserId: Ref<string> = ref("target-1");
    const range: Ref<ActivityDateRangeParams> = ref({ from: "2026-10-01", to: "2026-10-07" });
    getActivityUserDetail.mockResolvedValue(detailResponse());
    mountComposable(() => useActivityUserDetailQuery(() => targetUserId.value, () => range.value));

    const firstKey = activityUserDetailQueryKeyForSession("target-1", range.value, "admin-a", 3);
    await vi.waitFor(() => expect(queryClient.getQueryData(firstKey)).toEqual(detailResponse()));
    range.value = { from: "2026-10-08", to: "2026-10-14" };
    const secondKey = activityUserDetailQueryKeyForSession("target-1", range.value, "admin-a", 3);
    await vi.waitFor(() => expect(queryClient.getQueryData(secondKey)).toEqual(detailResponse()));

    expect(getActivityUserDetail).toHaveBeenCalledTimes(2);
    expect(getActivityUserDetail.mock.calls.map(([id, params]) => [id, params])).toEqual([
      ["target-1", { from: "2026-10-01", to: "2026-10-07" }],
      ["target-1", { from: "2026-10-08", to: "2026-10-14" }],
    ]);
  });

  it("isolates detail data by selected user and session generation and cancels the old request", async () => {
    const targetUserId: Ref<string> = ref("target-1");
    let firstSignal: AbortSignal | undefined;
    getActivityUserDetail
      .mockImplementationOnce((_id: string, _params: ActivityDateRangeParams, signal: AbortSignal) => {
        firstSignal = signal;
        return new Promise<ActivityUserDetailResponse>(() => undefined);
      })
      .mockImplementation(async (id: string) => ({ ...detailResponse(), userId: id }));
    mountComposable(() => useActivityUserDetailQuery(() => targetUserId.value, () => ({})));
    await vi.waitFor(() => expect(getActivityUserDetail).toHaveBeenCalledOnce());

    targetUserId.value = "target-2";
    const targetTwoKey = activityUserDetailQueryKeyForSession("target-2", {}, "admin-a", 3);
    await vi.waitFor(() => expect(queryClient.getQueryData(targetTwoKey))
      .toEqual({ ...detailResponse(), userId: "target-2" }));
    expect(firstSignal?.aborted).toBe(true);

    useAuthStore().$patch({ authSessionGeneration: 4 });
    const newGenerationKey = activityUserDetailQueryKeyForSession("target-2", {}, "admin-a", 4);
    await vi.waitFor(() => expect(queryClient.getQueryData(newGenerationKey))
      .toEqual({ ...detailResponse(), userId: "target-2" }));
    expect(getActivityUserDetail.mock.calls.map(([id]) => id)).toEqual(["target-1", "target-2", "target-2"]);
    expect(activityUserDetailQueryKeyForSession("target-2", {}, "admin-a", 3))
      .not.toEqual(newGenerationKey);
  });

  it("discards a late detail response on permission loss and refetches after restoration", async () => {
    let resolveLate!: (value: ActivityUserDetailResponse) => void;
    getActivityUserDetail
      .mockImplementationOnce(() => new Promise((resolve) => { resolveLate = resolve; }))
      .mockResolvedValueOnce(detailResponse());
    const authStore = useAuthStore();
    mountComposable(() => useActivityUserDetailQuery(() => "target-1", () => ({})));
    await vi.waitFor(() => expect(getActivityUserDetail).toHaveBeenCalledOnce());
    const signal = getActivityUserDetail.mock.calls[0]?.[2] as AbortSignal;

    authStore.$patch({ role: "user" });
    expect(signal.aborted).toBe(true);
    resolveLate(detailResponse());
    await flushPromises();
    expect(queryClient.getQueryCache().getAll().every((query) => query.state.data === undefined)).toBe(true);

    authStore.$patch({ role: "superadmin" });
    const key = activityUserDetailQueryKeyForSession("target-1", {}, "admin-a", 3);
    await vi.waitFor(() => expect(queryClient.getQueryData(key)).toEqual(detailResponse()));
    expect(getActivityUserDetail).toHaveBeenCalledTimes(2);
  });

  it("rejects an incompatible legacy detail without using combined vote fields as fallback", async () => {
    const incompatibleResponse = {
      ...detailResponse(),
      newVotes7: undefined,
      voteActions7: 12,
      voteActions30: 30,
      voteActionsRecorded: 42,
      lastVoteAt: "2026-10-03T12:00:00.000Z",
      votesByDay: [{ date: "2026-10-03", count: 42 }],
    };
    getActivityUserDetail.mockResolvedValue(incompatibleResponse);
    const query = mountComposable(() => useActivityUserDetailQuery(() => "target-1", () => ({})));

    await vi.waitFor(() => expect(query.isError.value).toBe(true));
    expect(query.error.value).toBeInstanceOf(ActivityUserDetailContractError);
    expect(query.error.value).toMatchObject({ category: "contract-incompatible-user-detail" });
    expect(query.data.value).toBeUndefined();
    expect(query.data.value).toBeUndefined();
    expect(getActivityUserDetail).toHaveBeenCalledOnce();
  });

  it("exposes loading and error states from the query", async () => {
    let rejectRequest!: (error: Error) => void;
    getActivitySummary.mockImplementationOnce(() => new Promise<ActivitySummaryResponse>((_resolve, reject) => {
      rejectRequest = reject;
    }));
    const params = ref<ActivitySummaryParams>({});
    const query = mountComposable(() => useActivityDashboardQuery(() => params.value));

    await vi.waitFor(() => expect(getActivitySummary).toHaveBeenCalledOnce());
    expect(query.isFetching.value).toBe(true);
    rejectRequest(new Error("backend unavailable"));
    await vi.waitFor(() => expect(query.isError.value).toBe(true));
    expect(query.error.value?.message).toBe("backend unavailable");
  });

  it("cancels in-flight work and clears its result on logout before another identity queries", async () => {
    let resolveOldRequest!: (response: ActivitySummaryResponse) => void;
    let oldSignal: AbortSignal | undefined;
    const authStore = useAuthStore();
    getActivitySummary
      .mockImplementationOnce((_params: ActivitySummaryParams, signal: AbortSignal) => {
        oldSignal = signal;
        return new Promise<ActivitySummaryResponse>((resolve) => { resolveOldRequest = resolve; });
      })
      .mockResolvedValueOnce(summaryResponse());
    mountComposable(() => useActivityDashboardQuery(() => ({})));
    await vi.waitFor(() => expect(getActivitySummary).toHaveBeenCalledOnce());

    authStore.clearSessionLocally();
    expect(oldSignal?.aborted).toBe(true);
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);

    authStore.$patch({
      authStatus: "authenticated",
      token: "replacement-token",
      userId: "admin-b",
      username: "admin-b",
      role: "superadmin",
      authSessionGeneration: authStore.authSessionGeneration + 1,
    });
    const newKey = activityDashboardQueryKeyForSession({}, "admin-b", authStore.authSessionGeneration);
    await vi.waitFor(() => expect(queryClient.getQueryData(newKey)).toEqual(dashboardResponse()));
    resolveOldRequest(summaryResponse());

    expect(queryClient.getQueryData(activityDashboardQueryKeyForSession({}, "admin-a", 3))).toBeUndefined();
    expect(queryClient.getQueryData(newKey)).toEqual(dashboardResponse());
    expect(getActivitySummary).toHaveBeenCalledTimes(2);
  });

  it("rejects a late response when only the session generation changes", async () => {
    let resolveOldRequest!: (response: ActivitySummaryResponse) => void;
    let oldSignal: AbortSignal | undefined;
    getActivitySummary
      .mockImplementationOnce((_params: ActivitySummaryParams, signal: AbortSignal) => {
        oldSignal = signal;
        return new Promise<ActivitySummaryResponse>((resolve) => { resolveOldRequest = resolve; });
      })
      .mockResolvedValueOnce(summaryResponse());
    mountComposable(() => useActivityDashboardQuery(() => ({})));
    await vi.waitFor(() => expect(getActivitySummary).toHaveBeenCalledOnce());

    useAuthStore().$patch({ authSessionGeneration: 4 });
    const newKey = activityDashboardQueryKeyForSession({}, "admin-a", 4);
    await vi.waitFor(() => expect(queryClient.getQueryData(newKey)).toEqual(dashboardResponse()));
    resolveOldRequest(summaryResponse());

    expect(oldSignal?.aborted).toBe(true);
    expect(queryClient.getQueryData(activityDashboardQueryKeyForSession({}, "admin-a", 3))).toBeUndefined();
    expect(getActivitySummary).toHaveBeenCalledTimes(2);
  });

  it("rejects a dashboard response that finishes after permission downgrade", async () => {
    let resolveLate!: (response: ActivitySummaryResponse) => void;
    getActivitySummary
      .mockImplementationOnce(() => new Promise((resolve) => { resolveLate = resolve; }))
      .mockResolvedValueOnce(summaryResponse());
    const authStore = useAuthStore();
    mountComposable(() => useActivityDashboardQuery(() => ({})));
    await vi.waitFor(() => expect(getActivitySummary).toHaveBeenCalledOnce());
    const signal = getActivitySummary.mock.calls[0]?.[1] as AbortSignal;

    authStore.$patch({ role: "user" });
    expect(signal.aborted).toBe(true);
    resolveLate(summaryResponse());
    await flushPromises();
    expect(queryClient.getQueryCache().getAll().every((query) => query.state.data === undefined)).toBe(true);

    authStore.$patch({ role: "superadmin" });
    const key = activityDashboardQueryKeyForSession({}, "admin-a", 3);
    await vi.waitFor(() => expect(queryClient.getQueryData(key)).toEqual(dashboardResponse()));
    expect(getActivitySummary).toHaveBeenCalledTimes(2);
  });

  it("does not query without a valid superadmin session", async () => {
    useAuthStore().$patch({ role: "user" });
    mountComposable(() => useActivityDashboardQuery(() => ({})));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(getActivitySummary).not.toHaveBeenCalled();
    expect(getActivityUsers).not.toHaveBeenCalled();
    expect(getActivityUserDetail).not.toHaveBeenCalled();
  });

  it("does not execute while logged out", async () => {
    useAuthStore().clearSessionLocally();
    mountComposable(() => useActivityDashboardQuery(() => ({ period: 7 })));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(getActivitySummary).not.toHaveBeenCalled();
  });

  it("connects only the dashboard view and keeps activity endpoints out of unrelated views", () => {
    const dashboardView = readFileSync("src/modules/identity/activity/overview/UserStatisticsView.vue", "utf8");
    expect(dashboardView).toContain("useActivityDashboardQuery");
    expect(dashboardView).not.toContain("api/activity");

    const userActivityView = readFileSync("src/modules/identity/activity/user-activity/UserActivityView.vue", "utf8");
    expect(userActivityView).toContain("useActivityUserDetailQuery");
    expect(userActivityView).not.toContain("getUserActivity");
    expect(userActivityView).not.toContain("/auth/:id/activity");

    const manageUsersView = readFileSync("src/modules/identity/users/user-management/UserManagementView.vue", "utf8");
    expect(manageUsersView).not.toContain("useActivityStatisticsQueries");
    expect(manageUsersView).not.toContain("api/activity");
    expect(getActivitySummary).not.toHaveBeenCalled();
    expect(getActivityUsers).not.toHaveBeenCalled();
    expect(getActivityUserDetail).not.toHaveBeenCalled();
  });
});
