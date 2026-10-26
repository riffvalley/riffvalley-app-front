import { describe, expect, it, vi } from "vitest";
import type { QueryClient } from "@tanstack/vue-query";
import { invalidateActivityDashboard } from "./invalidation";

describe("invalidateActivityDashboard", () => {
  it("invalidates the Activity dashboard query without exposing its key to the caller", async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const queryClient = { invalidateQueries } as unknown as QueryClient;

    await invalidateActivityDashboard(queryClient);

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["identity", "activity", "dashboard"],
    });
  });
});
