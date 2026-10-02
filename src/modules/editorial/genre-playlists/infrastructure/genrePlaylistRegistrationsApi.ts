import api from '@/shared/infrastructure/http/client';
import type { GenrePlaylistRegistrationsPort } from '../application/genrePlaylistsPort';
import type { GenrePlaylistRegistration } from '../domain/genrePlaylists';

export const genrePlaylistRegistrationsApi: GenrePlaylistRegistrationsPort = {
  async getGenrePlaylistRegistrations() {
    const response = await api.get<GenrePlaylistRegistration[]>('/spotify/genres');
    return response.data;
  },

  async updateGenrePlaylistRegistration(registrationId, data) {
    const response = await api.patch<GenrePlaylistRegistration>(
      `/spotify/${registrationId}`,
      data,
    );
    return response.data;
  },
};
