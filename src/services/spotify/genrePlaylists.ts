import api from "@services/api/api";
import type {
  FestivalArtist,
  PlaylistArtist,
  SpotifyConnection,
  UpdateFestivalPlaylistDto,
} from "./festivalPlaylists";

export interface SyncedGenrePlaylist {
  id: string;
  name: string;
  description: string | null;
  status: "not_started" | "in_progress" | "editing" | "ready" | "published";
  link: string;
  spotifyPlaylistId: string | null;
  imageUrl: string | null;
  isPublic: boolean;
  type: "genero" | "especial" | "otras";
  updateDate: string;
  createdAt: string;
  updatedAt: string;
  playlistArtists: PlaylistArtist[];
  user?: { id: string; username: string; image?: string };
}

export interface SpotifyTrackCandidate {
  spotifyTrackId: string;
  uri: string;
  name: string;
  url: string;
  plays: number;
  artists: Array<{ id: string; name: string }>;
  album?: string;
  imageUrl?: string | null;
  durationMs?: number;
}

export interface GenreTrackSearchResponse {
  artist: Pick<FestivalArtist, "id" | "name">;
  query: string;
  tracks: SpotifyTrackCandidate[];
}

export type { SpotifyConnection };

export async function createGenrePlaylist(dto: {
  name: string;
  description?: string;
  public?: boolean;
}): Promise<SyncedGenrePlaylist> {
  const { data } = await api.post<SyncedGenrePlaylist>("/genre-playlists", dto);
  return data;
}

export async function createLinkedGenrePlaylist(
  spotifyUrl: string,
): Promise<SyncedGenrePlaylist> {
  const { data } = await api.post<SyncedGenrePlaylist>(
    "/genre-playlists/link",
    { spotifyUrl },
  );
  return data;
}

export async function linkExistingGenrePlaylist(
  id: string,
): Promise<SyncedGenrePlaylist> {
  const { data } = await api.post<SyncedGenrePlaylist>(
    `/genre-playlists/${id}/link`,
  );
  return data;
}

export async function getGenrePlaylist(
  id: string,
): Promise<SyncedGenrePlaylist> {
  const { data } = await api.get<SyncedGenrePlaylist>(`/genre-playlists/${id}`);
  return data;
}

export async function updateGenrePlaylist(
  id: string,
  dto: UpdateFestivalPlaylistDto,
): Promise<SyncedGenrePlaylist> {
  const { data } = await api.patch<SyncedGenrePlaylist>(
    `/genre-playlists/${id}`,
    dto,
  );
  return data;
}

export async function updateGenrePlaylistImage(
  id: string,
  file: File,
): Promise<SyncedGenrePlaylist> {
  const formData = new FormData();
  formData.append("image", file);
  const { data } = await api.put<SyncedGenrePlaylist>(
    `/genre-playlists/${id}/image`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return data;
}

export async function searchGenreArtistTracks(
  playlistId: string,
  artistId: string,
  query = "",
): Promise<GenreTrackSearchResponse> {
  const { data } = await api.get<GenreTrackSearchResponse>(
    `/genre-playlists/${playlistId}/artists/${artistId}/tracks`,
    { params: query.trim() ? { q: query.trim() } : undefined },
  );
  return data;
}

export async function addGenreArtist(
  playlistId: string,
  artistId: string,
  spotifyTrackIds: string[],
): Promise<SyncedGenrePlaylist> {
  const { data } = await api.post<SyncedGenrePlaylist>(
    `/genre-playlists/${playlistId}/artists`,
    {
      artistId,
      spotifyTrackIds,
    },
  );
  return data;
}

export async function replaceGenreArtistTracks(
  playlistId: string,
  artistId: string,
  spotifyTrackIds: string[],
): Promise<SyncedGenrePlaylist> {
  const { data } = await api.put<SyncedGenrePlaylist>(
    `/genre-playlists/${playlistId}/artists/${artistId}/tracks`,
    { spotifyTrackIds },
  );
  return data;
}

export async function removeGenreArtist(
  playlistId: string,
  artistId: string,
): Promise<SyncedGenrePlaylist> {
  const { data } = await api.delete<SyncedGenrePlaylist>(
    `/genre-playlists/${playlistId}/artists/${artistId}`,
  );
  return data;
}

export async function clearGenrePlaylist(
  id: string,
): Promise<SyncedGenrePlaylist> {
  const { data } = await api.delete<SyncedGenrePlaylist>(
    `/genre-playlists/${id}/tracks`,
  );
  return data;
}
