import api from "@services/api/api";
import type {
  ActivityDateRangeParams,
  ActivitySummaryParams,
  ActivitySummaryResponse,
  ActivityUserDetailResponse,
  ActivityUsersParams,
  ActivityUsersResponse,
} from "../types/activity";
import type {
  ActivityInactivityParams,
  ActivityInactivityResponse,
} from "../inactivity/types/activityInactivity";

function activityQueryParams(params: ActivityDateRangeParams) {
  return {
    ...(params.from === undefined ? {} : { from: params.from }),
    ...(params.to === undefined ? {} : { to: params.to }),
  };
}

export async function getActivitySummary(
  params: ActivitySummaryParams = {},
  signal?: AbortSignal,
): Promise<ActivitySummaryResponse> {
  const queryParams = {
    ...activityQueryParams(params),
    ...("period" in params ? { period: params.period } : {}),
  };
  const response = await api.get<ActivitySummaryResponse>("/activity/summary", signal
    ? { params: queryParams, signal }
    : { params: queryParams });
  return response.data;
}

export async function getActivityUsers(
  params: ActivityUsersParams = {},
  signal?: AbortSignal,
): Promise<ActivityUsersResponse> {
  const queryParams = {
    ...activityQueryParams(params),
    ...(params.limit === undefined ? {} : { limit: params.limit }),
    ...(params.offset === undefined ? {} : { offset: params.offset }),
  };
  const response = await api.get<ActivityUsersResponse>("/activity/users", signal
    ? { params: queryParams, signal }
    : { params: queryParams });
  return response.data;
}

export async function getActivityUserDetail(
  userId: string,
  params: ActivityDateRangeParams = {},
  signal?: AbortSignal,
): Promise<ActivityUserDetailResponse> {
  const queryParams = activityQueryParams(params);
  const response = await api.get<ActivityUserDetailResponse>(`/activity/users/${userId}`, signal
    ? { params: queryParams, signal }
    : { params: queryParams });
  return response.data;
}

export async function getActivityInactivity(
  params: ActivityInactivityParams = {},
  signal?: AbortSignal,
): Promise<ActivityInactivityResponse> {
  const queryParams = {
    ...(params.asOf === undefined ? {} : { asOf: params.asOf }),
    ...(params.role === undefined ? {} : { role: params.role }),
    ...(params.isActive === undefined ? {} : { isActive: params.isActive }),
    ...(params.limit === undefined ? {} : { limit: params.limit }),
    ...(params.offset === undefined ? {} : { offset: params.offset }),
    ...(params.sortBy === undefined ? {} : { sortBy: params.sortBy }),
    ...(params.sortOrder === undefined ? {} : { sortOrder: params.sortOrder }),
  };
  const response = await api.get<ActivityInactivityResponse>(
    "/activity/inactivity",
    signal ? { params: queryParams, signal } : { params: queryParams },
  );
  return response.data;
}
