import { findArtistLink as findArtistLinkOperation } from "./application/artistLink";
import { artistLinkApi } from "./infrastructure/artistLinkApi";

export function findArtistLink(artistName: string): Promise<string | undefined> {
  return findArtistLinkOperation(artistLinkApi, artistName);
}
