import { afterEach, describe, expect, it, vi } from 'vitest';
import { videosApi } from '../../../../src/modules/editorial/videos/infrastructure/videosApi';

const { get, post, patch, deleteRequest } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  deleteRequest: vi.fn(),
}));
vi.mock('@/shared/infrastructure/http/client', () => ({
  default: { get, post, patch, delete: deleteRequest },
}));

afterEach(() => vi.clearAllMocks());

const video = {
  id: 'video-1', name: 'Vídeo', status: 'not_started' as const, type: 'best' as const,
  updateDate: null, createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z', content: null,
};

describe('Editorial videos API', () => {
  it('lists videos with the legacy optional user filter and returns response data', async () => {
    const videos = [video];
    get.mockResolvedValue({ data: videos });

    await expect(videosApi.getVideos('user-1')).resolves.toBe(videos);
    expect(get).toHaveBeenCalledWith('/videos', { params: { userId: 'user-1' } });

    get.mockResolvedValueOnce({ data: [] });
    await expect(videosApi.getVideos()).resolves.toEqual([]);
    expect(get).toHaveBeenLastCalledWith('/videos', { params: {} });
  });

  it('creates and updates through the existing endpoints with unchanged payloads', async () => {
    const createData = { name: 'Vídeo', status: 'not_started' as const, type: 'best' as const };
    const updateData = { status: 'editing' as const };
    post.mockResolvedValue({ data: video });
    patch.mockResolvedValue({ data: video });

    await expect(videosApi.createVideo(createData)).resolves.toBe(video);
    expect(post).toHaveBeenCalledWith('/videos', createData);
    await expect(videosApi.updateVideo('video-1', updateData)).resolves.toBe(video);
    expect(patch).toHaveBeenCalledWith('/videos/video-1', updateData);
  });

  it('deletes and creates a video list and associated content using the existing endpoints', async () => {
    deleteRequest.mockResolvedValue({ data: undefined });
    const listResult = { list: { id: 'list-1' } };
    post.mockResolvedValueOnce({ data: listResult }).mockResolvedValueOnce({ data: video });

    await expect(videosApi.deleteVideo('video-1')).resolves.toBeUndefined();
    expect(deleteRequest).toHaveBeenCalledWith('/videos/video-1');
    await expect(videosApi.createVideoList('video-1')).resolves.toBe(listResult);
    expect(post).toHaveBeenCalledWith('/videos/video-1/list');
    await expect(videosApi.createVideoContent('video-1')).resolves.toBe(video);
    expect(post).toHaveBeenCalledWith('/videos/video-1/content', {});
  });

  it('propagates HTTP errors unchanged for every operation', async () => {
    const failure = new Error('request failed');
    get.mockRejectedValueOnce(failure);
    post.mockRejectedValueOnce(failure).mockRejectedValueOnce(failure).mockRejectedValueOnce(failure);
    patch.mockRejectedValueOnce(failure);
    deleteRequest.mockRejectedValueOnce(failure);

    await expect(videosApi.getVideos()).rejects.toBe(failure);
    await expect(videosApi.createVideo({ name: 'X', status: 'not_started', type: 'best' })).rejects.toBe(failure);
    await expect(videosApi.updateVideo('video-1', { status: 'ready' })).rejects.toBe(failure);
    await expect(videosApi.deleteVideo('video-1')).rejects.toBe(failure);
    await expect(videosApi.createVideoList('video-1')).rejects.toBe(failure);
    await expect(videosApi.createVideoContent('video-1')).rejects.toBe(failure);
  });
});
