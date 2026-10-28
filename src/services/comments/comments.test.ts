import { beforeEach, describe, expect, it, vi } from "vitest";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("@services/api/api.ts", () => ({ default: { get } }));

import { getCommentsByUser } from "./comments";

describe("getCommentsByUser", () => {
  beforeEach(() => {
    get.mockReset().mockResolvedValue({ data: { totalItems: 1, data: [] } });
  });

  it("sends pagination and combined filters for the personal comments mode", async () => {
    const dateRange: [string, string] = ["2025-02-01T00:00:00.000Z", "2025-02-28T23:59:59.999Z"];

    await getCommentsByUser(
      20,
      20,
      "álbum",
      dateRange,
      "genre-1",
      "country-1",
      "disc.releaseDate:ASC"
    );

    expect(get).toHaveBeenCalledWith("/comments", {
      params: {
        limit: 20,
        offset: 20,
        query: "álbum",
        dateRange,
        genre: "genre-1",
        country: "country-1",
        type: "comment",
        orderBy: "disc.releaseDate:ASC",
      },
    });
  });
});
