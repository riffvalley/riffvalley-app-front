import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ENTITY_RESOLUTION_MAX_CONCURRENCY,
  withEntityResolutionConcurrency,
} from "./entityResolutionConcurrency";

describe("entity resolution concurrency limit", () => {
  afterEach(() => vi.useRealTimers());

  it("keeps a burst of requests within the global limit", async () => {
    vi.useFakeTimers();
    let active = 0;
    let maximumActive = 0;
    const requests = Array.from({ length: 12 }, () =>
      withEntityResolutionConcurrency(async () => {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        await new Promise<void>((resolve) => setTimeout(resolve, 1));
        active -= 1;
      })
    );

    await vi.runAllTimersAsync();
    await Promise.all(requests);

    expect(maximumActive).toBe(ENTITY_RESOLUTION_MAX_CONCURRENCY);
    expect(active).toBe(0);
  });
});
