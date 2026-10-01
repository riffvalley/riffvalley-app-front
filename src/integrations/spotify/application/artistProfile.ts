export interface ArtistProfileQuery {
  artistName: string;
}

export interface ArtistProfile {
  genres: string[];
}

export type ArtistProfileResult =
  | { status: "found"; profile: ArtistProfile }
  | { status: "not-found" | "failed" };

export interface ArtistProfilePort {
  findArtistProfile(query: ArtistProfileQuery): Promise<ArtistProfileResult>;
}

export function loadArtistProfile(
  port: ArtistProfilePort,
  query: ArtistProfileQuery,
): Promise<ArtistProfileResult> {
  return port.findArtistProfile(query);
}
