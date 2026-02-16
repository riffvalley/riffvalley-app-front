
import api from '@services/api/api';

// =========================
// Tipos
// =========================
export type NewsStatus = 'draft' | 'published';
export type NewsType = 'version' | 'new_feature' | 'team_notes';

export const NEWS_STATUSES: NewsStatus[] = ['draft', 'published'];
export const NEWS_TYPES: { value: NewsType; label: string }[] = [
    { value: 'new_feature', label: 'Nueva funcionalidad' },
    { value: 'version', label: 'Versión' },
    { value: 'team_notes', label: 'Notas del equipo' },
];

export interface News {
    id: string;
    title: string;
    body: string;
    image: string | null;
    publishDate: string | null;
    type: NewsType;
    status: NewsStatus;
    createdAt: string;
    updatedAt: string;
}

export interface NewsResponse {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    limit: number;
    data: News[];
}

// =========================
// DTOs
// =========================
export interface CreateNewsDto {
    title: string;
    body: string;
    type: NewsType;
    image?: string | null;
    publishDate?: string | null;
    status: NewsStatus;
}

export interface UpdateNewsDto extends Partial<CreateNewsDto> { }

// =========================
// Services
// =========================

export async function getNewsList(limit: number = 10, offset: number = 0, status?: NewsStatus): Promise<NewsResponse> {
    const { data } = await api.get<NewsResponse>('/news', {
        params: { limit, offset, ...(status && { status }) },
    });
    return data;
}

export async function getNews(id: string): Promise<News> {
    const { data } = await api.get<News>(`/news/${id}`);
    return data;
}

export async function createNews(dto: CreateNewsDto): Promise<News> {
    const { data } = await api.post<News>('/news', dto);
    return data;
}

export async function updateNews(id: string, dto: UpdateNewsDto): Promise<News> {
    const { data } = await api.patch<News>(`/news/${id}`, dto);
    return data;
}

export async function deleteNews(id: string): Promise<void> {
    await api.delete(`/news/${id}`);
}

// =========================
// Feed (aggregated endpoint)
// =========================
export interface FeedPost {
    id: string;
    title: string;
    link: string | null;
    image: string | null;
    date: string;
    source: 'app' | 'riffvalley.es' | 'telegram';
    type: NewsType | null;
    body: string | null;
}

export interface FeedResponse {
    posts: FeedPost[];
}

export async function getNewsFeed(): Promise<FeedResponse> {
    const { data } = await api.get<FeedResponse>('/news/feed');
    return data;
}

export async function uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<{ url: string }>('/uploads/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.url;
}
