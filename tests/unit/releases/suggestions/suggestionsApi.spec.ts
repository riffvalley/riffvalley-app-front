import { beforeEach, describe, expect, it, vi } from 'vitest';
import { suggestionsApi } from '../../../../src/modules/releases/suggestions/infrastructure/suggestionsApi';

const { get, post, patch, deleteRequest } = vi.hoisted(() => ({
  get: vi.fn(), post: vi.fn(), patch: vi.fn(), deleteRequest: vi.fn(),
}));

vi.mock('@/shared/infrastructure/http/client', () => ({
  default: { get, post, patch, delete: deleteRequest },
}));

const suggestion = {
  id: 'suggestion-1', title: 'Mejorar búsqueda', description: 'Añadir filtros',
  type: 'suggestion' as const, status: 'in_progress' as const, priority: 'medium' as const,
  rejectionReason: null, userId: 'user-1', user: { id: 'user-1', username: 'ana', image: null },
  versionItemId: null, versionItem: null, createdAt: '2026-01-02T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

describe('Releases suggestions HTTP adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({ data: [] });
    post.mockResolvedValue({ data: suggestion });
    patch.mockResolvedValue({ data: suggestion });
    deleteRequest.mockResolvedValue({ data: 'ignored' });
  });

  it('posts the create input unchanged and returns the response data', async () => {
    const input = { title: 'Mejorar búsqueda', description: 'Añadir filtros', type: 'suggestion' as const };
    await expect(suggestionsApi.create(input)).resolves.toEqual(suggestion);
    expect(post).toHaveBeenCalledWith('/suggestions', input);
  });

  it('gets suggestions with query params and accepts both array and { data } response bodies', async () => {
    const filters = { type: 'bug' as const, status: 'rejected' as const };
    get.mockResolvedValueOnce({ data: [suggestion] });
    await expect(suggestionsApi.list(filters)).resolves.toEqual([suggestion]);
    expect(get).toHaveBeenLastCalledWith('/suggestions', { params: filters });

    get.mockResolvedValueOnce({ data: { data: [suggestion] } });
    await expect(suggestionsApi.list({ status: 'in_progress' })).resolves.toEqual([suggestion]);
    expect(get).toHaveBeenLastCalledWith('/suggestions', { params: { status: 'in_progress' } });
  });

  it('gets own suggestions and maps the response data and status counts to the application result', async () => {
    const filters = { type: 'suggestion' as const };
    get.mockResolvedValueOnce({ data: {
      data: [suggestion], counts: { in_progress: 1, done: 2, rejected: 3 },
    } });

    await expect(suggestionsApi.listMine(filters)).resolves.toEqual({
      suggestions: [suggestion], counts: { in_progress: 1, done: 2, rejected: 3 },
    });
    expect(get).toHaveBeenCalledWith('/suggestions/my', { params: filters });
  });

  it('patches priority at the suggestion resource and returns the updated suggestion', async () => {
    await expect(suggestionsApi.updatePriority('suggestion-1', 'high')).resolves.toEqual(suggestion);
    expect(patch).toHaveBeenCalledWith('/suggestions/suggestion-1', { priority: 'high' });
  });

  it('uses progress, reject and done endpoints with their legacy request bodies', async () => {
    await suggestionsApi.progress('suggestion-1');
    await suggestionsApi.reject('suggestion-1', { rejectionReason: 'No se puede reproducir' });
    await suggestionsApi.complete('suggestion-1', {});
    await suggestionsApi.complete('suggestion-1', { versionItemId: 'version-item-1' });

    expect(patch).toHaveBeenNthCalledWith(1, '/suggestions/suggestion-1/progress');
    expect(patch).toHaveBeenNthCalledWith(2, '/suggestions/suggestion-1/reject', {
      rejectionReason: 'No se puede reproducir',
    });
    expect(patch).toHaveBeenNthCalledWith(3, '/suggestions/suggestion-1/done', { versionItemId: undefined });
    expect(patch).toHaveBeenNthCalledWith(4, '/suggestions/suggestion-1/done', {
      versionItemId: 'version-item-1',
    });
  });

  it('deletes by ID and resolves void regardless of the transport response body', async () => {
    await expect(suggestionsApi.delete('suggestion-1')).resolves.toBeUndefined();
    expect(deleteRequest).toHaveBeenCalledWith('/suggestions/suggestion-1');
  });

  it('propagates the original transport error from every endpoint family', async () => {
    const failure = new Error('network failure');
    get.mockRejectedValueOnce(failure);
    post.mockRejectedValueOnce(failure);
    patch.mockRejectedValueOnce(failure);
    deleteRequest.mockRejectedValueOnce(failure);

    await expect(suggestionsApi.list({})).rejects.toBe(failure);
    await expect(suggestionsApi.create({ title: 'Title', description: 'Description' })).rejects.toBe(failure);
    await expect(suggestionsApi.progress('suggestion-1')).rejects.toBe(failure);
    await expect(suggestionsApi.delete('suggestion-1')).rejects.toBe(failure);
  });
});
