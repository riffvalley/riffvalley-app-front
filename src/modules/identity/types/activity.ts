/** Date-only value in YYYY-MM-DD format, interpreted in Europe/Madrid by the API. */
export type ActivityDate = string;

export interface ActivityDateRangeParams {
  from?: ActivityDate;
  to?: ActivityDate;
}

/** Summary accepts either a custom/legacy range or a preset, never both. */
export type ActivitySummaryParams = ActivityDateRangeParams | {
  period: 7 | 30 | 90;
  from?: never;
  to?: never;
};

export interface ActivityUsersParams extends ActivityDateRangeParams {
  limit?: number;
  offset?: number;
}

/** Event categories counted by the backend; aggregate responses do not expose individual event rows. */
export type VoteActionType = "set" | "change";

/** Count of captured vote actions on one Madrid calendar date. */
export interface VoteActionsPerDay {
  date: ActivityDate;
  count: number | null;
}

/** Daily App presence; null means the date is before presence coverage began. */
export interface ActivityPresencePerDay {
  date: ActivityDate;
  present: boolean | null;
}

export interface ActivitySummaryPeriods {
  /** Distinct users with a recorded daily App presence in the rolling window. */
  activeUsers7: number | null;
  activeUsers30: number | null;
  /** Captured effective rate set/change events in the rolling window. */
  voteActions7: number | null;
  voteActions30: number | null;
  /** Distinct users with at least one captured rate set/change event. */
  votingUsers7: number | null;
  votingUsers30: number | null;
}

export interface ActivitySummaryDay {
  date: ActivityDate;
  /** Users with a daily App presence record; this does not count sessions or interactions. */
  activeUsers: number | null;
  voteActions: number | null;
  votingUsers: number | null;
}

export type ActivityCoverageStatus = "complete" | "incomplete" | "unavailable";

export interface ActivityCoverage {
  status: ActivityCoverageStatus;
  dataSince: ActivityDate | null;
}

export interface ActivityDashboardRanges {
  current: { from: ActivityDate; to: ActivityDate };
  previous: { from: ActivityDate; to: ActivityDate };
  baseline: { from: ActivityDate; to: ActivityDate };
}

export interface ActivityMetricComparison {
  current: number | null;
  previous: number | null;
  delta: number | null;
  changePercent: number | null;
  coverage: {
    current: ActivityCoverage;
    previous: ActivityCoverage;
    baseline?: ActivityCoverage;
  };
  reason?: "zero_denominator" | "unavailable";
}

/** Current Rate row count; historical snapshots do not exist. */
export interface ActivityCurrentRatings {
  current: number | null;
  previous: null;
  delta: null;
  changePercent: null;
  coverage: {
    current: ActivityCoverage;
    previous: ActivityCoverage;
  };
  reason?: "unavailable";
}

export interface ActivityDashboardDay {
  date: ActivityDate;
  dayIndex: number;
  activeUsers: number | null;
  /** Counts only rate vote events of type `set`; `change` is excluded. */
  newVotes: number | null;
}

export interface ActivityDashboardResponse {
  periods: ActivityDashboardRanges;
  timezone: "Europe/Madrid";
  /** Timestamp serialized as an ISO UTC string. */
  asOf: string;
  activityDataSince: ActivityDate | null;
  voteDataSince: ActivityDate | null;
  activeUsers: ActivityMetricComparison;
  newVotes: ActivityMetricComparison;
  votingUsers: ActivityMetricComparison;
  participationRate: ActivityMetricComparison;
  votesPerActiveUser: ActivityMetricComparison;
  returningUsers: ActivityMetricComparison;
  retentionRate: ActivityMetricComparison;
  currentRatings: ActivityCurrentRatings;
  series: {
    current: ActivityDashboardDay[];
    previous: ActivityDashboardDay[];
  };
}

export interface ActivitySummaryResponse {
  from: ActivityDate;
  to: ActivityDate;
  timezone: "Europe/Madrid";
  /** First complete daily-presence date; null when no capture date is available. */
  activityDataSince: ActivityDate | null;
  /** First complete vote-action date; null when vote-action capture is unavailable. */
  voteDataSince: ActivityDate | null;
  periods: ActivitySummaryPeriods;
  series: ActivitySummaryDay[];
  /** Additive in the local backend contract; older deployed versions may omit it. */
  dashboard?: ActivityDashboardResponse;
}

export interface ActivityUserStatistics {
  userId: string;
  username: string;
  lastActiveDate: ActivityDate | null;
  /** Number of Madrid calendar dates with recorded daily App presence in the rolling window. */
  activeDays7: number | null;
  activeDays30: number | null;
  /** Distinct discs with a current Rate whose rate is non-null; not historical vote actions. */
  currentVotes: number;
  voteActions7: number | null;
  voteActions30: number | null;
  /** Captured set/change events since event capture began, including a possible partial start day. */
  voteActionsRecorded: number;
  /** ISO UTC timestamp of the latest captured set/change event. */
  lastVoteAt: string | null;
  votesByDay: VoteActionsPerDay[];
}

export interface ActivityUsersResponse {
  totalItems: number;
  limit: number;
  offset: number;
  from: ActivityDate;
  to: ActivityDate;
  timezone: "Europe/Madrid";
  activityDataSince: ActivityDate | null;
  voteDataSince: ActivityDate | null;
  data: ActivityUserStatistics[];
}

export interface ActivityUserDetailResponse {
  userId: string;
  lastActiveDate: ActivityDate | null;
  activeDays7: number | null;
  activeDays30: number | null;
  /** Recorded daily App presence dates inside the requested range. */
  activeDates: ActivityDate[];
  /** Dense daily presence series; null marks dates before presence coverage. */
  presenceByDay: ActivityPresencePerDay[];
  activityDataSince: ActivityDate | null;
  activityCoverage: ActivityCoverage;
  /** Distinct discs with a current Rate whose rate is non-null; not historical vote actions. */
  currentVotes: number;
  /** Captured `set` events, independent of changes to existing ratings. */
  newVotes7: number | null;
  newVotes30: number | null;
  newVotesRecorded: number;
  /** Captured `change` events, independent of new ratings. */
  changedVotes7: number | null;
  changedVotes30: number | null;
  changedVotesRecorded: number;
  /** ISO UTC timestamp of the latest captured set or change event. */
  lastVoteEventAt: string | null;
  voteDataSince: ActivityDate | null;
  voteCoverage: ActivityCoverage;
  newVotesByDay: VoteActionsPerDay[];
  changedVotesByDay: VoteActionsPerDay[];
}
