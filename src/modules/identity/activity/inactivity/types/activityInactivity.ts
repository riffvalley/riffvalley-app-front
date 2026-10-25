import type { UserRole } from "../../../shared/types/auth";

export type ActivityInactivityBucket =
  | "0_2_days"
  | "3_6_days"
  | "7_13_days"
  | "14_29_days"
  | "30_59_days"
  | "60_plus_days";

export type ActivityInactivityGroup =
  | ActivityInactivityBucket
  | "never_voted"
  | "insufficient_history";

export type ActivityInactivitySortBy =
  | "lastVoteAt"
  | "daysSinceLastVote"
  | "username"
  | "lastPresenceAt"
  | "lastRatingModifiedAt"
  | "currentRatings";

export type ActivityInactivitySortOrder = "asc" | "desc";

export interface ActivityInactivityParams {
  asOf?: string;
  role?: UserRole;
  isActive?: "true" | "false";
  limit?: number;
  offset?: number;
  sortBy?: ActivityInactivitySortBy;
  sortOrder?: ActivityInactivitySortOrder;
}

export interface ActivityInactivityUser {
  userId: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  lastVoteAt: string | null;
  daysSinceLastVote: number | null;
  inactivityGroup: ActivityInactivityGroup;
  lastPresenceAt: string | null;
  lastRatingModifiedAt: string | null;
  currentRatings: number;
}

export interface ActivityInactivityResponse {
  asOf: string;
  timezone: "Europe/Madrid";
  totalUsers: number;
  groups: Record<ActivityInactivityGroup, number>;
  coverage: {
    status: "partial" | "unavailable";
    captureStartedAt: string | null;
    captureDataSince: string | null;
    interpretation: string;
  };
  limit: number;
  offset: number;
  sortBy: ActivityInactivitySortBy;
  sortOrder: ActivityInactivitySortOrder;
  data: ActivityInactivityUser[];
}

export const ACTIVITY_INACTIVITY_BUCKETS: readonly ActivityInactivityBucket[] = [
  "0_2_days",
  "3_6_days",
  "7_13_days",
  "14_29_days",
  "30_59_days",
  "60_plus_days",
];

export const ACTIVITY_INACTIVITY_GROUPS: readonly ActivityInactivityGroup[] = [
  ...ACTIVITY_INACTIVITY_BUCKETS,
  "never_voted",
  "insufficient_history",
];

export const ACTIVITY_INACTIVITY_SORT_FIELDS: readonly ActivityInactivitySortBy[] = [
  "lastVoteAt",
  "daysSinceLastVote",
  "username",
  "lastPresenceAt",
  "lastRatingModifiedAt",
  "currentRatings",
];
