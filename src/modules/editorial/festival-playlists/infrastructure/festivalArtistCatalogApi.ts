import api from '@/shared/infrastructure/http/client';
import type { FestivalArtistCatalogPort } from '../application/festivalPlaylistsPort';
import type {
  FestivalArtistSearchResult,
  FestivalArtistTopSongs,
  PendingFestivalArtist,
} from '../domain/festivalPlaylists';

export const festivalArtistCatalogApi: FestivalArtistCatalogPort = {
  async searchArtists(query, limit, offset) {
    const response = await api.get<FestivalArtistSearchResult>('/artists/management', {
      params: { query, limit, offset, genreId: undefined },
    });
    return response.data;
  },

  async createPendingArtist(name) {
    const response = await api.post<PendingFestivalArtist>('/artists', { name });
    return response.data;
  },

  async getTopSongs(artist, limit, recentSetlists) {
    const response = await api.get<FestivalArtistTopSongs>(
      '/festival-playlists/artists/top-songs',
      { params: { artist, limit, recentSetlists } },
    );
    return response.data;
  },
};
