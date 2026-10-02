import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DiscRequest } from '../../../../src/modules/releases/requests/domain/request';
import { requestsApi } from '../../../../src/modules/releases/requests/infrastructure/requestsApi';

const { get, post, patch, deleteRequest } = vi.hoisted(() => ({
  get: vi.fn(), post: vi.fn(), patch: vi.fn(), deleteRequest: vi.fn(),
}));

vi.mock('@/shared/infrastructure/http/client', () => ({
  default: { get, post, patch, delete: deleteRequest },
}));

const request: DiscRequest = {
  id: 'request-1', discName: 'Disco', artistName: 'Banda', releaseDate: null,
  ep: false, debut: true, status: 'pending', adminNotes: null,
  createdAt: '2026-05-01T00:00:00.000Z', genre: null, country: { id: 'es', name: 'España' },
};

describe('Releases requests HTTP adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({ data: [request] });
    post.mockResolvedValue({ data: request });
    patch.mockResolvedValue({ data: request });
    deleteRequest.mockResolvedValue({ data: request });
  });

  it('posts creation inputs unchanged, including only the supplied optional values', async () => {
    const input = {
      discName: 'Disco', artistName: 'Banda', releaseDate: '2026-05-01',
      ep: true, genreId: 'genre-1', countryId: 'es', description: 'Edición especial',
    };
    await expect(requestsApi.create(input)).resolves.toBe(request);
    expect(post).toHaveBeenCalledWith('/requests', input);

    post.mockResolvedValueOnce({ data: request });
    const minimal = { discName: 'Disco', artistName: 'Banda' };
    await requestsApi.create(minimal);
    expect(post).toHaveBeenLastCalledWith('/requests', minimal);
  });

  it('loads own and all requests from separate endpoints and returns response data unchanged', async () => {
    await expect(requestsApi.listMine()).resolves.toEqual([request]);
    expect(get).toHaveBeenNthCalledWith(1, '/requests/my');
    await expect(requestsApi.list()).resolves.toEqual([request]);
    expect(get).toHaveBeenNthCalledWith(2, '/requests');
  });

  it('patches only the supplied fields and preserves null relation clears and empty strings', async () => {
    const input = { genreId: null, countryId: 'es', releaseDate: '', adminNotes: '', debut: false };
    await expect(requestsApi.update('request-1', input)).resolves.toBe(request);
    expect(patch).toHaveBeenCalledWith('/requests/request-1', input);
  });

  it('posts approval without a body and preserves the legacy void result', async () => {
    post.mockResolvedValueOnce({ data: { disc: { id: 'created-disc' } } });
    await expect(requestsApi.approve('request-1')).resolves.toBeUndefined();
    expect(post).toHaveBeenCalledWith('/requests/request-1/approve');
  });

  it('deletes with adminNotes in the request body and returns the rejection response', async () => {
    await expect(requestsApi.reject('request-1', { adminNotes: 'Motivo' })).resolves.toBe(request);
    expect(deleteRequest).toHaveBeenCalledWith('/requests/request-1', { data: { adminNotes: 'Motivo' } });
  });

  it('reopens without a body and returns response data unchanged', async () => {
    const reopened = { ...request, status: 'pending' as const, adminNotes: null };
    post.mockResolvedValueOnce({ data: reopened });
    await expect(requestsApi.reopen('request-1')).resolves.toBe(reopened);
    expect(post).toHaveBeenCalledWith('/requests/request-1/reopen');
  });

  it('propagates original transport errors for each endpoint without wrapping them', async () => {
    const failure = new Error('network failure');
    get.mockRejectedValueOnce(failure).mockRejectedValueOnce(failure);
    post.mockRejectedValueOnce(failure).mockRejectedValueOnce(failure).mockRejectedValueOnce(failure);
    patch.mockRejectedValueOnce(failure);
    deleteRequest.mockRejectedValueOnce(failure);

    await expect(requestsApi.listMine()).rejects.toBe(failure);
    await expect(requestsApi.list()).rejects.toBe(failure);
    await expect(requestsApi.create({ discName: 'Disco', artistName: 'Banda' })).rejects.toBe(failure);
    await expect(requestsApi.update('request-1', { ep: true })).rejects.toBe(failure);
    await expect(requestsApi.approve('request-1')).rejects.toBe(failure);
    await expect(requestsApi.reject('request-1', { adminNotes: 'Motivo' })).rejects.toBe(failure);
    await expect(requestsApi.reopen('request-1')).rejects.toBe(failure);
  });
});
