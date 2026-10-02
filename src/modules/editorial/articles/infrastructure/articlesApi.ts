import api from '@/shared/infrastructure/http/client';
import type { ArticlesPort } from '../application/articlesPort';
import type { Article, CreateArticleCalendarContent } from '../domain/articles';

export const articlesApi: ArticlesPort = {
  async getArticles(userId) {
    const params: { userId?: string } = {};
    if (userId) params.userId = userId;

    const response = await api.get<Article[]>('/articles', { params });
    return response.data;
  },

  async createArticle(data) {
    const response = await api.post<Article>('/articles', data);
    return response.data;
  },

  async updateArticle(articleId, data) {
    const response = await api.patch<Article>(`/articles/${articleId}`, data);
    return response.data;
  },

  async deleteArticle(articleId) {
    await api.delete(`/articles/${articleId}`);
  },

  async createArticleContent(articleId) {
    const response = await api.post<Article>(`/articles/${articleId}/content`, {});
    return response.data;
  },

  async createArticleCalendarContent(data: CreateArticleCalendarContent) {
    await api.post('/contents', data);
  },
};
