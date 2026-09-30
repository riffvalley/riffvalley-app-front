export interface AlbumQuery {
  albumName: string;
  artistName: string;
}

export interface AlbumTrack {
  id: string;
  name: string;
  number: number;
  durationMs: number;
  previewUrl: string | null;
}

/** Provider-independent model for this single integration capability. */
export interface Album {
  name: string;
  artistNames: string[];
  coverUrl: string | null;
  releaseDate: string;
  totalTracks: number;
  listenUrl: string | null;
  tracks: AlbumTrack[];
}

export type AlbumLookup =
  | { status: "found"; album: Album }
  | { status: "token-unavailable" | "not-found" | "failed" };

export interface AlbumDetailsPort {
  findAlbum(query: AlbumQuery): Promise<AlbumLookup>;
}

export interface AlbumDetails extends Omit<Album, "artistNames" | "tracks"> {
  artistLabel: string;
  totalDurationLabel: string;
  tracks: (AlbumTrack & { durationLabel: string })[];
}

export type AlbumDetailsResult =
  | { status: "found"; album: AlbumDetails }
  | { status: "token-unavailable" | "not-found" | "failed" };

export async function loadAlbumDetails(
  port: AlbumDetailsPort,
  query: AlbumQuery,
): Promise<AlbumDetailsResult> {
  const result = await port.findAlbum(query);
  if (result.status !== "found") return result;
  const { artistNames, tracks, ...album } = result.album;
  const duration = tracks.reduce((sum, track) => sum + track.durationMs, 0);
  const hours = Math.floor(duration / 3600000);
  const minutes = Math.floor((duration % 3600000) / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);
  return {
    status: "found",
    album: {
      ...album,
      artistLabel: artistNames.join(", "),
      totalDurationLabel: `${hours > 0 ? `${hours}h ` : ""}${minutes}m ${seconds}s`,
      tracks: tracks.map((track) => ({
        ...track,
        durationLabel: `${Math.floor(track.durationMs / 60000)}:${String(Math.floor((track.durationMs % 60000) / 1000)).padStart(2, "0")}`,
      })),
    },
  };
}
