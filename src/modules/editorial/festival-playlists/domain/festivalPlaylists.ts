/** Festival record returned by the editorial festival board endpoint. */
export interface FestivalPlaylistRegistration {
  id: string;
  name: string;
  status: FestivalPlaylistStatus;
  link: string;
  type: 'festival';
  createdAt: string;
  updatedAt: string;
  updateDate: string;
  user?: FestivalPlaylistUser;
  userId?: string;
  description?: string | null;
  spotifyPlaylistId?: string | null;
  imageUrl?: string | null;
  isPublic?: boolean;
  playlistArtists?: Array<{ id: string }>;
  playlistArtistsCount?: number;
  content: FestivalPlaylistContent | null;
}

/** Playlist details returned by the festival playlist detail/sync endpoints. */
export interface FestivalPlaylistData {
  id: string;
  name: string;
  description: string | null;
  status: FestivalPlaylistStatus;
  link: string;
  spotifyPlaylistId: string | null;
  imageUrl: string | null;
  isPublic: boolean;
  type: 'festival';
  updateDate: string;
  createdAt: string;
  updatedAt: string;
  playlistArtists: FestivalPlaylistArtist[];
  user?: FestivalPlaylistUser;
}

export type FestivalPlaylistStatus =
  | 'not_started'
  | 'in_progress'
  | 'editing'
  | 'ready'
  | 'published';

export interface FestivalPlaylistUser {
  id: string;
  username: string;
  image?: string;
}

/** Changes currently made to a festival registration from the board. */
export interface UpdateFestivalPlaylistRegistration {
  status?: FestivalPlaylistStatus;
  userId?: string | null;
}

export interface CreateFestivalPlaylistInput {
  name: string;
  description?: string;
  public?: boolean;
}

/** Metadata fields accepted by the existing playlist PATCH endpoint. */
export interface UpdateFestivalPlaylistMetadata {
  name?: string;
  description?: string;
  public?: boolean;
}

/** Browser-independent image bytes and multipart metadata. */
export interface FestivalPlaylistImageUpload {
  filename: string;
  contentType: string;
  bytes: ArrayBuffer;
}

export interface FestivalPlaylistImageUpdateResult {
  imageUrl: string | null;
}

export type FestivalPlaylistArtistSyncStatus = 'syncing' | 'synced' | 'failed';

export interface FestivalArtist {
  id: string;
  name: string;
  image?: string | null;
  description?: string | null;
}

export interface PendingFestivalArtist extends FestivalArtist {
  needsReview: true;
}

export interface FestivalPlaylistTrack {
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

export interface FestivalPlaylistArtist {
  id: string;
  spotifyId: string;
  artistId: string;
  artist: FestivalArtist;
  status: FestivalPlaylistArtistSyncStatus;
  selectionMode?: 'setlist' | 'manual';
  spotifyArtistId?: string | null;
  setlistsAnalyzed: number;
  tracks: FestivalPlaylistTrack[];
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FestivalArtistSearchResult {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  data: FestivalArtist[];
}

export interface FestivalArtistTopSongs {
  artist: string;
  setlistsAnalyzed: number;
  songs: Array<{ name: string; plays: number }>;
  sources: string[];
}

export interface FailedFestivalArtistTrackSearchResult {
  artist: Pick<FestivalArtist, 'id' | 'name'>;
  query: string;
  tracks: FestivalPlaylistTrack[];
}

export interface DeleteFestivalRegistrationResult {
  ok: true;
}

export interface DeleteLegacyFestivalRegistrationResult {
  message: string;
}

/** The board only uses the presence of its linked editorial content. */
export interface FestivalPlaylistContent {
  id: string;
  type: 'article' | 'photos' | 'spotify' | 'radar' | 'best' | 'video' | 'reunion';
  name: string;
  publicationDate: string | null;
  backlog: boolean;
}
