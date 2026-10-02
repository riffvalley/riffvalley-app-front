import type { InjectionKey } from 'vue';
import type { FestivalPlaylistLifecyclePort } from '../application/festivalPlaylistsPort';

export const festivalPlaylistLifecycleKey: InjectionKey<FestivalPlaylistLifecyclePort> =
  Symbol('editorialFestivalPlaylistLifecycle');
