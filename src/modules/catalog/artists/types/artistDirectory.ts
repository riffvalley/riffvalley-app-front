export const ARTIST_DIRECTORY_LETTERS = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", "#"] as const;

export type ArtistDirectoryLetter = (typeof ARTIST_DIRECTORY_LETTERS)[number];

export interface ArtistDirectoryItem {
  id: string;
  name: string;
  genre: string | null;
  genreColor: string | null;
}

export interface ArtistDirectoryPage {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  data: ArtistDirectoryItem[];
}

export interface ArtistDirectoryParams {
  letter: ArtistDirectoryLetter;
  q?: string;
  genreId?: string;
  limit: number;
  offset: number;
}
