import api from '@/shared/infrastructure/http/client';
import type { GenrePlaylistLifecyclePort } from '../application/genrePlaylistsPort';
import type {
  CreateGenrePlaylist,
  DeleteGenrePlaylistRegistrationResult,
  GenrePlaylist,
} from '../domain/genrePlaylists';

export const genrePlaylistLifecycleApi: GenrePlaylistLifecyclePort = {
  async createGenrePlaylist(data: CreateGenrePlaylist) {
    const response = await api.post<GenrePlaylist>('/genre-playlists', data);
    return response.data;
  },

  async createLinkedGenrePlaylist(spotifyUrl) {
    const response = await api.post<GenrePlaylist>(
      '/genre-playlists/link',
      { spotifyUrl },
    );
    return response.data;
  },

  async linkExistingGenrePlaylist(playlistId) {
    const response = await api.post<GenrePlaylist>(
      `/genre-playlists/${playlistId}/link`,
    );
    return response.data;
  },

  async deleteGenrePlaylistRegistration(registrationId) {
    const response = await api.delete<DeleteGenrePlaylistRegistrationResult>(
      `/spotify/${registrationId}`,
    );
    return response.data;
  },
};
