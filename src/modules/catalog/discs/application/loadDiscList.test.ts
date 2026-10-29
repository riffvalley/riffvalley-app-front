import { beforeEach, describe, expect, it, vi } from "vitest";

const getDiscListPage = vi.hoisted(() => vi.fn());
vi.mock("../api/discList", () => ({ getDiscListPage }));

import { loadDiscList } from "./loadDiscList";
import type { DiscListApiCard, DiscListApiComment, DiscListRequest } from "../types/discList";

const baseRequest: DiscListRequest = {
  mode: "all",
  query: "rock",
  dateRange: ["2025-01-01T00:00:00.000Z", "2025-12-31T23:59:59.999Z"],
  genreIds: ["genre-a"],
  countryId: "country-a",
  orderBy: "disc.releaseDate:DESC,artist.name:ASC",
  offset: 0,
  limit: 20,
};

function card(overrides: Partial<DiscListApiCard> = {}): DiscListApiCard {
  return {
    id: "disc-1",
    entryId: "entry-1",
    itemType: "disc",
    name: "Disco",
    image: "cover.jpg",
    releaseDate: "2025-01-01",
    link: "https://music.test/album",
    ep: false,
    debut: true,
    artist: { name: "Artista", country: { id: "country-a", name: "España", isoCode: "ES" } },
    genre: { id: "genre-a", name: "Rock", color: "#123456" },
    averageRate: 8.5,
    averageCover: 7.5,
    voteCount: 3,
    commentCount: 2,
    userRate: { id: "rate-1", rate: 9, cover: 8 },
    favoriteId: "favorite-1",
    pendingId: "pending-1",
    ...overrides,
  };
}

function page<T>(data: T[]) {
  return { data, totalItems: 41, totalPages: 3, currentPage: 1, limit: 20 };
}

beforeEach(() => {
  getDiscListPage.mockReset().mockResolvedValue(page([card()]));
});

describe("loadDiscList", () => {
  it.each(["all", "rates", "covers", "comments", "favorites", "pendientes"] as const)(
    "uses the same list adapter and preserves the %s mode",
    async (mode) => {
      const response =
        mode === "comments"
          ? page<DiscListApiComment>([
              {
                itemType: "comment",
                entryId: "comment-1",
                comment: "Comentario",
                createdAt: "2025-01-01",
                disc: {
                  id: "disc-1",
                  name: "Disco",
                  image: "cover.jpg",
                  releaseDate: "2025-01-01",
                  artist: { name: "Artista", country: null },
                  genre: null,
                },
              },
            ])
          : page<DiscListApiCard>([
              card({
                itemType:
                  mode === "all"
                    ? "disc"
                    : mode === "rates"
                      ? "rate"
                      : mode === "covers"
                        ? "cover"
                        : mode === "favorites"
                          ? "favorite"
                          : "pending",
              }),
            ]);
      getDiscListPage.mockResolvedValueOnce(response);
      const result = await loadDiscList({ ...baseRequest, mode });
      expect(getDiscListPage).toHaveBeenCalledWith({ ...baseRequest, mode });
      expect(result.mode).toBe(mode);
      expect(result.totalItems).toBe(41);
      if (mode === "comments") expect(result).toMatchObject({ comments: [{ id: "comment-1" }] });
      else expect(result.data).toHaveLength(1);
    }
  );

  it("maps the card DTO to DiscCard fields and keeps private community metadata", async () => {
    const result = await loadDiscList(baseRequest);
    if (result.mode === "comments") throw new Error("unexpected mode");
    expect(result.data[0]).toMatchObject({
      id: "disc-1",
      image: "cover.jpg",
      artist: { name: "Artista", country: { id: "country-a", isoCode: "ES" } },
      genre: { id: "genre-a", name: "Rock", color: "#123456" },
      averageRate: 8.5,
      averageCover: 7.5,
      userRate: { id: "rate-1", rate: 9, cover: 8 },
      favoriteId: "favorite-1",
      pendingId: "pending-1",
      commentCount: 2,
      voteCount: 3,
      debut: true,
    });
  });

  it("preserves repeated discs as distinct comment rows", async () => {
    const comment = (entryId: string): DiscListApiComment => ({
      itemType: "comment",
      entryId,
      comment: `Comentario ${entryId}`,
      createdAt: "2025-03-01T12:00:00.000Z",
      disc: {
        id: "same-disc",
        name: "Disco repetido",
        image: "cover.jpg",
        releaseDate: "2025-01-01",
        artist: { name: "Artista", country: null },
        genre: { id: "genre-a", name: "Rock", color: null },
      },
    });
    getDiscListPage.mockResolvedValueOnce(page([comment("comment-1"), comment("comment-2")]));

    const result = await loadDiscList({ ...baseRequest, mode: "comments" });
    expect(result.mode).toBe("comments");
    if (result.mode !== "comments") throw new Error("unexpected mode");
    expect(result.comments.map(({ id, disc }) => [id, disc.id])).toEqual([
      ["comment-1", "same-disc"],
      ["comment-2", "same-disc"],
    ]);
  });

  it("normalizes null card values to the legacy DiscCard contract", async () => {
    getDiscListPage.mockResolvedValueOnce(
      page([card({ image: null, releaseDate: null, userRate: null })])
    );
    const result = await loadDiscList(baseRequest);
    if (result.mode === "comments") throw new Error("unexpected mode");
    expect(result.data[0]).toMatchObject({ image: "", releaseDate: "", userRate: null });
  });
});
