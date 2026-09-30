export interface ArtistBiography {
  bio?: { summary?: string };
  tags?: { tag?: { name: string }[] };
}

export interface ArtistBiographyPort {
  fetchArtistBiography(artistName: string): Promise<ArtistBiography | null>;
}

export function loadArtistBiography(
  port: ArtistBiographyPort,
  artistName: string,
): Promise<ArtistBiography | null> {
  return port.fetchArtistBiography(artistName);
}
