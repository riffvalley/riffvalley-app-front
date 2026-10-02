import api from '@/shared/infrastructure/http/client';
import type {
  FestivalPlaylistLifecyclePort,
  FestivalPlaylistDataPort,
  FestivalPlaylistRegistrationsPort,
} from '../application/festivalPlaylistsPort';
import type {
  FestivalPlaylistData,
  FestivalPlaylistRegistration,
  CreateFestivalPlaylistInput,
  FestivalPlaylistImageUpload,
  UpdateFestivalPlaylistMetadata,
} from '../domain/festivalPlaylists';

export const festivalPlaylistRegistrationsApi: FestivalPlaylistRegistrationsPort = {
  async getFestivalRegistrations() {
    const response = await api.get<FestivalPlaylistRegistration[]>('/spotify/festivals');
    return response.data;
  },

  async updateFestivalRegistration(registrationId, data) {
    const response = await api.patch<FestivalPlaylistRegistration>(
      `/spotify/${registrationId}`,
      data,
    );
    return response.data;
  },
};

export const festivalPlaylistDataApi: FestivalPlaylistDataPort = {
  async getFestivalPlaylistData(playlistId) {
    const response = await api.get<FestivalPlaylistData>(
      `/festival-playlists/${playlistId}`,
    );
    return response.data;
  },

  async updateFestivalPlaylistMetadata(playlistId, data: UpdateFestivalPlaylistMetadata) {
    await api.patch<FestivalPlaylistData>(`/festival-playlists/${playlistId}`, data);
  },

  async updateFestivalPlaylistImage(playlistId, image: FestivalPlaylistImageUpload) {
    const formData = new FormData();
    const imageBlob = new Blob([image.bytes], { type: image.contentType });
    formData.append('image', imageBlob, image.filename);
    const response = await api.put<FestivalPlaylistData>(
      `/festival-playlists/${playlistId}/image`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return { imageUrl: response.data.imageUrl };
  },
};

export const festivalPlaylistLifecycleApi: FestivalPlaylistLifecyclePort = {
  async createFestivalPlaylist(data: CreateFestivalPlaylistInput) {
    const response = await api.post<FestivalPlaylistData>('/festival-playlists', data);
    return response.data;
  },

  async createLinkedFestivalPlaylist(spotifyUrl) {
    const response = await api.post<FestivalPlaylistData>(
      '/festival-playlists/link',
      { spotifyUrl },
    );
    return response.data;
  },

  async linkExistingFestivalPlaylist(registrationId) {
    const response = await api.post<FestivalPlaylistData>(
      `/festival-playlists/${registrationId}/link`,
    );
    return response.data;
  },

  async deleteFestivalRegistration(registrationId) {
    const response = await api.delete<
      | { ok: true }
      | { message: string }
    >(`/spotify/${registrationId}`);
    return response.data;
  },
};
