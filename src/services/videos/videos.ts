import api from '@services/api/api';

// =========================
// Tipos
// =========================
export type VideoStatus =
    | 'not_started'
    | 'in_progress'
    | 'editing'
    | 'ready'
    | 'published';

export const VIDEO_STATUSES: VideoStatus[] = [
    'not_started',
    'in_progress',
    'editing',
    'ready',
    'published',
];

export type VideoType = 'best' | 'custom';

export const VIDEO_TYPES: VideoType[] = ['best', 'custom'];

export interface Video {
    id: string;
    name: string;
    status: VideoStatus;
    type: VideoType;
    link?: string;
    updateDate: string | null; // ISO
    createdAt: string; // ISO
    updatedAt: string; // ISO
    user?: { id: string; username: string; image?: string }; // Usuario asignado
    userId?: string;
    editor?: { id: string; username: string; image?: string }; // Editor asignado
    editorId?: string;
    listId?: string;
}

// =========================
// DTOs (frontend)
// =========================
export interface CreateVideoDto {
    name: string;
    status: VideoStatus;
    type: VideoType;
    link?: string;
    updateDate?: string;
    userId?: string;
    editorId?: string;
    listId?: string;
}

export interface UpdateVideoDto extends Partial<CreateVideoDto> { }

// Utils
export const toISO = (d: Date) => d.toISOString();

// =========================
// Services
// =========================

export async function getVideos(userId?: string): Promise<Video[]> {
    const params: any = {};
    if (userId) params.userId = userId;

    const { data } = await api.get<Video[]>('/videos', { params });
    return data;
}

export async function getVideo(id: string): Promise<Video> {
    const { data } = await api.get<Video>(`/videos/${id}`);
    return data;
}

export async function createVideo(dto: CreateVideoDto): Promise<Video> {
    const { data } = await api.post<Video>('/videos', dto);
    return data;
}

export async function updateVideo(id: string, dto: UpdateVideoDto): Promise<Video> {
    const { data } = await api.patch<Video>(`/videos/${id}`, dto);
    return data;
}

export async function deleteVideo(id: string): Promise<void> {
    await api.delete(`/videos/${id}`);
}

export async function createVideoList(videoId: string): Promise<any> {
    const { data } = await api.post(`/videos/${videoId}/list`);
    return data;
}
