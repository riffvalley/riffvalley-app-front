export interface LastFmManagementArtist {
  url?: string;
  ontour?: string;
  stats?: { listeners?: string; playcount?: string };
  tags?: { tag?: { name: string; url?: string }[] };
  bio?: { content?: string; published?: string };
  similar?: { artist?: { name: string }[] };
}

export interface LastFmManagementArtistPort {
  fetchManagementArtist(name: string): Promise<LastFmManagementArtist>;
}

export function loadLastFmManagementArtist(
  port: LastFmManagementArtistPort,
  name: string,
): Promise<LastFmManagementArtist> {
  return port.fetchManagementArtist(name);
}
