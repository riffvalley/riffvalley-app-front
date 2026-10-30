import api from "@services/api/api";
import type { ActivityHistoryParams, ActivityHistoryResponse } from "../types/activity";

export function buildActivityHistoryQueryParams(params: ActivityHistoryParams) {
  return {
    ...(params.from === undefined ? {} : { from: params.from }),
    ...(params.to === undefined ? {} : { to: params.to }),
    ...(params.timeZone === undefined ? {} : { timeZone: params.timeZone }),
    ...(params.type === undefined ? {} : { type: params.type }),
    ...(params.q === undefined ? {} : { q: params.q }),
    ...(params.limit === undefined ? {} : { limit: params.limit }),
    ...(params.cursor === undefined ? {} : { cursor: params.cursor }),
  };
}

export async function getActivityHistory(
  params: ActivityHistoryParams = {},
  signal?: AbortSignal,
): Promise<ActivityHistoryResponse> {
  const { data } = await api.get<ActivityHistoryResponse>("/activity/history", {
    params: buildActivityHistoryQueryParams(params),
    signal,
  });
  return data;
}
