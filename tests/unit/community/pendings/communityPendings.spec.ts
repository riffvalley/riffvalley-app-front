import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchUserPendings,
  getCommunityPending,
  isCommunityPendingSubmitting,
  seedCommunityPending,
  toggleCommunityPending,
} from "../../../../src/app/dependencies/community";
import { communityPendingState } from "../../../../src/modules/community/pendings/application/pendingState";
import { isCurrentPendingListResponse, removePendingFromList } from "../../../../src/views/discsList/pendingList";

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

describe("Community pendings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    communityPendingState.clear();
    post.mockResolvedValue({ data: { id: "pending-1" } });
    deleteRequest.mockResolvedValue({ data: undefined });
    get.mockResolvedValue({ data: { totalItems: 1, data: [{ id: "pending-1", disc }] } });
  });

  it("loads the user's filtered page without mutating the shared relation store", async () => {
    const dateRange: [string, string] = ["2026-01-01", "2026-01-31"];
    const result = await fetchUserPendings({
      limit: 20, offset: 40, query: "album", dateRange, genre: "rock", country: "es",
    });

    expect(get).toHaveBeenCalledWith("/pendings", { params: {
      limit: 20, offset: 40, query: "album", dateRange, genre: "rock", country: "es",
    } });
    expect(result).toMatchObject({ totalItems: 1, data: [{
      id: "pending-1", disc: { id: "disc-1", pendingId: "pending-1", userRate: { rate: 8.5, cover: 9 } },
    }] });
    expect(getCommunityPending("user-1", "disc-1")).toEqual({ pendingId: null, loaded: false });
  });

  it("adds only after backend success and keeps the previous state while saving", async () => {
    seedCommunityPending("user-1", "disc-1", null);
    let complete!: (value: { data: { id: string } }) => void;
    post.mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; }));

    const saving = toggleCommunityPending("user-1", "disc-1");
    expect(getCommunityPending("user-1", "disc-1").pendingId).toBeNull();
    expect(isCommunityPendingSubmitting("user-1", "disc-1")).toBe(true);
    complete({ data: { id: "pending-1" } });

    await expect(saving).resolves.toBe("pending-1");
    expect(getCommunityPending("user-1", "disc-1")).toEqual({ pendingId: "pending-1", loaded: true });
  });

  it("removes only after backend success", async () => {
    seedCommunityPending("user-1", "disc-1", "pending-1");
    let complete!: () => void;
    deleteRequest.mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; }));

    const removing = toggleCommunityPending("user-1", "disc-1");
    expect(getCommunityPending("user-1", "disc-1").pendingId).toBe("pending-1");
    complete();

    await expect(removing).resolves.toBeNull();
    expect(deleteRequest).toHaveBeenCalledWith("/pendings/pending-1");
    expect(getCommunityPending("user-1", "disc-1")).toEqual({ pendingId: null, loaded: true });
  });

  it("keeps confirmed state on errors and allows retries for both directions", async () => {
    const store = communityPendingState;
    store.seed("user-1", "disc-1", null);
    post.mockRejectedValueOnce(new Error("offline"));
    await expect(toggleCommunityPending("user-1", "disc-1")).rejects.toThrow("offline");
    expect(store.get("user-1", "disc-1").pendingId).toBeNull();
    await expect(toggleCommunityPending("user-1", "disc-1")).resolves.toBe("pending-1");

    deleteRequest.mockRejectedValueOnce(new Error("offline"));
    await expect(toggleCommunityPending("user-1", "disc-1")).rejects.toThrow("offline");
    expect(store.get("user-1", "disc-1").pendingId).toBe("pending-1");
    await expect(toggleCommunityPending("user-1", "disc-1")).resolves.toBeNull();
  });

  it("blocks duplicate sends across cards and shares success", async () => {
    seedCommunityPending("user-1", "disc-1", null);
    let complete!: (value: { data: { id: string } }) => void;
    post.mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; }));

    const firstCard = toggleCommunityPending("user-1", "disc-1");
    const secondCard = toggleCommunityPending("user-1", "disc-1");
    await expect(secondCard).resolves.toBe(false);
    expect(post).toHaveBeenCalledTimes(1);
    complete({ data: { id: "pending-1" } });
    await firstCard;

    expect(getCommunityPending("user-1", "disc-1").pendingId).toBe("pending-1");
    expect(communityPendingState.get("user-1", "disc-1").pendingId).toBe("pending-1");
  });

  it("does not restore a relation when an in-flight mutation completes after session cleanup", async () => {
    const store = communityPendingState;
    store.seed("user-1", "disc-1", null);
    let complete!: (value: { data: { id: string } }) => void;
    post.mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; }));
    const mutation = toggleCommunityPending("user-1", "disc-1");

    store.clear();
    complete({ data: { id: "pending-1" } });

    await expect(mutation).resolves.toBe(false);
    expect(store.get("user-1", "disc-1")).toEqual({ pendingId: null, loaded: false });
  });

  it("rejects malformed pages and ignores responses after filters or page change", async () => {
    get.mockResolvedValueOnce({ data: { totalItems: "wrong", data: [] } });
    await expect(fetchUserPendings({ limit: 20, offset: 0 })).rejects.toThrow("formato esperado");

    expect(isCurrentPendingListResponse(3, 3)).toBe(true);
    expect(isCurrentPendingListResponse(2, 3)).toBe(false);
  });

  it("removes a confirmed removal from the active page without reordering remaining discs", () => {
    const page = [{ id: "disc-1" }, { id: "disc-2" }, { id: "disc-3" }];
    expect(removePendingFromList(page, "disc-2", 20, 41, "41")).toEqual({
      discs: [{ id: "disc-1" }, { id: "disc-3" }], offset: 19, totalItems: 40,
      totalPendings: "40", hasMore: true,
    });
    expect(removePendingFromList(page, "missing", 20, 41, "41")).toBeNull();
  });
});
