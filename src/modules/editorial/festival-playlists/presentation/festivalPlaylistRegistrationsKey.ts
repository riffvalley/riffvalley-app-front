import type { InjectionKey } from 'vue';
import type { FestivalPlaylistRegistrationsPort } from '../application/festivalPlaylistsPort';

export const festivalPlaylistRegistrationsKey: InjectionKey<FestivalPlaylistRegistrationsPort> =
  Symbol('editorialFestivalPlaylistRegistrations');
