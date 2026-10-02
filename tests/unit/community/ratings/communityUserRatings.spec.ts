import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchUserRatings } from "../../../../src/app/dependencies/community";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/shared/infrastructure/http/client", () => ({ default: { get } }));

describe("Community user ratings query", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({ data: { totalItems: 1, data: [] } });
  });

  it("keeps search, date range, genre, country, ordering and page parameters", async () => {
    const params = {
      limit: 20,
      offset: 40,
      query: "album",
      dateRange: ["2026-01-01T00:00:00.000Z", "2026-01-31T23:59:59.999Z"] as [string, string],
      genre: "rock",
      country: "es",
      type: "cover" as const,
      orderBy: "rate.cover:DESC,artist.name:ASC",
    };

    await expect(fetchUserRatings(params)).resolves.toEqual({ totalItems: 1, data: [] });
    expect(get).toHaveBeenCalledWith("/rates", { params });
  });

  it("supports the unfiltered monthly vote query used by Editorial", async () => {
    await fetchUserRatings({ limit: 500, offset: 0, dateRange: ["from", "to"], type: "rate", orderBy: "rate.rate:DESC,artist.name:ASC" });
    expect(get).toHaveBeenCalledWith("/rates", { params: {
      limit: 500, offset: 0, query: undefined, dateRange: ["from", "to"], genre: undefined,
      country: undefined, type: "rate", orderBy: "rate.rate:DESC,artist.name:ASC",
    } });
  });

  it("validates the API page and maps the nested disc projection at app composition", async () => {
    get.mockResolvedValueOnce({ data: { totalItems: 1, data: [{ id: "rate-1", rate: "8.5", cover: "9", disc: {
      id: "disc-1", name: "Album", userRate: { id: "rate-1", rate: "8.5", cover: "9" },
    } }] } });
    await expect(fetchUserRatings({ limit: 20, offset: 0, type: "rate" })).resolves.toMatchObject({
      data: [{ id: "rate-1", disc: { id: "disc-1", name: "Album", userRate: { rate: 8.5, cover: 9 } } }],
    });
    get.mockResolvedValueOnce({ data: { totalItems: "wrong", data: [] } });
    await expect(fetchUserRatings({ limit: 20, offset: 0, type: "rate" })).rejects.toThrow("formato esperado");
  });
});
