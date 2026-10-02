
import api from '@services/api/api';
import type { Article, CreateArticle, UpdateArticle } from '../../modules/editorial/articles/domain/articles';

export type {
    Article,
    ArticleContentRef,
    ArticleState,
    ArticleType,
} from '../../modules/editorial/articles/domain/articles';
export { ARTICLE_STATES, ARTICLE_TYPES } from '../../modules/editorial/articles/domain/articles';
export type CreateArticleDto = CreateArticle;
export type UpdateArticleDto = UpdateArticle;

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

/**
 * Crea manualmente el Content asociado a este artículo (backlog: true, sin publicationDate).
 * Requiere que el artículo ya tenga un usuario asignado (userId).
 */
export async function createArticleContent(articleId: string): Promise<Article> {
    const { data } = await api.post<Article>(`/articles/${articleId}/content`, {});
    return data;
}
