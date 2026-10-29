import { describe, expect, it } from "vitest";
import {
  getDistinctArtistDirectoryItems,
  getNextArtistDirectoryOffset,
  ARTIST_DIRECTORY_PAGE_SIZE,
} from "./artistDirectoryPagination";
import type { ArtistDirectoryPage } from "../types/artistDirectory";

const item = (id: string) => ({ id, name: id, genre: null, genreColor: null });
const page = (data: ArtistDirectoryPage["data"], totalItems: number): ArtistDirectoryPage => ({
  data,
  totalItems,
  limit: ARTIST_DIRECTORY_PAGE_SIZE,
  totalPages: Math.ceil(totalItems / ARTIST_DIRECTORY_PAGE_SIZE),
  currentPage: 1,
});

describe("artist directory pagination", () => {
  it("fetches offsets in batches of 100 and stops at the reported total", () => {
    expect(
      getNextArtistDirectoryOffset(
        page(
          Array.from({ length: 100 }, (_, i) => item(String(i))),
          205
        ),
        [
          page(
            Array.from({ length: 100 }, (_, i) => item(String(i))),
            205
          ),
        ]
      )
    ).toBe(100);

    const finalPage = page(
      Array.from({ length: 5 }, (_, i) => item(String(i))),
      205
    );
    expect(
      getNextArtistDirectoryOffset(finalPage, [
        page(
          Array.from({ length: 100 }, (_, i) => item(String(i))),
          205
        ),
        page(
          Array.from({ length: 100 }, (_, i) => item(String(i + 100))),
          205
        ),
        finalPage,
      ])
    ).toBeUndefined();
    expect(getNextArtistDirectoryOffset(page([], 10), [page([], 10)])).toBeUndefined();
  });

  it("deduplicates by ID while retaining separate homonyms", () => {
    const items = getDistinctArtistDirectoryItems([
      page([item("first"), item("homonym-a")], 4),
      page([item("homonym-a"), item("homonym-b")], 4),
    ]);

    expect(items.map(({ id }) => id)).toEqual(["first", "homonym-a", "homonym-b"]);
  });
});
