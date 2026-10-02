import api from '@/shared/infrastructure/http/client';
import type { GenrePlaylistDataPort } from '../application/genrePlaylistsPort';
import type { GenrePlaylist, GenrePlaylistImageUpload } from '../domain/genrePlaylists';

export const genrePlaylistDataApi: GenrePlaylistDataPort = {
  async getGenrePlaylist(playlistId) {
    const response = await api.get<GenrePlaylist>(`/genre-playlists/${playlistId}`);
    return response.data;
  },

  async updateGenrePlaylistMetadata(playlistId, data) {
    const response = await api.patch<GenrePlaylist>(`/genre-playlists/${playlistId}`, data);
    return response.data;
  },

  async updateGenrePlaylistImage(playlistId, image: GenrePlaylistImageUpload) {
    const formData = new FormData();
    const imageBlob = new Blob([image.bytes], { type: image.contentType });
    formData.append('image', imageBlob, image.filename);
    const response = await api.put<GenrePlaylist>(
      `/genre-playlists/${playlistId}/image`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },
};
