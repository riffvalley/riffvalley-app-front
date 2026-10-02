import type { InjectionKey } from 'vue';
import type { GenrePlaylistDataPort } from '../application/genrePlaylistsPort';

export const genrePlaylistDataKey: InjectionKey<GenrePlaylistDataPort> =
  Symbol('editorialGenrePlaylistData');
