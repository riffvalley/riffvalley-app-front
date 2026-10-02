import type {
  FestivalPlaylistData,
  FestivalPlaylistRegistration,
} from '../domain/festivalPlaylists';

/** Transport response for GET /spotify/festivals. */
export interface FestivalPlaylistRegistrationDto extends FestivalPlaylistRegistration {
  createdAt: string;
  updatedAt: string;
}

/** Transport response for GET /festival-playlists/:id. */
export interface FestivalPlaylistDataDto extends FestivalPlaylistData {
  playlistArtists: Array<{
    id: string;
    spotifyId: string;
    artistId: string;
    artist: { id: string; name: string; image?: string | null; description?: string | null };
    status: 'syncing' | 'synced' | 'failed';
    selectionMode?: 'setlist' | 'manual';
    spotifyArtistId?: string | null;
    setlistsAnalyzed: number;
    tracks: Array<{
      spotifyTrackId: string;
      uri: string;
      name: string;
      url: string;
      plays: number;
      artists?: Array<{ id: string; name: string }>;
      album?: string;
      imageUrl?: string | null;
      durationMs?: number;
    }>;
    lastError: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
}
