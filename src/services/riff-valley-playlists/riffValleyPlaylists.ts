// @services/riff-valley-playlists/riffValleyPlaylists
import api from '@services/api/api';
import type { ContentRef } from '@services/contents/contents';

// =========================
// Tipos
// =========================
export type RiffValleyPlaylistStatus =
  | 'not_started'
  | 'in_progress'
  | 'editing'
  | 'ready'
  | 'published';

export const RIFF_VALLEY_PLAYLIST_STATUSES: RiffValleyPlaylistStatus[] = [
  'not_started',
  'in_progress',
  'editing',
  'ready',
  'published',
];

export type RiffValleyPlaylistType = 'festival' | 'especial' | 'genero' | 'otras';

export const RIFF_VALLEY_PLAYLIST_TYPES: RiffValleyPlaylistType[] = ['festival', 'especial', 'genero', 'otras'];

export interface RiffValleyPlaylist {
  id: string;
  name: string;
  status: RiffValleyPlaylistStatus;
  link: string;
  type: RiffValleyPlaylistType;
  updateDate: string; // ISO
  createdAt: string; // ISO
  updatedAt: string; // ISO
  user?: { id: string; username: string; image?: string }; // Usuario asignado
  userId?: string;
  /** Campos presentes en playlists de festivales sincronizadas. */
  description?: string | null;
  spotifyPlaylistId?: string | null;
  imageUrl?: string | null;
  isPublic?: boolean;
  playlistArtists?: Array<{ id: string }>;
  playlistArtistsCount?: number;
  /** Content asociado (creación manual, sin sincronización automática). `null` si no existe. */
  content: ContentRef | null;
}

// =========================
// DTOs (frontend)
// =========================
export interface CreateRiffValleyPlaylistDto {
  name: string;
  status: RiffValleyPlaylistStatus;
  link: string;
  type: RiffValleyPlaylistType;
  /** ISO8601, ej "2025-09-22T10:00:00Z" */
  updateDate?: string;
  userId?: string;
}

export interface UpdateRiffValleyPlaylistDto extends Omit<Partial<CreateRiffValleyPlaylistDto>, 'userId'> {
  userId?: string | null;
}

// Utils
export const toISO = (d: Date) => d.toISOString();

// =========================
// Listado con filtros
// =========================
export interface ListRiffValleyPlaylistsParams {
  limit?: number;
  offset?: number;
  q?: string;
  status?: RiffValleyPlaylistStatus;
  type?: RiffValleyPlaylistType;
}

export async function listRiffValleyPlaylists(params: ListRiffValleyPlaylistsParams = {}): Promise<RiffValleyPlaylist[]> {
  const { data } = await api.get<RiffValleyPlaylist[]>('/riff-valley-playlists', { params });
  return data;
}

export async function getRiffValleyPlaylistFestivals(): Promise<RiffValleyPlaylist[]> {
  const { data } = await api.get<RiffValleyPlaylist[]>('/riff-valley-playlists/festivals');
  return data;
}

export async function getRiffValleyPlaylistGenres(): Promise<RiffValleyPlaylist[]> {
  const { data } = await api.get<RiffValleyPlaylist[]>('/riff-valley-playlists/genres');
  return data;
}

// =========================
// CRUD
// =========================
export async function createRiffValleyPlaylist(dto: CreateRiffValleyPlaylistDto): Promise<RiffValleyPlaylist> {
  const { data } = await api.post<RiffValleyPlaylist>('/riff-valley-playlists', dto);
  return data;
}

export async function getRiffValleyPlaylist(id: string): Promise<RiffValleyPlaylist> {
  const { data } = await api.get<RiffValleyPlaylist>(`/riff-valley-playlists/${id}`);
  return data;
}

export async function updateRiffValleyPlaylist(id: string, dto: UpdateRiffValleyPlaylistDto): Promise<RiffValleyPlaylist> {
  const { data } = await api.patch<RiffValleyPlaylist>(`/riff-valley-playlists/${id}`, dto);
  return data;
}

export async function removeRiffValleyPlaylist(id: string): Promise<{ ok: true } | { message: string }> {
  const { data } = await api.delete<{ ok: true } | { message: string }>(`/riff-valley-playlists/${id}`);
  return data;
}

/**
 * Crea manualmente el Content asociado a este RiffValleyPlaylist (backlog: true, sin publicationDate).
 * Requiere que el registro ya tenga un usuario asignado (userId).
 */
export async function createRiffValleyPlaylistContent(riffValleyPlaylistId: string): Promise<RiffValleyPlaylist> {
  const { data } = await api.post<RiffValleyPlaylist>(`/riff-valley-playlists/${riffValleyPlaylistId}/content`, {});
  return data;
}
