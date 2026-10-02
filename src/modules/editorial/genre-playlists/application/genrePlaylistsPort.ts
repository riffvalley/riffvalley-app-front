import type {
  CreateGenrePlaylist,
  DeleteGenrePlaylistRegistrationResult,
  GenreArtistTrackSearchResult,
  GenreArtistSearchResult,
  GenrePlaylist,
  GenrePlaylistImageUpload,
  GenrePlaylistRegistration,
  GenrePlaylistTrackCandidate,
  PendingGenreArtist,
  UpdateGenrePlaylistMetadata,
  UpdateGenrePlaylistRegistration,
} from '../domain/genrePlaylists';

/** Internal artist search and pending artist creation used by genre playlists. */
export interface GenreArtistCatalogPort {
  searchArtists(
    query: string,
    limit: number,
    offset: number,
    genreId?: string,
  ): Promise<GenreArtistSearchResult>;
  createPendingArtist(name: string): Promise<PendingGenreArtist>;
}

/** Kanban registration reads and updates, distinct from Spotify playlist data. */
export interface GenrePlaylistRegistrationsPort {
  getGenrePlaylistRegistrations(): Promise<GenrePlaylistRegistration[]>;
  updateGenrePlaylistRegistration(
    registrationId: string,
    data: UpdateGenrePlaylistRegistration,
  ): Promise<GenrePlaylistRegistration>;
}

/** Creation and Spotify linking operations for genre playlists. */
export interface GenrePlaylistLifecyclePort {
  createGenrePlaylist(data: CreateGenrePlaylist): Promise<GenrePlaylist>;
  createLinkedGenrePlaylist(spotifyUrl: string): Promise<GenrePlaylist>;
  linkExistingGenrePlaylist(playlistId: string): Promise<GenrePlaylist>;
  deleteGenrePlaylistRegistration(
    registrationId: string,
  ): Promise<DeleteGenrePlaylistRegistrationResult>;
}

/** Read and metadata operations for one genre playlist. */
export interface GenrePlaylistDataPort {
  getGenrePlaylist(playlistId: string): Promise<GenrePlaylist>;
  updateGenrePlaylistMetadata(
    playlistId: string,
    data: UpdateGenrePlaylistMetadata,
  ): Promise<GenrePlaylist>;
  updateGenrePlaylistImage(
    playlistId: string,
    image: GenrePlaylistImageUpload,
  ): Promise<GenrePlaylist>;
}

/** Artist associations and track selection operations for genre playlists. */
export interface GenrePlaylistArtistTracksPort {
  searchArtistTracks(
    playlistId: string,
    artistId: string,
    query?: string,
  ): Promise<GenreArtistTrackSearchResult>;
  addArtist(
    playlistId: string,
    artistId: string,
    spotifyTrackIds: string[],
  ): Promise<GenrePlaylist>;
  replaceArtistTracks(
    playlistId: string,
    artistId: string,
    spotifyTrackIds: string[],
  ): Promise<GenrePlaylist>;
  removeArtist(playlistId: string, artistId: string): Promise<GenrePlaylist>;
}

/** Playlist cleanup and shuffle operations. */
export interface GenrePlaylistMaintenancePort {
  clearPlaylist(playlistId: string): Promise<GenrePlaylist>;
  shufflePlaylist(playlistId: string): Promise<GenrePlaylist>;
}

/** Spotify candidates used when selecting tracks for an artist. */
export type { GenrePlaylistTrackCandidate };
