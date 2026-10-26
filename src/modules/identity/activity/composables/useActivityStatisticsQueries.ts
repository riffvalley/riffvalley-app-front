import { computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import {
  getActivitySummary,
  getActivityUserDetail,
  getActivityUsers,
} from "@/modules/identity/activity/api/activity";
import type {
  ActivityDateRangeParams,
  ActivitySummaryParams,
  ActivityUserDetailResponse,
  ActivityUsersParams,
} from "@/modules/identity/activity/types/activity";
import { useAuthStore, type AuthStore } from "@/modules/identity/auth";
import { activityDashboardQueryKey } from "../queryKeys";

export { activityDashboardQueryKey } from "../queryKeys";
export const activityUsersQueryKey = ["identity", "activity", "users"] as const;
export const activityUserDetailQueryKey = ["identity", "activity", "user-detail"] as const;

export function normalizeActivityDateRange(
  params: ActivityDateRangeParams
): ActivityDateRangeParams {
  return {
    ...(params.from === undefined ? {} : { from: params.from }),
    ...(params.to === undefined ? {} : { to: params.to }),
  };
}

/** Presets and custom dates are mutually exclusive in both the key and request. */
export function normalizeActivitySummaryParams(
  params: ActivitySummaryParams
): ActivitySummaryParams {
  if ("period" in params && params.period !== undefined) return { period: params.period };
  return normalizeActivityDateRange(params);
}

export function normalizeActivityUsersParams(params: ActivityUsersParams): ActivityUsersParams {
  return {
    ...normalizeActivityDateRange(params),
    ...(params.limit === undefined ? {} : { limit: params.limit }),
    ...(params.offset === undefined ? {} : { offset: params.offset }),
  };
}

export function activityDashboardQueryKeyForSession(
  params: ActivitySummaryParams,
  userId: string | null,
  generation: number
) {
  return [
    ...activityDashboardQueryKey,
    normalizeActivitySummaryParams(params),
    userId,
    generation,
  ] as const;
}

export function activityUsersQueryKeyForSession(
  params: ActivityUsersParams,
  userId: string | null,
  generation: number
) {
  return [
    ...activityUsersQueryKey,
    normalizeActivityUsersParams(params),
    userId,
    generation,
  ] as const;
}

export function activityUserDetailQueryKeyForSession(
  targetUserId: string | null,
  params: ActivityDateRangeParams,
  userId: string | null,
  generation: number
) {
  return [
    ...activityUserDetailQueryKey,
    targetUserId,
    normalizeActivityDateRange(params),
    userId,
    generation,
  ] as const;
}

function isSuperadminSession(authStore: AuthStore): boolean {
  return (
    authStore.authStatus === "authenticated" &&
    authStore.isAuthenticated &&
    authStore.hasRole("superadmin") &&
    !!authStore.userId
  );
}

class ActivityQuerySessionError extends Error {
  readonly category = "stale-session";

  constructor() {
    super("La sesión administrativa cambió antes de completar la consulta.");
    this.name = "ActivityQuerySessionError";
  }
}

export class ActivityDashboardContractError extends Error {
  readonly category = "contract-missing-dashboard";

  constructor() {
    super("La respuesta de actividad no incluye el bloque obligatorio dashboard.");
    this.name = "ActivityDashboardContractError";
  }
}

export class ActivityUserDetailContractError extends Error {
  readonly category = "contract-incompatible-user-detail";

  constructor() {
    super(
      "La respuesta de actividad individual no cumple el contrato separado de presencia y eventos."
    );
    this.name = "ActivityUserDetailContractError";
  }
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isActivityCoverage(
  value: unknown
): value is { status: "complete" | "incomplete" | "unavailable"; dataSince: string | null } {
  if (!value || typeof value !== "object") return false;
  const coverage = value as Record<string, unknown>;
  return (
    ["complete", "incomplete", "unavailable"].includes(String(coverage.status)) &&
    isNullableString(coverage.dataSince)
  );
}

function isDailyCountSeries(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every(
      (row) =>
        !!row &&
        typeof row === "object" &&
        typeof row.date === "string" &&
        isNullableNumber(row.count)
    )
  );
}

function isActivityUserDetailResponse(
  value: unknown,
  requestedUserId: string
): value is ActivityUserDetailResponse {
  if (!value || typeof value !== "object") return false;
  const detail = value as Record<string, unknown>;
  return (
    detail.userId === requestedUserId &&
    isNullableString(detail.lastActiveDate) &&
    isNullableNumber(detail.activeDays7) &&
    isNullableNumber(detail.activeDays30) &&
    Array.isArray(detail.activeDates) &&
    detail.activeDates.every((date) => typeof date === "string") &&
    Array.isArray(detail.presenceByDay) &&
    detail.presenceByDay.every(
      (row) =>
        !!row &&
        typeof row === "object" &&
        typeof row.date === "string" &&
        (row.present === null || typeof row.present === "boolean")
    ) &&
    isNullableString(detail.activityDataSince) &&
    isActivityCoverage(detail.activityCoverage) &&
    typeof detail.currentVotes === "number" &&
    Number.isFinite(detail.currentVotes) &&
    isNullableNumber(detail.newVotes7) &&
    isNullableNumber(detail.newVotes30) &&
    typeof detail.newVotesRecorded === "number" &&
    Number.isFinite(detail.newVotesRecorded) &&
    isNullableNumber(detail.changedVotes7) &&
    isNullableNumber(detail.changedVotes30) &&
    typeof detail.changedVotesRecorded === "number" &&
    Number.isFinite(detail.changedVotesRecorded) &&
    isNullableString(detail.lastVoteEventAt) &&
    isNullableString(detail.voteDataSince) &&
    isActivityCoverage(detail.voteCoverage) &&
    isDailyCountSeries(detail.newVotesByDay) &&
    isDailyCountSeries(detail.changedVotesByDay)
  );
}

function assertCurrentAdminSession(
  authStore: AuthStore,
  requestedUserId: string | null,
  requestedGeneration: number,
  signal: AbortSignal
): asserts requestedUserId is string {
  if (
    signal.aborted ||
    !requestedUserId ||
    !isSuperadminSession(authStore) ||
    authStore.userId !== requestedUserId ||
    authStore.authSessionGeneration !== requestedGeneration
  ) {
    throw new ActivityQuerySessionError();
  }
}

export function useActivityDashboardQuery(params: () => ActivitySummaryParams | null) {
  const authStore = useAuthStore();
  const queryKey = computed(() =>
    activityDashboardQueryKeyForSession(
      params() ?? {},
      authStore.userId,
      authStore.authSessionGeneration
    )
  );

  return useQuery({
    queryKey,
    enabled: computed(() => isSuperadminSession(authStore) && params() !== null),
    queryFn: async ({ queryKey: requestedKey, signal }) => {
      const [, , , requestedParams, requestedUserId, requestedGeneration] = requestedKey;
      assertCurrentAdminSession(authStore, requestedUserId, requestedGeneration, signal);

      const summary = await getActivitySummary(
        normalizeActivitySummaryParams(requestedParams),
        signal
      );
      assertCurrentAdminSession(authStore, requestedUserId, requestedGeneration, signal);
      if (!summary.dashboard) throw new ActivityDashboardContractError();
      return summary.dashboard;
    },
  });
}

export function useActivityUsersQuery(params: () => ActivityUsersParams) {
  const authStore = useAuthStore();
  const queryKey = computed(() =>
    activityUsersQueryKeyForSession(params(), authStore.userId, authStore.authSessionGeneration)
  );

  return useQuery({
    queryKey,
    enabled: computed(() => isSuperadminSession(authStore)),
    queryFn: async ({ queryKey: requestedKey, signal }) => {
      const [, , , requestedParams, requestedUserId, requestedGeneration] = requestedKey;
      assertCurrentAdminSession(authStore, requestedUserId, requestedGeneration, signal);

      const users = await getActivityUsers(requestedParams, signal);
      assertCurrentAdminSession(authStore, requestedUserId, requestedGeneration, signal);
      return users;
    },
  });
}

export function useActivityUserDetailQuery(
  targetUserId: () => string | null | undefined,
  params: () => ActivityDateRangeParams
) {
  const authStore = useAuthStore();
  const queryKey = computed(() =>
    activityUserDetailQueryKeyForSession(
      targetUserId() || null,
      params(),
      authStore.userId,
      authStore.authSessionGeneration
    )
  );

  return useQuery({
    queryKey,
    enabled: computed(() => isSuperadminSession(authStore) && !!targetUserId()),
    queryFn: async ({ queryKey: requestedKey, signal }) => {
      const [, , , requestedTargetUserId, requestedParams, requestedUserId, requestedGeneration] =
        requestedKey;
      assertCurrentAdminSession(authStore, requestedUserId, requestedGeneration, signal);
      if (!requestedTargetUserId) throw new ActivityQuerySessionError();

      const detail = await getActivityUserDetail(requestedTargetUserId, requestedParams, signal);
      assertCurrentAdminSession(authStore, requestedUserId, requestedGeneration, signal);
      if (!isActivityUserDetailResponse(detail, requestedTargetUserId)) {
        throw new ActivityUserDetailContractError();
      }
      return detail;
    },
  });
}
