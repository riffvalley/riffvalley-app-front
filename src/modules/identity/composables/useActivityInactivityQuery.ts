import { computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { getActivityInactivity } from "@/modules/identity/api/activity";
import {
  ACTIVITY_INACTIVITY_BUCKETS,
  ACTIVITY_INACTIVITY_GROUPS,
  ACTIVITY_INACTIVITY_SORT_FIELDS,
  type ActivityInactivityParams,
  type ActivityInactivityResponse,
  type ActivityInactivityUser,
} from "@/modules/identity/types/activityInactivity";
import { useAuthStore } from "@/modules/identity/stores/auth";

export const activityInactivityQueryKey = ["identity", "activity", "inactivity"] as const;

export function normalizeActivityInactivityParams(
  params: ActivityInactivityParams,
): ActivityInactivityParams {
  return {
    ...(params.asOf === undefined ? {} : { asOf: params.asOf }),
    ...(params.role === undefined ? {} : { role: params.role }),
    ...(params.isActive === undefined ? {} : { isActive: params.isActive }),
    ...(params.limit === undefined ? {} : { limit: params.limit }),
    ...(params.offset === undefined ? {} : { offset: params.offset }),
    ...(params.sortBy === undefined ? {} : { sortBy: params.sortBy }),
    ...(params.sortOrder === undefined ? {} : { sortOrder: params.sortOrder }),
  };
}

export function activityInactivityQueryKeyForSession(
  params: ActivityInactivityParams,
  userId: string | null,
  generation: number,
) {
  return [
    ...activityInactivityQueryKey,
    normalizeActivityInactivityParams(params),
    userId,
    generation,
  ] as const;
}

export class ActivityInactivityContractError extends Error {
  readonly category = "contract-incompatible-inactivity";

  constructor() {
    super("La respuesta del backend no cumple el contrato de inactividad.");
    this.name = "ActivityInactivityContractError";
  }
}

class ActivityInactivitySessionError extends Error {
  readonly category = "stale-session";

  constructor() {
    super("La sesión administrativa cambió antes de completar la consulta.");
    this.name = "ActivityInactivitySessionError";
  }
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isInactivityUser(value: unknown): value is ActivityInactivityUser {
  if (!value || typeof value !== "object") return false;
  const user = value as Record<string, unknown>;
  const isKnownVoteAge = ACTIVITY_INACTIVITY_BUCKETS.includes(user.inactivityGroup as ActivityInactivityUser["inactivityGroup"]);
  const nullableVoteFieldsMatch = isKnownVoteAge
    ? typeof user.lastVoteAt === "string" && isNonNegativeInteger(user.daysSinceLastVote)
    : user.lastVoteAt === null && user.daysSinceLastVote === null;

  return typeof user.userId === "string" &&
    typeof user.username === "string" &&
    ["user", "collaborator", "riffvalley", "superadmin"].includes(String(user.role)) &&
    typeof user.isActive === "boolean" &&
    isNullableString(user.lastVoteAt) &&
    (user.daysSinceLastVote === null || isNonNegativeInteger(user.daysSinceLastVote)) &&
    nullableVoteFieldsMatch &&
    ACTIVITY_INACTIVITY_GROUPS.includes(user.inactivityGroup as ActivityInactivityUser["inactivityGroup"]) &&
    isNullableString(user.lastPresenceAt) &&
    isNullableString(user.lastRatingModifiedAt) &&
    isNonNegativeInteger(user.currentRatings);
}

export function isActivityInactivityResponse(value: unknown): value is ActivityInactivityResponse {
  if (!value || typeof value !== "object") return false;
  const response = value as Record<string, unknown>;
  if (!response.groups || typeof response.groups !== "object") return false;
  const groups = response.groups as Record<string, unknown>;
  const groupKeys = Object.keys(groups);
  const groupsTotal = ACTIVITY_INACTIVITY_GROUPS.reduce((total, group) => {
    const valueForGroup = groups[group];
    return total + (typeof valueForGroup === "number" ? valueForGroup : 0);
  }, 0);

  return typeof response.asOf === "string" &&
    response.timezone === "Europe/Madrid" &&
    isNonNegativeInteger(response.totalUsers) &&
    groupsTotal === response.totalUsers &&
    groupKeys.length === ACTIVITY_INACTIVITY_GROUPS.length &&
    ACTIVITY_INACTIVITY_GROUPS.every((group) => isNonNegativeInteger(groups[group])) &&
    groupKeys.every((group) => ACTIVITY_INACTIVITY_GROUPS.includes(group as ActivityInactivityUser["inactivityGroup"])) &&
    !!response.coverage && typeof response.coverage === "object" &&
    ["partial", "unavailable"].includes(String((response.coverage as Record<string, unknown>).status)) &&
    isNullableString((response.coverage as Record<string, unknown>).captureStartedAt) &&
    isNullableString((response.coverage as Record<string, unknown>).captureDataSince) &&
    typeof (response.coverage as Record<string, unknown>).interpretation === "string" &&
    isNonNegativeInteger(response.limit) && response.limit >= 1 && response.limit <= 100 &&
    isNonNegativeInteger(response.offset) &&
    ACTIVITY_INACTIVITY_SORT_FIELDS.includes(response.sortBy as ActivityInactivityResponse["sortBy"]) &&
    ["asc", "desc"].includes(String(response.sortOrder)) &&
    Array.isArray(response.data) && response.data.length <= response.limit && response.data.every(isInactivityUser);
}

function isSuperadminSession(authStore: ReturnType<typeof useAuthStore>): boolean {
  return authStore.authStatus === "authenticated" &&
    authStore.isAuthenticated &&
    authStore.hasRole("superadmin") &&
    !!authStore.userId;
}

function assertCurrentAdminSession(
  authStore: ReturnType<typeof useAuthStore>,
  userId: string | null,
  generation: number,
  signal: AbortSignal,
): asserts userId is string {
  if (
    signal.aborted ||
    !userId ||
    !isSuperadminSession(authStore) ||
    authStore.userId !== userId ||
    authStore.authSessionGeneration !== generation
  ) {
    throw new ActivityInactivitySessionError();
  }
}

export function useActivityInactivityQuery(params: () => ActivityInactivityParams) {
  const authStore = useAuthStore();
  const queryKey = computed(() => activityInactivityQueryKeyForSession(
    params(),
    authStore.userId,
    authStore.authSessionGeneration,
  ));

  return useQuery({
    queryKey,
    enabled: computed(() => isSuperadminSession(authStore)),
    queryFn: async ({ queryKey: requestedKey, signal }) => {
      const [, , , requestedParams, requestedUserId, requestedGeneration] = requestedKey;
      assertCurrentAdminSession(authStore, requestedUserId, requestedGeneration, signal);

      const result = await getActivityInactivity(requestedParams, signal);
      assertCurrentAdminSession(authStore, requestedUserId, requestedGeneration, signal);
      if (!isActivityInactivityResponse(result)) throw new ActivityInactivityContractError();
      return result;
    },
  });
}
