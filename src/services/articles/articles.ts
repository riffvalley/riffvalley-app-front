
import api from '@services/api/api';

// =========================
// Tipos
// =========================
export type ArticleState =
    | 'not_started'
    | 'in_progress'
    | 'editing'
    | 'ready'
    | 'published';

export const ARTICLE_STATES: ArticleState[] = [
    'not_started',
    'in_progress',
    'editing',
    'ready',
    'published',
];

export type ArticleType =
    | 'cronica'
    | 'festival'
    | 'review'
    | 'entrevista'
    | 'articulo';

export const ARTICLE_TYPES: ArticleType[] = [
    'cronica',
    'festival',
    'review',
    'entrevista',
    'articulo',
];

export interface Article {
    id: string;
    name: string;
    status: ArticleState;
    type: ArticleType;
    link?: string; // Optional link if needed
    updateDate: string | null; // ISO
    createdAt: string; // ISO
    updatedAt: string; // ISO
    user?: { id: string; username: string; image?: string }; // Usuario asignado
    userId?: string;
    editor?: { id: string; username: string; image?: string }; // Editor asignado
    editorId?: string;
}

// =========================
// DTOs (frontend)
// =========================
export interface CreateArticleDto {
    name: string;
    status: ArticleState;
    type: ArticleType;
    link?: string;
    updateDate?: string;
    userId?: string;
    editorId?: string;
}

export interface UpdateArticleDto extends Partial<CreateArticleDto> { }

// Utils
export const toISO = (d: Date) => d.toISOString();

// =========================
// Services
// =========================

export async function getArticles(userId?: string): Promise<Article[]> {
    const params: any = {};
    if (userId) params.userId = userId;

    const { data } = await api.get<Article[]>('/articles', { params });
    return data;
}

export async function getArticle(id: string): Promise<Article> {
    const { data } = await api.get<Article>(`/articles/${id}`);
    return data;
}

export async function createArticle(dto: CreateArticleDto): Promise<Article> {
    const { data } = await api.post<Article>('/articles', dto);
    return data;
}

export async function updateArticle(id: string, dto: UpdateArticleDto): Promise<Article> {
    const { data } = await api.patch<Article>(`/articles/${id}`, dto);
    return data;
}

export async function deleteArticle(id: string): Promise<void> {
    await api.delete(`/articles/${id}`);
}
