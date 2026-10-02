import type { InjectionKey } from 'vue';
import type { GenreArtistCatalogPort } from '../application/genrePlaylistsPort';

export const genreArtistCatalogKey: InjectionKey<GenreArtistCatalogPort> =
  Symbol('editorialGenreArtistCatalog');
