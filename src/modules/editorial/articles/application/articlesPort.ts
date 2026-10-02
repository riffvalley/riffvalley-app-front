import type { Article, CreateArticle, CreateArticleCalendarContent, UpdateArticle } from '../domain/articles';

/** Operations used by the existing article Kanban and article calendar flows. */
export interface ArticlesPort {
  getArticles(userId?: string): Promise<Article[]>;
  createArticle(data: CreateArticle): Promise<Article>;
  updateArticle(articleId: string, data: UpdateArticle): Promise<Article>;
  deleteArticle(articleId: string): Promise<void>;
  createArticleContent(articleId: string): Promise<Article>;
  createArticleCalendarContent(data: CreateArticleCalendarContent): Promise<void>;
}
