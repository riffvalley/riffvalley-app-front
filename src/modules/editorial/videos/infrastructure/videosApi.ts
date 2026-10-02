import api from '@/shared/infrastructure/http/client';
import type { VideosPort } from '../application/videosPort';
import type { Video, VideoListCreationResult } from '../domain/videos';

export const videosApi: VideosPort = {
  async getVideos(userId) {
    const params: { userId?: string } = {};
    if (userId) params.userId = userId;

    const response = await api.get<Video[]>('/videos', { params });
    return response.data;
  },

  async createVideo(data) {
    const response = await api.post<Video>('/videos', data);
    return response.data;
  },

  async updateVideo(videoId, data) {
    const response = await api.patch<Video>(`/videos/${videoId}`, data);
    return response.data;
  },

  async deleteVideo(videoId) {
    await api.delete(`/videos/${videoId}`);
  },

  async createVideoList(videoId) {
    const response = await api.post<VideoListCreationResult>(`/videos/${videoId}/list`);
    return response.data;
  },

  async createVideoContent(videoId) {
    const response = await api.post<Video>(`/videos/${videoId}/content`, {});
    return response.data;
  },
};
