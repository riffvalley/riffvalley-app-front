import type { InjectionKey } from 'vue';
import type { FestivalPlaylistDataPort } from '../application/festivalPlaylistsPort';

export const festivalPlaylistDataKey: InjectionKey<FestivalPlaylistDataPort> =
  Symbol('editorialFestivalPlaylistData');
