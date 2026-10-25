import type { App } from "vue";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";

function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) return false;

  const details = typeof error === "object" && error !== null
    ? error as { response?: { status?: unknown }; status?: unknown; category?: unknown }
    : undefined;
  const status = details?.response?.status ?? details?.status;

  // Retry once only for network failures or server errors; auth, validation and
  // rate-limit responses should be surfaced to the feature without another call.
  if (typeof status === "number") return status >= 500 && status < 600;
  if (typeof details?.category === "string") {
    return details.category === "network-error" || details.category === "unavailable";
  }
  return true;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: shouldRetryQuery,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      throwOnError: false,
    },
    mutations: {
      retry: false,
    },
  },
});

export function installQuery(app: App): void {
  app.use(VueQueryPlugin, { queryClient });
}

export function clearPrivateQueryCache(client: QueryClient = queryClient): void {
  // cancelQueries aborts active query work synchronously; clear immediately so
  // an old user's entries cannot be observed while cancellation settles.
  const cancellation = client.cancelQueries();
  client.clear();
  void cancellation.catch(() => undefined);
}
