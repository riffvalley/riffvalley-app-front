import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { fetchCommunityDiscList } from "../../../src/app/dependencies/community";

const { fetchDiscList } = vi.hoisted(() => ({ fetchDiscList: vi.fn() }));
vi.mock("@/app/dependencies/catalog", () => ({ fetchDiscList }));
vi.mock("@/app/dependencies/identity", () => ({
  useAuthStore: () => ({ loggedUser: { id: "user-1", username: "tester" } }),
}));

describe("Community composition for Catalog disc rows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    fetchDiscList.mockResolvedValue({
      totalItems: 1, totalPages: 1, currentPage: 1, limit: 20,
      data: [{
        id: "disc-1", name: "Album", artist: { id: "artist-1", name: "Artist", country: null },
        userRate: { id: "rate-1", rate: "8.5", cover: "9" }, pendingId: "pending-1",
        averageRate: 7.5, averageCover: 8, voteCount: 2, commentCount: 3,
      }],
    });
  });

  it("keeps Catalog's page owner and converts mixed Community projections only in app", async () => {
    const query = { limit: 20, offset: 0, query: "album" };
    const result = await fetchCommunityDiscList(query);

    expect(fetchDiscList).toHaveBeenCalledWith(query);
    expect(result.data[0]).toMatchObject({
      id: "disc-1", name: "Album", userRate: { id: "rate-1", rate: 8.5, cover: 9 },
      pendingId: "pending-1", averageRate: 7.5, averageCover: 8, voteCount: 2, commentCount: 3,
    });
  });
});
