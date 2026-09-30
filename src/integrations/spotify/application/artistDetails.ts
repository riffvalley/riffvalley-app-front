export interface ArtistDetailsQuery {
  discName: string;
  artistName: string;
}

export interface SpotifyArtistDetails {
  name: string;
  imageUrl?: string;
  genres: string[];
  followers?: number;
  popularity?: number;
  spotifyUrl?: string;
}

export interface SpotifyTopTrack {
  id: string;
  name: string;
  albumName?: string;
  albumImageUrl?: string;
  previewUrl?: string;
  spotifyUrl?: string;
  durationMs: number;
}

export interface ArtistDetails {
  artist: SpotifyArtistDetails;
  topTracks: SpotifyTopTrack[];
}

export type ArtistDetailsResult =
  | { status: "found"; details: ArtistDetails }
  | { status: "token-unavailable" | "not-found" | "artist-not-found" | "failed" };

export interface ArtistDetailsPort {
  findArtistDetails(query: ArtistDetailsQuery): Promise<ArtistDetailsResult>;
}

export function loadArtistDetails(
  port: ArtistDetailsPort,
  query: ArtistDetailsQuery,
): Promise<ArtistDetailsResult> {
  return port.findArtistDetails(query);
}
