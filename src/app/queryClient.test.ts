import { describe, expect, it } from "vitest";
import { createApp } from "vue";
import { useQueryClient } from "@tanstack/vue-query";
import { installQuery, queryClient } from "./queryClient";

describe("shared TanStack Query setup", () => {
  it("registers the Vue plugin with the single shared QueryClient", () => {
    const app = createApp({});

    installQuery(app);

    expect(app.runWithContext(() => useQueryClient())).toBe(queryClient);
  });

  it("uses conservative defaults and retries only one transient failure", () => {
    const { queries, mutations } = queryClient.getDefaultOptions();
    const retry = queries?.retry;

    expect(queries).toMatchObject({
      staleTime: 60_000,
      gcTime: 300_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      throwOnError: false,
    });
    expect(mutations?.retry).toBe(false);
    expect(typeof retry).toBe("function");
    if (typeof retry !== "function") return;

    expect(retry(0, new Error("network"))).toBe(true);
    expect(retry(1, new Error("network"))).toBe(false);
    expect(retry(0, { response: { status: 503 } })).toBe(true);
    expect(retry(0, { status: 503 })).toBe(true);
    expect(retry(0, { response: { status: 401 } })).toBe(false);
    expect(retry(0, { response: { status: 429 } })).toBe(false);
    expect(retry(0, { status: null, category: "protocol-error" })).toBe(false);
  });
});
