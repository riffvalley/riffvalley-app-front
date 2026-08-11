import api from '@services/api/api';

export type PlaylistArtistSyncStatus = 'syncing' | 'synced' | 'failed';

export interface SpotifyConnection {
  connected: boolean;
  spotifyUserId: string | null;
  displayName: string | null;
  canUploadImages: boolean;
  missingScopes: string[];
}

export interface PlaylistTrack {
  spotifyTrackId: string;
  uri: string;
  name: string;
  url: string;
  plays: number;
}

export interface FestivalArtist {
  id: string;
  name: string;
  image?: string | null;
  description?: string | null;
}

export interface PendingFestivalArtist extends FestivalArtist {
  needsReview: true;
}

export interface PlaylistArtist {
  id: string;
  spotifyId: string;
  artistId: string;
  artist: FestivalArtist;
  status: PlaylistArtistSyncStatus;
  setlistsAnalyzed: number;
  tracks: PlaylistTrack[];
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SyncedFestivalPlaylist {
  id: string;
  name: string;
  description: string | null;
  status: 'not_started' | 'in_progress' | 'editing' | 'ready' | 'published';
  link: string;
  spotifyPlaylistId: string | null;
  imageUrl: string | null;
  isPublic: boolean;
  type: 'festival';
  updateDate: string;
  createdAt: string;
  updatedAt: string;
  playlistArtists: PlaylistArtist[];
  user?: {
    id: string;
    username: string;
    image?: string;
  };
}

export interface ArtistSearchResponse {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  data: FestivalArtist[];
}

export interface TopSongsResponse {
  artist: string;
  setlistsAnalyzed: number;
  songs: Array<{ name: string; plays: number }>;
  sources: string[];
}

export interface CreateFestivalPlaylistDto {
  name: string;
  description?: string;
  public?: boolean;
}

export interface UpdateFestivalPlaylistDto {
  name?: string;
  description?: string;
  public?: boolean;
}

export const MAX_SPOTIFY_IMAGE_BASE64_BYTES = 256 * 1024;

export function approximateBase64Size(fileSize: number): number {
  return Math.ceil(fileSize / 3) * 4;
}

export function validatePlaylistImage(file: File): string | null {
  if (file.type !== 'image/jpeg') return 'La portada debe ser un archivo JPEG.';
  if (approximateBase64Size(file.size) > MAX_SPOTIFY_IMAGE_BASE64_BYTES) {
    return 'La imagen supera el límite de 256 KB una vez codificada para Spotify.';
  }
  return null;
}

export async function getSpotifyConnection(): Promise<SpotifyConnection> {
  const { data } = await api.get<SpotifyConnection>('/festival-playlists/spotify/connection');
  return data;
}

export async function connectSpotify(): Promise<{ authorizationUrl: string }> {
  const { data } = await api.post<{ authorizationUrl: string }>('/festival-playlists/spotify/connect');
  return data;
}

export async function disconnectSpotify(): Promise<{ connected: false }> {
  const { data } = await api.delete<{ connected: false }>('/festival-playlists/spotify/connection');
  return data;
}

export async function createFestivalPlaylist(
  dto: CreateFestivalPlaylistDto,
): Promise<SyncedFestivalPlaylist> {
  const { data } = await api.post<SyncedFestivalPlaylist>('/festival-playlists', dto);
  return data;
}

export async function createLinkedFestivalPlaylist(
  spotifyUrl: string,
): Promise<SyncedFestivalPlaylist> {
  const { data } = await api.post<SyncedFestivalPlaylist>(
    '/festival-playlists/link',
    { spotifyUrl },
  );
  return data;
}

export async function linkExistingFestivalPlaylist(
  playlistLocalId: string,
): Promise<SyncedFestivalPlaylist> {
  const { data } = await api.post<SyncedFestivalPlaylist>(
    `/festival-playlists/${playlistLocalId}/link`,
  );
  return data;
}

export async function clearFestivalPlaylist(
  playlistLocalId: string,
): Promise<SyncedFestivalPlaylist> {
  const { data } = await api.delete<SyncedFestivalPlaylist>(
    `/festival-playlists/${playlistLocalId}/tracks`,
  );
  return data;
}

export async function getFestivalPlaylist(id: string): Promise<SyncedFestivalPlaylist> {
  const { data } = await api.get<SyncedFestivalPlaylist>(`/festival-playlists/${id}`);
  return data;
}

export async function updateFestivalPlaylist(
  id: string,
  dto: UpdateFestivalPlaylistDto,
): Promise<SyncedFestivalPlaylist> {
  const { data } = await api.patch<SyncedFestivalPlaylist>(`/festival-playlists/${id}`, dto);
  return data;
}

export async function updateFestivalPlaylistImage(
  id: string,
  file: File,
): Promise<SyncedFestivalPlaylist> {
  const formData = new FormData();
  formData.append('image', file);
  const { data } = await api.put<SyncedFestivalPlaylist>(
    `/festival-playlists/${id}/image`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}

export async function searchFestivalArtists(
  query: string,
  limit = 15,
  offset = 0,
): Promise<ArtistSearchResponse> {
  const { data } = await api.get<ArtistSearchResponse>('/artists/management', {
    params: { query, limit, offset },
  });
  return data;
}

export async function createPendingFestivalArtist(
  name: string,
): Promise<PendingFestivalArtist> {
  const { data } = await api.post<PendingFestivalArtist>('/artists', { name });
  return data;
}

export async function getArtistTopSongs(
  artist: string,
  limit = 10,
  recentSetlists = 10,
): Promise<TopSongsResponse> {
  const { data } = await api.get<TopSongsResponse>('/festival-playlists/artists/top-songs', {
    params: { artist, limit, recentSetlists },
  });
  return data;
}

export async function addArtistToFestivalPlaylist(
  playlistId: string,
  artistId: string,
  tracksPerArtist = 10,
  recentSetlists = 10,
): Promise<SyncedFestivalPlaylist> {
  const { data } = await api.post<SyncedFestivalPlaylist>(
    `/festival-playlists/${playlistId}/artists`,
    { artistId, tracksPerArtist, recentSetlists },
  );
  return data;
}

export async function removeArtistFromFestivalPlaylist(
  playlistId: string,
  artistId: string,
): Promise<SyncedFestivalPlaylist> {
  const { data } = await api.delete<SyncedFestivalPlaylist>(
    `/festival-playlists/${playlistId}/artists/${artistId}`,
  );
  return data;
}
