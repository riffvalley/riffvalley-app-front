import type { InjectionKey } from 'vue';
import type { FestivalPlaylistArtistTracksPort } from '../application/festivalPlaylistsPort';

export const festivalPlaylistArtistTracksKey: InjectionKey<FestivalPlaylistArtistTracksPort> =
  Symbol('editorialFestivalPlaylistArtistTracks');
