import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchUserFavorites,
  getCommunityFavorite,
  isCommunityFavoriteSubmitting,
  seedCommunityFavorite,
  toggleCommunityFavorite,
} from "../../../../src/app/dependencies/community";
import { communityFavoriteState } from "../../../../src/modules/community/favorites/application/favoriteState";
import { removeFavoriteFromList } from "../../../../src/views/discsList/favoriteList";

const { get, post, deleteRequest } = vi.hoisted(() => ({
  get: vi.fn(), post: vi.fn(), deleteRequest: vi.fn(),
}));
vi.mock("@/shared/infrastructure/http/client", () => ({
  default: { get, post, delete: deleteRequest },
}));
vi.mock("../../../../src/app/dependencies/identity", () => ({
  useAuthStore: () => ({ loggedUser: { id: "user-1", username: "tester" } }),
}));

const disc = {
  id: "disc-1", name: "Album", image: "/album.jpg", releaseDate: "2026-01-01",
  artist: { id: "artist-1", name: "Artist", country: { id: "es", name: "Spain", isoCode: "es" } },
  genre: { name: "Rock", color: "#123456" },
  userRate: { id: "rate-1", rate: "8.5", cover: "9" },
  userPending: { id: "pending-1" }, commentCount: 3, voteCount: 4,
};

describe("Community favorites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    communityFavoriteState.clear();
    post.mockResolvedValue({ data: { id: "favorite-1" } });
    deleteRequest.mockResolvedValue({ data: undefined });
    get.mockResolvedValue({ data: { totalItems: 1, data: [{ id: "favorite-1", disc }] } });
  });

  it("loads the user's filtered page without taking ownership of its query cache", async () => {
    const dateRange: [string, string] = ["2026-01-01", "2026-01-31"];
    const result = await fetchUserFavorites({
      limit: 20, offset: 40, query: "album", dateRange, genre: "rock", country: "es",
      type: undefined, orderBy: "disc.releaseDate:ASC,artist.name:ASC",
    });

    expect(get).toHaveBeenCalledWith("/favorites", { params: {
      limit: 20, offset: 40, query: "album", dateRange, genre: "rock", country: "es",
      type: undefined, orderBy: "disc.releaseDate:ASC,artist.name:ASC",
    } });
    expect(result).toMatchObject({ totalItems: 1, data: [{
      id: "favorite-1", disc: { id: "disc-1", artist: { country: { isoCode: "es" } },
        userRate: { rate: 8.5, cover: 9 }, pendingId: "pending-1" },
    }] });
    expect(getCommunityFavorite("user-1", "disc-1")).toEqual({ favoriteId: null, loaded: false });
  });

  it("adds a favorite only after the backend confirms success", async () => {
    seedCommunityFavorite("user-1", "disc-1", null);
    let complete!: (value: { data: { id: string } }) => void;
    post.mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; }));

    const saving = toggleCommunityFavorite("user-1", "disc-1");
    expect(getCommunityFavorite("user-1", "disc-1").favoriteId).toBeNull();
    expect(isCommunityFavoriteSubmitting("user-1", "disc-1")).toBe(true);
    complete({ data: { id: "favorite-1" } });

    await expect(saving).resolves.toBe("favorite-1");
    expect(getCommunityFavorite("user-1", "disc-1")).toEqual({ favoriteId: "favorite-1", loaded: true });
  });

  it("removes a favorite only after the backend confirms success", async () => {
    seedCommunityFavorite("user-1", "disc-1", "favorite-1");
    let complete!: () => void;
    deleteRequest.mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; }));

    const removing = toggleCommunityFavorite("user-1", "disc-1");
    expect(getCommunityFavorite("user-1", "disc-1").favoriteId).toBe("favorite-1");
    complete();

    await expect(removing).resolves.toBeNull();
    expect(deleteRequest).toHaveBeenCalledWith("/favorites/favorite-1");
    expect(getCommunityFavorite("user-1", "disc-1")).toEqual({ favoriteId: null, loaded: true });
  });

  it("preserves the last confirmed state after errors and permits retries for add and remove", async () => {
    const store = communityFavoriteState;
    store.seed("user-1", "disc-1", null);
    post.mockRejectedValueOnce(new Error("offline"));
    await expect(toggleCommunityFavorite("user-1", "disc-1")).rejects.toThrow("offline");
    expect(store.get("user-1", "disc-1").favoriteId).toBeNull();
    await expect(toggleCommunityFavorite("user-1", "disc-1")).resolves.toBe("favorite-1");

    deleteRequest.mockRejectedValueOnce(new Error("offline"));
    await expect(toggleCommunityFavorite("user-1", "disc-1")).rejects.toThrow("offline");
    expect(store.get("user-1", "disc-1").favoriteId).toBe("favorite-1");
    await expect(toggleCommunityFavorite("user-1", "disc-1")).resolves.toBeNull();
  });

  it("blocks duplicate sends across consumers and shares the confirmed state", async () => {
    seedCommunityFavorite("user-1", "disc-1", null);
    let complete!: (value: { data: { id: string } }) => void;
    post.mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; }));

    const firstConsumer = toggleCommunityFavorite("user-1", "disc-1");
    const secondConsumer = toggleCommunityFavorite("user-1", "disc-1");
    await expect(secondConsumer).resolves.toBe(false);
    expect(post).toHaveBeenCalledTimes(1);
    complete({ data: { id: "favorite-1" } });
    await firstConsumer;

    expect(getCommunityFavorite("user-1", "disc-1").favoriteId).toBe("favorite-1");
    expect(communityFavoriteState.get("user-1", "disc-1").favoriteId).toBe("favorite-1");
  });

  it("does not restore a relation when an in-flight mutation completes after session cleanup", async () => {
    const store = communityFavoriteState;
    store.seed("user-1", "disc-1", null);
    let complete!: (value: { data: { id: string } }) => void;
    post.mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; }));
    const mutation = toggleCommunityFavorite("user-1", "disc-1");

    store.clear();
    complete({ data: { id: "favorite-1" } });

    await expect(mutation).resolves.toBe(false);
    expect(store.get("user-1", "disc-1")).toEqual({ favoriteId: null, loaded: false });
  });

  it("rejects an incompatible list response", async () => {
    get.mockResolvedValueOnce({ data: { totalItems: "wrong", data: [] } });
    await expect(fetchUserFavorites({ limit: 20, offset: 0 })).rejects.toThrow("formato esperado");
  });

  it("updates the active favorites page after confirmed removal without changing its remaining order", () => {
    const page = [
      { id: "disc-1", name: "First" },
      { id: "disc-2", name: "Second" },
      { id: "disc-3", name: "Third" },
    ];
    expect(removeFavoriteFromList(page, "disc-2", 20, 41, "41")).toEqual({
      discs: [{ id: "disc-1", name: "First" }, { id: "disc-3", name: "Third" }],
      offset: 19, totalItems: 40, totalFavorites: "40", hasMore: true,
    });
    expect(removeFavoriteFromList(page, "missing", 20, 41, "41")).toBeNull();
  });
});
