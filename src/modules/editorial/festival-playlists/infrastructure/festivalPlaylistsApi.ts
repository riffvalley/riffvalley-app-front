import api from '@/shared/infrastructure/http/client';
import type {
  FestivalPlaylistLifecyclePort,
  FestivalPlaylistDataPort,
  FestivalPlaylistRegistrationsPort,
} from '../application/festivalPlaylistsPort';
import type {
  CreateFestivalPlaylistInput,
  FestivalPlaylistImageUpload,
  UpdateFestivalPlaylistMetadata,
} from '../domain/festivalPlaylists';
import type {
  FestivalPlaylistDataDto,
  FestivalPlaylistRegistrationDto,
} from './festivalPlaylistDtos';

export const festivalPlaylistRegistrationsApi: FestivalPlaylistRegistrationsPort = {
  async getFestivalRegistrations() {
    const response = await api.get<FestivalPlaylistRegistrationDto[]>('/spotify/festivals');
    return response.data;
  },

  async updateFestivalRegistration(registrationId, data) {
    const response = await api.patch<FestivalPlaylistRegistrationDto>(
      `/spotify/${registrationId}`,
      data,
    );
    return response.data;
  },
};

export const festivalPlaylistDataApi: FestivalPlaylistDataPort = {
  async getFestivalPlaylistData(playlistId) {
    const response = await api.get<FestivalPlaylistDataDto>(
      `/festival-playlists/${playlistId}`,
    );
    return response.data;
  },

  async updateFestivalPlaylistMetadata(playlistId, data: UpdateFestivalPlaylistMetadata) {
    await api.patch<FestivalPlaylistDataDto>(`/festival-playlists/${playlistId}`, data);
  },

  async updateFestivalPlaylistImage(playlistId, image: FestivalPlaylistImageUpload) {
    const formData = new FormData();
    const imageBlob = new Blob([image.bytes], { type: image.contentType });
    formData.append('image', imageBlob, image.filename);
    const response = await api.put<FestivalPlaylistDataDto>(
      `/festival-playlists/${playlistId}/image`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return { imageUrl: response.data.imageUrl };
  },
};

export const festivalPlaylistLifecycleApi: FestivalPlaylistLifecyclePort = {
  async createFestivalPlaylist(data: CreateFestivalPlaylistInput) {
    const response = await api.post<FestivalPlaylistDataDto>('/festival-playlists', data);
    return response.data;
  },

  async createLinkedFestivalPlaylist(spotifyUrl) {
    const response = await api.post<FestivalPlaylistDataDto>(
      '/festival-playlists/link',
      { spotifyUrl },
    );
    return response.data;
  },

  async linkExistingFestivalPlaylist(registrationId) {
    const response = await api.post<FestivalPlaylistDataDto>(
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
