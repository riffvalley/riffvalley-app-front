import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@services/api/api";
import { getArtistDirectory } from "./artistDirectory";

vi.mock("@services/api/api", () => ({ default: { get: vi.fn() } }));

describe("getArtistDirectory", () => {
  beforeEach(() => vi.mocked(api.get).mockReset());

  it("requests a page from the directory endpoint and forwards cancellation", async () => {
    const page = { totalItems: 0, totalPages: 0, currentPage: 1, limit: 100, data: [] };
    const signal = new AbortController().signal;
    vi.mocked(api.get).mockResolvedValue({ data: page });

    await expect(
      getArtistDirectory({ letter: "#", limit: 100, offset: 200 }, signal)
    ).resolves.toEqual(page);

    expect(api.get).toHaveBeenCalledWith("/artists/directory", {
      params: { letter: "#", limit: 100, offset: 200 },
      signal,
    });
  });

  it("sends a textual query with the selected letter preserved in state only", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { totalItems: 0, totalPages: 0, currentPage: 1, limit: 100, data: [] },
    });

    await getArtistDirectory({ letter: "T", q: "Beatles", limit: 100, offset: 0 });

    expect(api.get).toHaveBeenCalledWith("/artists/directory", {
      params: { letter: "T", q: "Beatles", limit: 100, offset: 0 },
      signal: undefined,
    });
  });

  it("sends the selected genre alongside letter and textual search", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { totalItems: 0, totalPages: 0, currentPage: 1, limit: 100, data: [] },
    });

    await getArtistDirectory({
      letter: "T",
      q: "Radiohead",
      genreId: "e6d53d47-71e5-4cbe-9abf-99ff4dcff9fd",
      limit: 100,
      offset: 0,
    });

    expect(api.get).toHaveBeenCalledWith("/artists/directory", {
      params: {
        letter: "T",
        q: "Radiohead",
        genreId: "e6d53d47-71e5-4cbe-9abf-99ff4dcff9fd",
        limit: 100,
        offset: 0,
      },
      signal: undefined,
    });
  });
});
