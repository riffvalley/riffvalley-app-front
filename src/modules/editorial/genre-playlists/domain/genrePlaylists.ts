/** Status values returned for a genre playlist. */
export type GenrePlaylistStatus =
  | 'not_started'
  | 'in_progress'
  | 'editing'
  | 'ready'
  | 'published';

/** Editorial user attached to a genre playlist. */
export interface GenrePlaylistUser {
  id: string;
  username: string;
  image?: string;
}

/** Artist returned by the management catalog used for genre playlists. */
export interface GenreArtist {
  id: string;
  name: string;
  image?: string | null;
  description?: string | null;
}

/** Artist created in the moderation queue through POST /artists. */
export interface PendingGenreArtist extends GenreArtist {
  needsReview: true;
}

/** Paginated result returned by GET /artists/management. */
export interface GenreArtistSearchResult {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  data: GenreArtist[];
}

/** Kanban registration returned by GET /spotify/genres. */
export interface GenrePlaylistRegistration {
  id: string;
  name: string;
  status: GenrePlaylistStatus;
  link: string;
  type: 'genero' | 'especial' | 'otras' | 'festival';
  updateDate: string;
  createdAt: string;
  updatedAt: string;
  user?: GenrePlaylistUser;
  userId?: string;
  description?: string | null;
  spotifyPlaylistId?: string | null;
  imageUrl?: string | null;
  isPublic?: boolean;
  playlistArtists?: Array<{ id: string }>;
  playlistArtistsCount?: number;
  content: GenrePlaylistContent | null;
}

/** Content summary attached to a kanban registration. */
export interface GenrePlaylistContent {
  id: string;
  type: 'article' | 'photos' | 'spotify' | 'radar' | 'best' | 'video' | 'reunion';
  name: string;
  publicationDate: string | null;
  backlog: boolean;
}

/** Registration fields accepted by the existing Spotify update endpoint. */
export interface UpdateGenrePlaylistRegistration {
  status?: GenrePlaylistStatus;
  userId?: string | null;
}

/** Artist linked to a genre playlist, including its selected tracks. */
export interface GenrePlaylistArtist {
  id: string;
  spotifyId: string;
  artistId: string;
  artist: GenreArtist;
  status: 'syncing' | 'synced' | 'failed';
  selectionMode?: 'setlist' | 'manual';
  spotifyArtistId?: string | null;
  setlistsAnalyzed: number;
  tracks: GenrePlaylistTrack[];
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Track data returned in a genre playlist or search result. */
export interface GenrePlaylistTrack {
  spotifyTrackId: string;
  uri: string;
  name: string;
  url: string;
  plays: number;
  artists?: Array<{ id: string; name: string }>;
  album?: string;
  imageUrl?: string | null;
  durationMs?: number;
}

/** Genre playlist data returned by the detail and mutation endpoints. */
export interface GenrePlaylist {
  id: string;
  name: string;
  description: string | null;
  status: GenrePlaylistStatus;
  link: string;
  spotifyPlaylistId: string | null;
  imageUrl: string | null;
  isPublic: boolean;
  type: 'genero' | 'especial' | 'otras';
  updateDate: string;
  createdAt: string;
  updatedAt: string;
  playlistArtists: GenrePlaylistArtist[];
  user?: GenrePlaylistUser;
}

/** Input accepted by POST /genre-playlists. */
export interface CreateGenrePlaylist {
  name: string;
  description?: string;
  public?: boolean;
}

/** Responses accepted by the existing registration deletion endpoint. */
export type DeleteGenrePlaylistRegistrationResult = { ok: true } | { message: string };

/** Metadata accepted by PATCH /genre-playlists/:id. */
export interface UpdateGenrePlaylistMetadata {
  name?: string;
  description?: string;
  public?: boolean;
}

/** Search result returned by GET /genre-playlists/:id/artists/:artistId/tracks. */
export interface GenreArtistTrackSearchResult {
  artist: Pick<GenrePlaylistArtist['artist'], 'id' | 'name'>;
  query: string;
  tracks: GenrePlaylistTrackCandidate[];
}

/** Spotify candidate shape returned by the genre artist track search endpoint. */
export interface GenrePlaylistTrackCandidate extends GenrePlaylistTrack {
  artists: Array<{ id: string; name: string }>;
}

/** Browser independent image payload for the genre playlist image operation. */
export interface GenrePlaylistImageUpload {
  filename: string;
  contentType: string;
  bytes: ArrayBuffer;
}
