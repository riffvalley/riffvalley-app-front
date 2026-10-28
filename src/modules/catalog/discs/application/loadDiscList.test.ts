import { beforeEach, describe, expect, it, vi } from "vitest";

const services = vi.hoisted(() => ({
  getDiscs: vi.fn(),
  getRatesByUser: vi.fn(),
  getCommentsByUser: vi.fn(),
  getFavoritesByUser: vi.fn(),
  getPendingsByUser: vi.fn(),
}));

vi.mock("@services/discs/discs", () => ({ getDiscs: services.getDiscs }));
vi.mock("@services/rates/rates", () => ({ getRatesByUser: services.getRatesByUser }));
vi.mock("@services/comments/comments", () => ({ getCommentsByUser: services.getCommentsByUser }));
vi.mock("@services/favorites/favorites", () => ({
  getFavoritesByUser: services.getFavoritesByUser,
}));
vi.mock("@services/pendings/pendings", () => ({ getPendingsByUser: services.getPendingsByUser }));

import { loadDiscList } from "./loadDiscList";
import type { DiscListRequest } from "../types/discList";

const dateRange: [string, string] = ["2025-01-01T00:00:00.000Z", "2025-12-31T23:59:59.999Z"];
const request: DiscListRequest = {
  mode: "all",
  query: "artista",
  dateRange,
  genre: "genre-1",
  country: "country-1",
  orderBy: "disc.releaseDate:ASC,artist.name:ASC",
  offset: 40,
  limit: 20,
};

function page<T>(data: T[], totalItems = 60) {
  return { data, totalItems, totalPages: 3, currentPage: 3, limit: 20 };
}

function disc(id = "disc-1") {
  return {
    id,
    name: "Disco",
    description: "",
    image: "cover.jpg",
    releaseDate: "2025-01-01",
    artist: { id: "artist-1", name: "Artista", description: "", image: "" },
    verified: true,
    commentCount: 2,
    voteCount: 3,
    userRate: { id: "rate-1", rate: "8.50", cover: null },
  };
}

beforeEach(() => {
  for (const service of Object.values(services)) service.mockReset().mockResolvedValue(page([]));
});

describe("loadDiscList", () => {
  it("routes all mode with the original filters, sort, pagination, and UNVOTED parameters", async () => {
    services.getDiscs.mockResolvedValueOnce(page([disc()]));
    const result = await loadDiscList({ ...request, orderBy: "UNVOTED:cover" });

    expect(services.getDiscs).toHaveBeenCalledWith(
      20,
      40,
      "artista",
      dateRange,
      "genre-1",
      "country-1",
      "disc.releaseDate:DESC,artist.name:ASC",
      false,
      "cover"
    );
    expect(result).toMatchObject({
      mode: "all",
      totalItems: 60,
      totalPages: 3,
      currentPage: 3,
      limit: 20,
    });
    expect(result.data[0].userRate).toEqual({ id: "rate-1", rate: 8.5, cover: null });
  });

  it.each([
    ["rates", "rate"],
    ["covers", "cover"],
  ] as const)(
    "routes %s through rates with the personal type and normalizes its response",
    async (mode, type) => {
      const sourceDisc = disc();
      services.getRatesByUser.mockResolvedValueOnce(
        page([{ id: "my-rate", rate: "9.25", cover: null, disc: sourceDisc }])
      );
      const result = await loadDiscList({ ...request, mode });

      expect(services.getRatesByUser).toHaveBeenCalledWith(
        20,
        40,
        "artista",
        dateRange,
        "genre-1",
        "country-1",
        type,
        request.orderBy
      );
      expect(result.data[0]).toMatchObject({
        id: "disc-1",
        artist: { country: null },
        userRate: { id: "my-rate", rate: 9.25, cover: null },
        commentCount: 2,
        voteCount: 3,
      });
      expect(sourceDisc.artist).not.toHaveProperty("country");
    }
  );

  it("routes comments with the static comment type and preserves the paged records", async () => {
    const comments = [
      { id: "comment-1", comment: "Mi comentario", createdAt: "2025-03-01", disc: disc() },
    ];
    services.getCommentsByUser.mockResolvedValueOnce(page(comments));

    const result = await loadDiscList({ ...request, mode: "comments" });

    expect(services.getCommentsByUser).toHaveBeenCalledWith(
      20,
      40,
      "artista",
      dateRange,
      "genre-1",
      "country-1",
      request.orderBy
    );
    expect(result).toMatchObject({
      mode: "comments",
      comments,
      totalItems: 60,
      totalPages: 3,
      currentPage: 3,
      limit: 20,
    });
  });

  it("routes favorites with the original undefined type and normalizes personal fields", async () => {
    services.getFavoritesByUser.mockResolvedValueOnce(
      page([
        {
          id: "favorite-1",
          disc: { ...disc(), userPending: { id: "pending-1" } },
        },
      ])
    );

    const result = await loadDiscList({ ...request, mode: "favorites" });

    expect(services.getFavoritesByUser).toHaveBeenCalledWith(
      20,
      40,
      "artista",
      dateRange,
      "genre-1",
      "country-1",
      undefined,
      request.orderBy
    );
    expect(result.data[0]).toMatchObject({
      favoriteId: "favorite-1",
      pendingId: "pending-1",
      userRate: { id: "rate-1", rate: 8.5, cover: null },
    });
  });

  it("routes pendings without orderBy and retains personal pending data", async () => {
    services.getPendingsByUser.mockResolvedValueOnce(page([{ id: "pending-1", disc: disc() }]));

    const result = await loadDiscList({ ...request, mode: "pendientes" });

    expect(services.getPendingsByUser).toHaveBeenCalledWith(
      20,
      40,
      "artista",
      dateRange,
      "genre-1",
      "country-1"
    );
    expect(result.data[0]).toMatchObject({
      pendingId: "pending-1",
      userRate: { rate: 8.5, cover: null },
    });
  });

  it("preserves empty results, pagination metadata, and service errors", async () => {
    services.getDiscs.mockResolvedValueOnce({
      data: [],
      totalItems: 0,
      totalPages: 0,
      currentPage: 1,
      limit: 20,
    });
    await expect(loadDiscList({ ...request, offset: 0 })).resolves.toMatchObject({
      data: [],
      totalItems: 0,
      totalPages: 0,
      currentPage: 1,
      limit: 20,
    });

    const failure = new Error("private endpoint failed");
    services.getPendingsByUser.mockRejectedValueOnce(failure);
    await expect(loadDiscList({ ...request, mode: "pendientes" })).rejects.toBe(failure);
  });
});
