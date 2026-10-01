export interface ArtistLinkPort {
  findArtistLink(artistName: string): Promise<string | undefined>;
}

export function findArtistLink(
  port: ArtistLinkPort,
  artistName: string,
): Promise<string | undefined> {
  return port.findArtistLink(artistName);
}
