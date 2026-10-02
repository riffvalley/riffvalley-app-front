import api from '@/shared/infrastructure/http/client';
import type { GenrePlaylistMaintenancePort } from '../application/genrePlaylistsPort';
import type { GenrePlaylist } from '../domain/genrePlaylists';

export const genrePlaylistMaintenanceApi: GenrePlaylistMaintenancePort = {
  async clearPlaylist(playlistId) {
    const response = await api.delete<GenrePlaylist>(
      `/genre-playlists/${playlistId}/tracks`,
    );
    return response.data;
  },

  async shufflePlaylist(playlistId) {
    const response = await api.post<GenrePlaylist>(
      `/genre-playlists/${playlistId}/shuffle`,
    );
    return response.data;
  },
};
