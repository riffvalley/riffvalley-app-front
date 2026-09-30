export interface ArtistImageQuery {
  name: string;
  limit: 1 | 5;
}

export interface ArtistImageOption {
  name: string;
  image: string;
}

export interface ArtistImagesPort {
  searchArtistImages(query: ArtistImageQuery): Promise<ArtistImageOption[]>;
}

export type ArtistImageSearchSession = (query: ArtistImageQuery) => Promise<ArtistImageOption[]>;

export interface ArtistImageSearchSessionPort {
  createSearchSession(): Promise<ArtistImageSearchSession>;
}

export function searchArtistImages(
  port: ArtistImagesPort,
  query: ArtistImageQuery,
): Promise<ArtistImageOption[]> {
  return port.searchArtistImages(query);
}

export function createArtistImageSearchSession(
  port: ArtistImageSearchSessionPort,
): Promise<ArtistImageSearchSession> {
  return port.createSearchSession();
}
