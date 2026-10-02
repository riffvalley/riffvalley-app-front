import type { CreateVideo, UpdateVideo, Video, VideoListCreationResult } from '../domain/videos';

/** Operations used by the current video Kanban and calendar flows. */
export interface VideosPort {
  getVideos(userId?: string): Promise<Video[]>;
  createVideo(data: CreateVideo): Promise<Video>;
  updateVideo(videoId: string, data: UpdateVideo): Promise<Video>;
  deleteVideo(videoId: string): Promise<void>;
  createVideoList(videoId: string): Promise<VideoListCreationResult>;
  createVideoContent(videoId: string): Promise<Video>;
}
