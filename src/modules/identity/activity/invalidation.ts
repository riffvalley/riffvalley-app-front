import type { QueryClient } from "@tanstack/vue-query";
import { activityDashboardQueryKey } from "./queryKeys";

export function invalidateActivityDashboard(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: activityDashboardQueryKey });
}
