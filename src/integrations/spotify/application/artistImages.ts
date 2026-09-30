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

export function searchArtistImages(
  port: ArtistImagesPort,
  query: ArtistImageQuery,
): Promise<ArtistImageOption[]> {
  return port.searchArtistImages(query);
}
