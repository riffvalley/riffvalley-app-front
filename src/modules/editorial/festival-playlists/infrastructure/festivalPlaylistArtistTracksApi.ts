import api from '@/shared/infrastructure/http/client';
import type { FestivalPlaylistArtistTracksPort } from '../application/festivalPlaylistsPort';
import type {
  FailedFestivalArtistTrackSearchDto,
  FestivalPlaylistArtistMutationDto,
} from './festivalPlaylistArtistDtos';

export const festivalPlaylistArtistTracksApi: FestivalPlaylistArtistTracksPort = {
  async addArtist(playlistId, artistId, tracksPerArtist, recentSetlists) {
    const response = await api.post<FestivalPlaylistArtistMutationDto>(
      `/festival-playlists/${playlistId}/artists`,
      { artistId, tracksPerArtist, recentSetlists },
    );
    return response.data;
  },

  async removeArtist(playlistId, artistId) {
    const response = await api.delete<FestivalPlaylistArtistMutationDto>(
      `/festival-playlists/${playlistId}/artists/${artistId}`,
    );
    return response.data;
  },

  async searchFailedArtistTracks(playlistId, artistId, query) {
    const response = await api.get<FailedFestivalArtistTrackSearchDto>(
      `/festival-playlists/${playlistId}/artists/${artistId}/tracks`,
      { params: { q: query || undefined } },
    );
    return response.data;
  },

  async replaceFailedArtistTracks(playlistId, artistId, spotifyTrackIds) {
    const response = await api.put<FestivalPlaylistArtistMutationDto>(
      `/festival-playlists/${playlistId}/artists/${artistId}/tracks`,
      { spotifyTrackIds },
    );
    return response.data;
  },

  async clearPlaylistTracks(playlistId) {
    const response = await api.delete<FestivalPlaylistArtistMutationDto>(
      `/festival-playlists/${playlistId}/tracks`,
    );
    return response.data;
  },
};
