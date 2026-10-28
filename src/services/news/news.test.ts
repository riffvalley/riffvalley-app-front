import { beforeEach, describe, expect, it, vi } from "vitest";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@services/api/api", () => ({ default: { get } }));

import { getNewsFeed, getSourceFeed } from "./news";

describe("News feed service", () => {
  beforeEach(() => get.mockReset());

  it("keeps the aggregated feed endpoint and forwards its cancellation signal", async () => {
    const response = { posts: [] };
    const controller = new AbortController();
    get.mockResolvedValue({ data: response });

    await expect(getNewsFeed(controller.signal)).resolves.toBe(response);
    expect(get).toHaveBeenCalledWith("/news/feed", { signal: controller.signal });
  });

  it("keeps source filters and forwards cancellation without changing query params", async () => {
    const response = { posts: [] };
    const params = { source: "app" as const, type: "team_notes" as const };
    const controller = new AbortController();
    get.mockResolvedValue({ data: response });

    await expect(getSourceFeed(params, controller.signal)).resolves.toBe(response);
    expect(get).toHaveBeenCalledWith("/news/source-feed", {
      params,
      signal: controller.signal,
    });
  });
});
