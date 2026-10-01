// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { communityFavoriteState } from "../../src/modules/community/favorites/application/favoriteState";
import { communityPendingState } from "../../src/modules/community/pendings/application/pendingState";
import { communityRatingState } from "../../src/modules/community/ratings/application/ratingState";

const { loginRequest } = vi.hoisted(() => ({ loginRequest: vi.fn() }));
vi.mock("@/modules/identity", async (importOriginal) => {
  const identity = await importOriginal<typeof import("../../src/modules/identity")>();
  return { ...identity, login: loginRequest };
});

import { useAuthStore } from "../../src/app/dependencies/identity";

const session = (id: string) => ({
  id, token: `token-${id}`, username: id, roles: ["user"], image: null,
  dashboardConfig: null, mobileDashboardConfig: null,
});

describe("Community session state lifecycle", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    communityRatingState.clear();
    communityFavoriteState.clear();
    communityPendingState.clear();
    setActivePinia(createPinia());
  });

  it("clears rating, favorite and pending caches on account change and logout", async () => {
    const ratings = communityRatingState;
    const favorites = communityFavoriteState;
    const pendings = communityPendingState;
    const auth = useAuthStore();
    loginRequest.mockResolvedValueOnce(session("user-1"));
    await auth.login({ username: "user-1", password: "secret" });

    ratings.seed("user-1", "disc-1", {
      ratingId: "rate-1", rate: 8, cover: 9, averageRate: 7, averageCover: 8,
      voteCount: 2, summaryLoaded: true,
    });
    ratings.setVotes("user-1", "disc-1", []);
    favorites.seed("user-1", "disc-1", "favorite-1");
    pendings.seed("user-1", "disc-1", "pending-1");
    const previousGenerations = [ratings.getSessionGeneration(), favorites.getSessionGeneration(), pendings.getSessionGeneration()];

    loginRequest.mockResolvedValueOnce(session("user-2"));
    await auth.login({ username: "user-2", password: "secret" });

    expect(ratings.get("user-1", "disc-1")).toEqual({
      ratingId: null, rate: null, cover: null, averageRate: null, averageCover: null,
      voteCount: null, summaryLoaded: false,
    });
    expect(ratings.getVotes("user-1", "disc-1")).toEqual([]);
    expect(favorites.get("user-1", "disc-1")).toEqual({ favoriteId: null, loaded: false });
    expect(pendings.get("user-1", "disc-1")).toEqual({ pendingId: null, loaded: false });
    expect([ratings.getSessionGeneration(), favorites.getSessionGeneration(), pendings.getSessionGeneration()])
      .toEqual(previousGenerations.map((generation) => generation + 1));

    ratings.seed("user-2", "disc-2", {
      ratingId: null, rate: null, cover: null, averageRate: null, averageCover: null,
      voteCount: null, summaryLoaded: false,
    });
    favorites.seed("user-2", "disc-2", null);
    pendings.seed("user-2", "disc-2", null);
    auth.logout();

    expect(ratings.get("user-2", "disc-2").ratingId).toBeNull();
    expect(favorites.get("user-2", "disc-2")).toEqual({ favoriteId: null, loaded: false });
    expect(pendings.get("user-2", "disc-2")).toEqual({ pendingId: null, loaded: false });
  });
});
