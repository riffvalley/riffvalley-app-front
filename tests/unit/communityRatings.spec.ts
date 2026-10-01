import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadCommunityRating, saveCommunityCoverVote, saveCommunityRating } from "../../src/app/dependencies/community";
import { communityRatingState } from "../../src/modules/community/ratings/application/ratingState";

const { listByDisc, create, update } = vi.hoisted(() => ({
  listByDisc: vi.fn(), create: vi.fn(), update: vi.fn(),
}));
vi.mock("@/modules/community/ratings/infrastructure/ratingApi", () => ({
  ratingApi: { listByDisc, create, update },
}));

const input = { userId: "user-1", discId: "disc-1", rate: 8, cover: null };
const ownVote = { id: "rate-1", user: { id: "user-1", username: "ana" }, rate: 8, cover: 0 };

describe("Community disc ratings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    communityRatingState.clear();
    create.mockResolvedValue("rate-1");
    update.mockResolvedValue(undefined);
    listByDisc.mockResolvedValue([ownVote, {
      id: "rate-2", user: { id: "user-2", username: "bea" }, rate: 6, cover: 9,
    }]);
  });

  it("creates a partial vote, then refreshes the own value, averages and disc vote count", async () => {
    await saveCommunityRating(input);

    expect(create).toHaveBeenCalledWith({
      discId: "disc-1", ratingId: null, rate: 8, cover: null,
    });
    expect(update).not.toHaveBeenCalled();
    expect(communityRatingState.get("user-1", "disc-1")).toEqual({
      ratingId: "rate-1", rate: 8, cover: null, averageRate: 7, averageCover: 9,
      voteCount: 2, summaryLoaded: true,
    });
  });

  it("edits the existing vote using its rating ID", async () => {
    communityRatingState.seed("user-1", "disc-1", {
      ratingId: "rate-1", rate: 7, cover: 5, averageRate: 7, averageCover: 5,
      voteCount: 1, summaryLoaded: false,
    });

    await saveCommunityRating({ ...input, rate: null, cover: 9 });

    expect(create).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({
      discId: "disc-1", ratingId: "rate-1", rate: null, cover: 9,
    });
    expect(communityRatingState.get("user-1", "disc-1").rate).toBe(null);
    expect(communityRatingState.get("user-1", "disc-1").cover).toBe(9);
  });

  it("loads the signed-in user's vote into Community state", async () => {
    await expect(loadCommunityRating("user-1", "disc-1")).resolves.toMatchObject({
      ratingId: "rate-1", rate: 8, cover: 0, averageRate: 7, averageCover: 9,
    });
    expect(listByDisc).toHaveBeenCalledWith("disc-1");
  });

  it("creates or updates the cover vote while preserving the existing disc rating", async () => {
    await saveCommunityCoverVote({ userId: "user-1", discId: "disc-1", cover: 8.5 });
    expect(create).toHaveBeenCalledWith({ discId: "disc-1", ratingId: null, rate: null, cover: 8.5 });

    communityRatingState.set("user-1", "disc-1", {
      ratingId: "rate-1", rate: 7, cover: 5, averageRate: 7, averageCover: 5,
      voteCount: 1, summaryLoaded: false,
    });
    await saveCommunityCoverVote({ userId: "user-1", discId: "disc-1", cover: 9 });
    expect(update).toHaveBeenCalledWith({ discId: "disc-1", ratingId: "rate-1", rate: 7, cover: 9 });
  });

  it("rejects cover values outside the supported range or half-point increments", async () => {
    await expect(saveCommunityCoverVote({ userId: "user-1", discId: "disc-1", cover: 10.5 })).resolves.toBe(false);
    await expect(saveCommunityCoverVote({ userId: "user-1", discId: "disc-1", cover: 7.2 })).resolves.toBe(false);
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("keeps UI state unchanged after a write failure and permits retry", async () => {
    const store = communityRatingState;
    store.seed("user-1", "disc-1", {
      ratingId: null, rate: null, cover: null, averageRate: 6, averageCover: 7,
      voteCount: 3, summaryLoaded: false,
    });
    create.mockRejectedValueOnce(new Error("offline"));

    await expect(saveCommunityRating(input)).rejects.toThrow("offline");
    expect(store.get("user-1", "disc-1")).toMatchObject({
      ratingId: null, rate: null, cover: null, averageRate: 6, voteCount: 3,
    });
    await saveCommunityRating(input);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("shares a submission lock across card instances for the same user and disc", async () => {
    let resolveCreate!: (id: string) => void;
    create.mockImplementationOnce(() => new Promise<string>((resolve) => { resolveCreate = resolve; }));

    const firstCard = saveCommunityRating(input);
    const secondCard = saveCommunityRating(input);
    expect(create).toHaveBeenCalledTimes(1);
    expect(communityRatingState.isSubmitting("user-1", "disc-1")).toBe(true);

    resolveCreate("rate-1");
    await expect(firstCard).resolves.toBe(true);
    await expect(secondCard).resolves.toBe(false);
    expect(create).toHaveBeenCalledTimes(1);
    expect(communityRatingState.isSubmitting("user-1", "disc-1")).toBe(false);
  });

  it("keeps a saved vote when loading the refreshed summary fails", async () => {
    listByDisc.mockRejectedValue(new Error("summary unavailable"));

    await saveCommunityRating(input);

    expect(communityRatingState.get("user-1", "disc-1")).toMatchObject({
      ratingId: "rate-1", rate: 8, cover: null, summaryLoaded: false,
    });
  });

  it("does not restore a vote when a write completes after session cleanup", async () => {
    const store = communityRatingState;
    let complete!: (id: string) => void;
    create.mockImplementationOnce(() => new Promise<string>((resolve) => { complete = resolve; }));
    const mutation = saveCommunityRating(input);

    store.clear();
    complete("rate-1");

    await expect(mutation).resolves.toBe(false);
    expect(store.get("user-1", "disc-1")).toEqual({
      ratingId: null, rate: null, cover: null, averageRate: null, averageCover: null,
      voteCount: null, summaryLoaded: false,
    });
  });
});
