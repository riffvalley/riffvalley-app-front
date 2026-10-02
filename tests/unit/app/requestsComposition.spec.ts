import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  approveDiscRequest,
  createDiscRequest,
  fetchDiscRequests,
  fetchMyDiscRequests,
  fetchRequestCatalogOptions,
  rejectDiscRequest,
  reopenDiscRequest,
  requestsPort,
  updateDiscRequest,
} from '../../../src/app/dependencies/requests';
import type { Catalog } from '../../../src/modules/catalog';
import type { DiscRequest } from '../../../src/modules/releases/requests/domain/request';
import type { RequestsPort } from '../../../src/modules/releases/requests/application/requestsPort';
import { requestsApi } from '../../../src/modules/releases/requests/infrastructure/requestsApi';

const { fetchCatalogData, catalogStore } = vi.hoisted(() => ({
  fetchCatalogData: vi.fn(),
  catalogStore: { genres: [] as { id: string; name: string; color: string }[], countries: [] as { id: string; name: string; isoCode: string }[] },
}));

vi.mock('@/app/dependencies/catalog', () => ({ fetchCatalog: fetchCatalogData }));
vi.mock('@/modules/catalog', () => ({ useCatalogStore: () => catalogStore }));

const request: DiscRequest = {
  id: 'request-1', discName: 'Disco', artistName: 'Banda', releaseDate: null,
  ep: false, debut: false, status: 'pending', adminNotes: null, createdAt: '2026-06-01',
  genre: null, country: null,
};

function makePort(): RequestsPort {
  return {
    create: vi.fn(async () => request),
    listMine: vi.fn(async () => [request]),
    list: vi.fn(async () => [request]),
    update: vi.fn(async () => request),
    approve: vi.fn(async () => undefined),
    reject: vi.fn(async () => request),
    reopen: vi.fn(async () => request),
  };
}

describe('Requests app composition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    catalogStore.genres = [{ id: 'g1', name: 'Rock', color: '#123456' }];
    catalogStore.countries = [{ id: 'c1', name: 'España', isoCode: 'ES' }];
  });

  it('composes the Releases HTTP adapter as the request port', () => {
    expect(requestsPort).toBe(requestsApi);
  });

  it('loads Catalog reference data and exposes its options without converting Catalog entities', async () => {
    const catalog: Pick<Catalog, 'genres' | 'countries'> = {
      genres: catalogStore.genres, countries: catalogStore.countries,
    };
    fetchCatalogData.mockResolvedValueOnce(undefined);
    await expect(fetchRequestCatalogOptions()).resolves.toEqual(catalog);
    expect(fetchCatalogData).toHaveBeenCalledOnce();
  });

  it('delegates request creation, queries, edits and lifecycle actions through the injected Requests port', async () => {
    const port = makePort();
    const input = { discName: 'Disco', artistName: 'Banda', genreId: 'g1', countryId: 'c1' };
    const edit = { genreId: null, adminNotes: '' };
    const rejection = { adminNotes: 'No encontrado' };

    await expect(createDiscRequest(input, port)).resolves.toBe(request);
    await expect(fetchMyDiscRequests(port)).resolves.toEqual([request]);
    await expect(fetchDiscRequests(port)).resolves.toEqual([request]);
    await expect(updateDiscRequest('request-1', edit, port)).resolves.toBe(request);
    await expect(approveDiscRequest('request-1', port)).resolves.toBeUndefined();
    await expect(rejectDiscRequest('request-1', rejection, port)).resolves.toBe(request);
    await expect(reopenDiscRequest('request-1', port)).resolves.toBe(request);

    expect(port.create).toHaveBeenCalledWith(input);
    expect(port.listMine).toHaveBeenCalledOnce();
    expect(port.list).toHaveBeenCalledOnce();
    expect(port.update).toHaveBeenCalledWith('request-1', edit);
    expect(port.approve).toHaveBeenCalledWith('request-1');
    expect(port.reject).toHaveBeenCalledWith('request-1', rejection);
    expect(port.reopen).toHaveBeenCalledWith('request-1');
  });

  it('propagates Catalog loading failures without translating them', async () => {
    const failure = new Error('catalog unavailable');
    fetchCatalogData.mockRejectedValueOnce(failure);
    await expect(fetchRequestCatalogOptions()).rejects.toBe(failure);
  });
});
