import type { InjectionKey } from 'vue';
import type { GenrePlaylistArtistTracksPort } from '../application/genrePlaylistsPort';

export const genrePlaylistArtistTracksKey: InjectionKey<GenrePlaylistArtistTracksPort> =
  Symbol('editorialGenrePlaylistArtistTracks');
