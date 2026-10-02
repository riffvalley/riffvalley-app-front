import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  approveRequest, createRequest, getAllRequests, getMyRequests, rejectRequest,
  reopenRequest, updateRequest,
} from '../../../../src/services/requests/requests';

const { get, post, patch, deleteRequest } = vi.hoisted(() => ({
  get: vi.fn(), post: vi.fn(), patch: vi.fn(), deleteRequest: vi.fn(),
}));
vi.mock('@/services/api/api.ts', () => ({ default: { get, post, patch, delete: deleteRequest } }));

const request = {
  id: 'r-1', discName: 'Álbum', artistName: 'Banda', releaseDate: null,
  ep: false, debut: true, status: 'rejected' as const, adminNotes: 'Revisar datos',
  createdAt: '2026-02-03T10:00:00.000Z', genre: null, country: { id: 'es', name: 'España' },
};

describe('legacy requests HTTP contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({ data: [request] });
    post.mockResolvedValue({ data: request });
    patch.mockResolvedValue({ data: request });
    deleteRequest.mockResolvedValue({ data: request });
  });

  it('posts only provided create fields and returns response data', async () => {
    const input = { discName: 'Álbum', artistName: 'Banda', releaseDate: '2026-02-03', debut: true, genreId: 'g-1', countryId: 'es' };
    await expect(createRequest(input)).resolves.toEqual(request);
    expect(post).toHaveBeenCalledWith('/requests', input);
  });

  it('gets own and administrative collections from their distinct endpoints', async () => {
    await expect(getMyRequests()).resolves.toEqual([request]);
    await expect(getAllRequests()).resolves.toEqual([request]);
    expect(get).toHaveBeenNthCalledWith(1, '/requests/my');
    expect(get).toHaveBeenNthCalledWith(2, '/requests');
  });

  it('patches the request with optional fields, explicit null relation IDs and editable admin notes', async () => {
    const input = { releaseDate: '', genreId: null, countryId: 'es', ep: false, adminNotes: '' };
    await expect(updateRequest('r-1', input)).resolves.toEqual(request);
    expect(patch).toHaveBeenCalledWith('/requests/r-1', input);
  });

  it('approves without a body and discards any response data', async () => {
    post.mockResolvedValueOnce({ data: { disc: { id: 'd-1' }, artist: { id: 'a-1' } } });
    await expect(approveRequest('r-1')).resolves.toBeUndefined();
    expect(post).toHaveBeenCalledWith('/requests/r-1/approve');
  });

  it('returns the reopen response and rejects through DELETE with caller-provided notes', async () => {
    await expect(reopenRequest('r-1')).resolves.toEqual(request);
    await expect(rejectRequest('r-1', 'Motivo')).resolves.toEqual(request);
    expect(post).toHaveBeenCalledWith('/requests/r-1/reopen');
    expect(deleteRequest).toHaveBeenCalledWith('/requests/r-1', { data: { adminNotes: 'Motivo' } });
  });

  it('propagates the original transport error', async () => {
    const failure = new Error('offline');
    get.mockRejectedValueOnce(failure);
    await expect(getMyRequests()).rejects.toBe(failure);
  });
});
