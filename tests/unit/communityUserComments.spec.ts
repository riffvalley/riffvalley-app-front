import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchUserComments } from "../../src/app/dependencies/community";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@services/api/api", () => ({ default: { get } }));
vi.mock("../../src/app/dependencies/identity", () => ({
  useAuthStore: () => ({ loggedUser: { id: "user-1", username: "tester" } }),
}));

describe("Community user's comments query", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({ data: { totalItems: 1, data: [{
      id: "comment-1", comment: "Great album", createdAt: "2026-01-02",
      disc: {
        id: "disc-1", name: "Album", image: undefined, releaseDate: undefined,
        artist: { name: "Artist", country: null }, genre: { name: "Rock" },
      },
    }] } });
  });

  it("keeps endpoint, filters, order and pagination and preserves the Catalog disc projection", async () => {
    const dateRange: [string, string] = ["2026-01-01", "2026-01-31"];
    const result = await fetchUserComments({
      limit: 20, offset: 40, query: "great", dateRange, genre: "rock", country: "es",
      orderBy: "disc.releaseDate:DESC,artist.name:ASC",
    });

    expect(get).toHaveBeenCalledWith("/comments", { params: {
      limit: 20, offset: 40, query: "great", dateRange, genre: "rock", country: "es",
      type: "comment", orderBy: "disc.releaseDate:DESC,artist.name:ASC",
    } });
    expect(result).toEqual({ totalItems: 1, data: [{
      id: "comment-1", comment: "Great album", createdAt: "2026-01-02",
      disc: {
        id: "disc-1", name: "Album", image: undefined, releaseDate: undefined,
        artist: { name: "Artist", country: null }, genre: { name: "Rock" },
      },
    }] });
  });

  it("preserves an empty page", async () => {
    get.mockResolvedValue({ data: { totalItems: 0, data: [] } });
    await expect(fetchUserComments({ limit: 20, offset: 0 })).resolves.toEqual({ totalItems: 0, data: [] });
  });

  it("propagates transport errors and rejects incompatible response data", async () => {
    const failure = new Error("offline");
    get.mockRejectedValueOnce(failure);
    await expect(fetchUserComments({ limit: 20, offset: 0 })).rejects.toBe(failure);

    get.mockResolvedValueOnce({ data: { totalItems: "wrong", data: [] } });
    await expect(fetchUserComments({ limit: 20, offset: 0 })).rejects.toThrow("formato esperado");

    get.mockResolvedValueOnce({ data: { totalItems: 1, data: [{
      id: "comment-1", comment: "Text", createdAt: "2026-01-02", disc: { id: 4, name: "Album" },
    }] } });
    await expect(fetchUserComments({ limit: 20, offset: 0 })).rejects.toThrow("ficha del disco");
  });
});
