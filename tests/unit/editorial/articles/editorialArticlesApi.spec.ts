import { afterEach, describe, expect, it, vi } from 'vitest';
import { articlesApi } from '../../../../src/modules/editorial/articles/infrastructure/articlesApi';

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

const article = {
  id: 'article-1', name: 'Crónica', status: 'not_started' as const,
  type: 'cronica' as const, updateDate: null, createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z', content: null,
};

describe('Editorial articles API', () => {
  it('lists with the legacy optional user filter and returns response data', async () => {
    const articles = [article];
    get.mockResolvedValue({ data: articles });

    await expect(articlesApi.getArticles('user-1')).resolves.toBe(articles);
    expect(get).toHaveBeenCalledWith('/articles', { params: { userId: 'user-1' } });

    get.mockResolvedValueOnce({ data: [] });
    await expect(articlesApi.getArticles()).resolves.toEqual([]);
    expect(get).toHaveBeenLastCalledWith('/articles', { params: {} });
  });

  it('creates and updates through the existing endpoints and returns response data', async () => {
    const createData = { name: 'Crónica', status: 'not_started' as const, type: 'cronica' as const };
    const updateData = { status: 'editing' as const };
    post.mockResolvedValue({ data: article });
    patch.mockResolvedValue({ data: article });

    await expect(articlesApi.createArticle(createData)).resolves.toBe(article);
    expect(post).toHaveBeenCalledWith('/articles', createData);
    await expect(articlesApi.updateArticle('article-1', updateData)).resolves.toBe(article);
    expect(patch).toHaveBeenCalledWith('/articles/article-1', updateData);
  });

  it('deletes without a response and creates associated content with an empty body', async () => {
    deleteRequest.mockResolvedValue({ data: undefined });
    post.mockResolvedValue({ data: article });

    await expect(articlesApi.deleteArticle('article-1')).resolves.toBeUndefined();
    expect(deleteRequest).toHaveBeenCalledWith('/articles/article-1');
    await expect(articlesApi.createArticleContent('article-1')).resolves.toBe(article);
    expect(post).toHaveBeenCalledWith('/articles/article-1/content', {});

    const calendarData = {
      type: 'article' as const, name: 'Artículo del calendario', notes: 'Notas',
      publicationDate: '2026-10-02T10:00:00.000Z', closeDate: undefined,
      authorId: 'user-1', listDate: undefined, backlog: false,
    };
    await expect(articlesApi.createArticleCalendarContent(calendarData)).resolves.toBeUndefined();
    expect(post).toHaveBeenCalledWith('/contents', calendarData);
  });

  it('propagates HTTP errors unchanged for every operation', async () => {
    const failure = new Error('request failed');
    get.mockRejectedValueOnce(failure);
    post.mockRejectedValueOnce(failure).mockRejectedValueOnce(failure).mockRejectedValueOnce(failure);
    patch.mockRejectedValueOnce(failure);
    deleteRequest.mockRejectedValueOnce(failure);

    await expect(articlesApi.getArticles()).rejects.toBe(failure);
    await expect(articlesApi.createArticle({ name: 'X', status: 'not_started', type: 'articulo' })).rejects.toBe(failure);
    await expect(articlesApi.updateArticle('article-1', { status: 'ready' })).rejects.toBe(failure);
    await expect(articlesApi.deleteArticle('article-1')).rejects.toBe(failure);
    await expect(articlesApi.createArticleContent('article-1')).rejects.toBe(failure);
    await expect(articlesApi.createArticleCalendarContent({
      type: 'article', name: 'Artículo', authorId: 'user-1', backlog: true,
    })).rejects.toBe(failure);
  });
});
