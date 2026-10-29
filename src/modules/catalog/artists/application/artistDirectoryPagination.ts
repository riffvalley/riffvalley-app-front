import type { ArtistDirectoryItem, ArtistDirectoryPage } from "../types/artistDirectory";

export const ARTIST_DIRECTORY_PAGE_SIZE = 100;

export function getNextArtistDirectoryOffset(
  lastPage: ArtistDirectoryPage,
  pages: ArtistDirectoryPage[]
): number | undefined {
  const loadedCount = pages.reduce((count, page) => count + page.data.length, 0);
  if (loadedCount >= lastPage.totalItems || lastPage.data.length === 0) return undefined;
  return pages.length * ARTIST_DIRECTORY_PAGE_SIZE;
}

export function getDistinctArtistDirectoryItems(
  pages: ArtistDirectoryPage[] | undefined
): ArtistDirectoryItem[] {
  const seenIds = new Set<string>();
  return (pages ?? []).flatMap(({ data }) =>
    data.filter(({ id }) => {
      if (seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    })
  );
}
