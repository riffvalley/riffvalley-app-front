import { beforeEach, describe, expect, it, vi } from "vitest";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@services/api/api.ts", () => ({ default: { get } }));

import { getAllGenres } from "./genres";

describe("genre service", () => {
  beforeEach(() => get.mockReset());

  it("loads all genres through the backend's paginated endpoint", async () => {
    const signal = new AbortController().signal;
    const firstPage = [{ id: "genre-1", name: "Rock", color: "#123456" }];
    const secondPage = [{ id: "genre-2", name: "Jazz", color: "#654321" }];
    get
      .mockResolvedValueOnce({
        data: { totalItems: 301, totalPages: 2, currentPage: 1, limit: 300, data: firstPage },
      })
      .mockResolvedValueOnce({
        data: { totalItems: 301, totalPages: 2, currentPage: 2, limit: 300, data: secondPage },
      });

    await expect(getAllGenres(signal)).resolves.toEqual([...firstPage, ...secondPage]);
    expect(get).toHaveBeenNthCalledWith(1, "/genres", {
      params: { limit: 300, offset: 0 },
      signal,
    });
    expect(get).toHaveBeenNthCalledWith(2, "/genres", {
      params: { limit: 300, offset: 300 },
      signal,
    });
  });

  it("stops at an empty page", async () => {
    get.mockResolvedValueOnce({
      data: { totalItems: 301, totalPages: 2, currentPage: 1, limit: 300, data: [] },
    });

    await expect(getAllGenres()).resolves.toEqual([]);
    expect(get).toHaveBeenCalledOnce();
  });
});
