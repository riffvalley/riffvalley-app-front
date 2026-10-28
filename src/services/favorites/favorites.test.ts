import { beforeEach, describe, expect, it, vi } from "vitest";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("@services/api/api.ts", () => ({ default: { get } }));

import { getFavoritesByUser } from "./favorites";

describe("getFavoritesByUser", () => {
  beforeEach(() => {
    get.mockReset().mockResolvedValue({ data: { totalItems: 1, data: [] } });
  });

  it("sends pagination and combined filters for the personal favorites mode", async () => {
    const dateRange: [string, string] = ["2025-01-01T00:00:00.000Z", "2025-12-31T23:59:59.999Z"];

    await getFavoritesByUser(
      20,
      60,
      "artist",
      dateRange,
      "genre-1",
      "country-1",
      undefined,
      "disc.releaseDate:DESC"
    );

    expect(get).toHaveBeenCalledWith("/favorites", {
      params: {
        limit: 20,
        offset: 60,
        query: "artist",
        dateRange,
        genre: "genre-1",
        country: "country-1",
        type: undefined,
        orderBy: "disc.releaseDate:DESC",
      },
    });
  });
});
