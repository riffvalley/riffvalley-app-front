import api from '@/shared/infrastructure/http/client';
import type { GenreArtistCatalogPort } from '../application/genrePlaylistsPort';
import type { GenreArtistSearchResult, PendingGenreArtist } from '../domain/genrePlaylists';

export const genreArtistCatalogApi: GenreArtistCatalogPort = {
  async searchArtists(query, limit, offset, genreId) {
    const response = await api.get<GenreArtistSearchResult>('/artists/management', {
      params: { query, limit, offset, genreId },
    });
    return response.data;
  },

  async createPendingArtist(name) {
    const response = await api.post<PendingGenreArtist>('/artists', { name });
    return response.data;
  },
};
