import type { InjectionKey } from 'vue';
import type { GenrePlaylistRegistrationsPort } from '../application/genrePlaylistsPort';

export const genrePlaylistRegistrationsKey: InjectionKey<GenrePlaylistRegistrationsPort> =
  Symbol('editorialGenrePlaylistRegistrations');
