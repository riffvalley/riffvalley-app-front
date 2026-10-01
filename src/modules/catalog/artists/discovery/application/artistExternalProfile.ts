import type { ArtistManagementMatch } from "../../domain/artistManagement";

export interface LastFmManagementProfile {
  url?: string;
  ontour?: string;
  stats?: { listeners?: string; playcount?: string };
  tags?: { tag?: { name: string; url?: string }[] };
  bio?: { content?: string; published?: string };
  similar?: { artist?: { name: string }[] };
}

export interface LastFmManagementDependencies {
  loadProfile(name: string): Promise<LastFmManagementProfile>;
  searchCatalogArtists(name: string): Promise<ArtistManagementMatch[]>;
  findFallbackImage(name: string): Promise<string | null>;
}

export function selectCatalogArtist(
  artists: ArtistManagementMatch[],
  name: string,
): ArtistManagementMatch | null {
  const normalizedName = name.toLocaleLowerCase();
  return artists.find((artist) => artist.name.toLocaleLowerCase() === normalizedName)
    ?? artists[0]
    ?? null;
}

export function searchCatalogArtists(
  port: { searchArtistsByName(name: string): Promise<ArtistManagementMatch[]> },
  name: string,
): Promise<ArtistManagementMatch[]> {
  return port.searchArtistsByName(name);
}
