import type { InjectionKey } from 'vue';
import type { GenrePlaylistLifecyclePort } from '../application/genrePlaylistsPort';

export const genrePlaylistLifecycleKey: InjectionKey<GenrePlaylistLifecyclePort> =
  Symbol('editorialGenrePlaylistLifecycle');
