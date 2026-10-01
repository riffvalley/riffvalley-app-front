import type { ArtistManagementDisc, ArtistManagementMatch } from "../../domain/artistManagement";

export interface LastFmManagementProfile {
  url?: string;
  ontour?: string;
  stats?: { listeners?: string; playcount?: string };
  tags?: { tag?: { name: string; url?: string }[] };
  bio?: { content?: string; published?: string };
  similar?: { artist?: { name: string }[] };
}

export interface LastFmManagementDependencies<TDisc extends ArtistManagementDisc = ArtistManagementDisc> {
  loadProfile(name: string): Promise<LastFmManagementProfile>;
  searchCatalogArtists(name: string): Promise<ArtistManagementMatch<TDisc>[]>;
  findFallbackImage(name: string): Promise<string | null>;
}

export function selectCatalogArtist<TDisc extends ArtistManagementDisc>(
  artists: ArtistManagementMatch<TDisc>[],
  name: string,
): ArtistManagementMatch<TDisc> | null {
  const normalizedName = name.toLocaleLowerCase();
  return artists.find((artist) => artist.name.toLocaleLowerCase() === normalizedName)
    ?? artists[0]
    ?? null;
}

export function searchCatalogArtists<TDisc extends ArtistManagementDisc>(
  port: { searchArtistsByName(name: string): Promise<ArtistManagementMatch<TDisc>[]> },
  name: string,
): Promise<ArtistManagementMatch<TDisc>[]> {
  return port.searchArtistsByName(name);
}
