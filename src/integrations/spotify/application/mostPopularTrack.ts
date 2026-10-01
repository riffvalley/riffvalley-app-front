export interface MostPopularTrackQuery {
  spotifyAlbumId: string;
}

export interface MostPopularTrackPort {
  findMostPopularTrackId(query: MostPopularTrackQuery): Promise<string | null>;
}

export function loadMostPopularTrackId(
  port: MostPopularTrackPort,
  query: MostPopularTrackQuery,
): Promise<string | null> {
  return port.findMostPopularTrackId(query);
}
