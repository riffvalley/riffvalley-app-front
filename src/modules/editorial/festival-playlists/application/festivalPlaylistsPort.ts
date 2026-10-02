import type {
  FestivalPlaylistData,
  FestivalPlaylistImageUpdateResult,
  FestivalPlaylistImageUpload,
  FestivalPlaylistRegistration,
  CreateFestivalPlaylistInput,
  DeleteFestivalRegistrationResult,
  DeleteLegacyFestivalRegistrationResult,
  FailedFestivalArtistTrackSearchResult,
  FestivalArtistSearchResult,
  FestivalArtistTopSongs,
  PendingFestivalArtist,
  UpdateFestivalPlaylistMetadata,
  UpdateFestivalPlaylistRegistration,
} from '../domain/festivalPlaylists';

/** Read contracts for the distinct festival record and playlist resources. */
export interface FestivalPlaylistRegistrationsPort {
  getFestivalRegistrations(): Promise<FestivalPlaylistRegistration[]>;
  updateFestivalRegistration(
    registrationId: string,
    data: UpdateFestivalPlaylistRegistration,
  ): Promise<FestivalPlaylistRegistration>;
}

/** Festival-specific artist lookup and preview operations. */
export interface FestivalArtistCatalogPort {
  searchArtists(query: string, limit: number, offset: number): Promise<FestivalArtistSearchResult>;
  createPendingArtist(name: string): Promise<PendingFestivalArtist>;
  getTopSongs(artist: string, limit: number, recentSetlists: number): Promise<FestivalArtistTopSongs>;
}

/** Artist associations and their selected track operations. */
export interface FestivalPlaylistArtistTracksPort {
  addArtist(
    playlistId: string,
    artistId: string,
    tracksPerArtist: number,
    recentSetlists: number,
  ): Promise<FestivalPlaylistData>;
  removeArtist(playlistId: string, artistId: string): Promise<FestivalPlaylistData>;
  searchFailedArtistTracks(
    playlistId: string,
    artistId: string,
    query: string,
  ): Promise<FailedFestivalArtistTrackSearchResult>;
  replaceFailedArtistTracks(
    playlistId: string,
    artistId: string,
    spotifyTrackIds: string[],
  ): Promise<FestivalPlaylistData>;
  clearPlaylistTracks(playlistId: string): Promise<FestivalPlaylistData>;
}

export interface FestivalPlaylistDataPort {
  getFestivalPlaylistData(playlistId: string): Promise<FestivalPlaylistData>;
  updateFestivalPlaylistMetadata(
    playlistId: string,
    data: UpdateFestivalPlaylistMetadata,
  ): Promise<void>;
  updateFestivalPlaylistImage(
    playlistId: string,
    image: FestivalPlaylistImageUpload,
  ): Promise<FestivalPlaylistImageUpdateResult>;
}

/** Playlist creation, linking, and legacy registration removal operations. */
export interface FestivalPlaylistLifecyclePort {
  createFestivalPlaylist(data: CreateFestivalPlaylistInput): Promise<FestivalPlaylistData>;
  createLinkedFestivalPlaylist(spotifyUrl: string): Promise<FestivalPlaylistData>;
  linkExistingFestivalPlaylist(registrationId: string): Promise<FestivalPlaylistData>;
  deleteFestivalRegistration(
    registrationId: string,
  ): Promise<DeleteFestivalRegistrationResult | DeleteLegacyFestivalRegistrationResult>;
}
