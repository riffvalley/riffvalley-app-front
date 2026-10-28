import { beforeEach, describe, expect, it, vi } from "vitest";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("@services/api/api.ts", () => ({ default: { get } }));

import { getPendingsByUser } from "./pendings";

describe("getPendingsByUser", () => {
  beforeEach(() => {
    get.mockReset().mockResolvedValue({ data: { totalItems: 1, data: [] } });
  });

  it("sends pagination and combined filters for the personal pending mode", async () => {
    const dateRange: [string, string] = ["2025-03-01T00:00:00.000Z", "2025-03-31T23:59:59.999Z"];

    await getPendingsByUser(20, 80, "disco", dateRange, "genre-1", "country-1");

    expect(get).toHaveBeenCalledWith("/pendings", {
      params: {
        limit: 20,
        offset: 80,
        query: "disco",
        dateRange,
        genre: "genre-1",
        country: "country-1",
      },
    });
  });
});
