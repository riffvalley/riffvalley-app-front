import api from '@/shared/infrastructure/http/client';
import type { GenrePlaylistArtistTracksPort } from '../application/genrePlaylistsPort';
import type {
  GenreArtistTrackSearchResult,
  GenrePlaylist,
} from '../domain/genrePlaylists';

export const genrePlaylistArtistTracksApi: GenrePlaylistArtistTracksPort = {
  async searchArtistTracks(playlistId, artistId, query = '') {
    const response = await api.get<GenreArtistTrackSearchResult>(
      `/genre-playlists/${playlistId}/artists/${artistId}/tracks`,
      { params: query.trim() ? { q: query.trim() } : undefined },
    );
    return response.data;
  },

  async addArtist(playlistId, artistId, spotifyTrackIds) {
    const response = await api.post<GenrePlaylist>(
      `/genre-playlists/${playlistId}/artists`,
      { artistId, spotifyTrackIds },
    );
    return response.data;
  },

  async replaceArtistTracks(playlistId, artistId, spotifyTrackIds) {
    const response = await api.put<GenrePlaylist>(
      `/genre-playlists/${playlistId}/artists/${artistId}/tracks`,
      { spotifyTrackIds },
    );
    return response.data;
  },

  async removeArtist(playlistId, artistId) {
    const response = await api.delete<GenrePlaylist>(
      `/genre-playlists/${playlistId}/artists/${artistId}`,
    );
    return response.data;
  },
};
