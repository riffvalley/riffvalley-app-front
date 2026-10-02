import type { InjectionKey } from 'vue';
import type { GenrePlaylistMaintenancePort } from '../application/genrePlaylistsPort';

export const genrePlaylistMaintenanceKey: InjectionKey<GenrePlaylistMaintenancePort> =
  Symbol('editorialGenrePlaylistMaintenance');
