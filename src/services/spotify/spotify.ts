// @services/spotify/spotify.ts
import api from '@services/api/api';

// =========================
// Tipos
// =========================
export type SpotifyStatus =
  | 'not_started'
  | 'in_progress'
  | 'editing'
  | 'ready'
  | 'published';

export const SPOTIFY_STATUSES: SpotifyStatus[] = [
  'not_started',
  'in_progress',
  'editing',
  'ready',
  'published',
];

export type SpotifyTipo = 'festival' | 'especial' | 'genero' | 'otras';

export const SPOTIFY_TIPOS: SpotifyTipo[] = ['festival', 'especial', 'genero', 'otras'];

export interface Spotify {
  id: string;
  name: string;
  status: SpotifyStatus;
  link: string;
  type: SpotifyTipo;
  updateDate: string; // ISO
  createdAt: string; // ISO
  updatedAt: string; // ISO
  user?: { id: string; username: string; image?: string }; // Usuario asignado
  userId?: string;
}

// =========================
// DTOs (frontend)
// =========================
export interface CreateSpotifyDto {
  name: string;
  status: SpotifyStatus;
  link: string;
  type: SpotifyTipo;
  /** ISO8601, ej "2025-09-22T10:00:00Z" */
  updateDate: string;
  userId?: string;
}

export interface UpdateSpotifyDto extends Partial<CreateSpotifyDto> { }

// Utils
export const toISO = (d: Date) => d.toISOString();

// =========================
// Listado con filtros
// =========================
export interface ListSpotifyParams {
  limit?: number;
  offset?: number;
  q?: string;
  status?: SpotifyStatus;
  type?: SpotifyTipo;
}

export async function listSpotify(params: ListSpotifyParams = {}): Promise<Spotify[]> {
  const { data } = await api.get<Spotify[]>('/spotify', { params });
  return data;
}

export async function getSpotifyFestivals(): Promise<Spotify[]> {
  const { data } = await api.get<Spotify[]>('/spotify/festivals');
  return data;
}

export async function getSpotifyGenres(): Promise<Spotify[]> {
  const { data } = await api.get<Spotify[]>('/spotify/genres');
  return data;
}

// =========================
// CRUD
// =========================
export async function createSpotify(dto: CreateSpotifyDto): Promise<Spotify> {
  const { data } = await api.post<Spotify>('/spotify', dto);
  return data;
}

export async function getSpotify(id: string): Promise<Spotify> {
  const { data } = await api.get<Spotify>(`/spotify/${id}`);
  return data;
}

export async function updateSpotify(id: string, dto: UpdateSpotifyDto): Promise<Spotify> {
  const { data } = await api.patch<Spotify>(`/spotify/${id}`, dto);
  return data;
}

export async function removeSpotify(id: string): Promise<{ ok: true } | { message: string }> {
  const { data } = await api.delete<{ ok: true } | { message: string }>(`/spotify/${id}`);
  return data;
}
