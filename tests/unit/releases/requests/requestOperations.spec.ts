import { describe, expect, it, vi } from 'vitest';
import type {
  CreateRequestInput,
  DiscRequest,
  RejectRequestInput,
  UpdateRequestInput,
} from '../../../../src/modules/releases/requests/domain/request';
import {
  approveRequest,
  createRequest,
  listMyRequests,
  listRequests,
  rejectRequest,
  reopenRequest,
  updateRequest,
} from '../../../../src/modules/releases/requests/application/requestOperations';
import type { RequestsPort } from '../../../../src/modules/releases/requests/application/requestsPort';

const record: DiscRequest = {
  id: 'request-1', discName: 'Disco', artistName: 'Banda', releaseDate: null,
  ep: false, debut: true, status: 'pending', adminNotes: null, createdAt: '2026-01-01T00:00:00.000Z',
  genre: null, country: { id: 'country-1', name: 'España' },
};

function makeRequestsPort(): RequestsPort {
  return {
    create: vi.fn(async (_input: CreateRequestInput) => record),
    listMine: vi.fn(async () => [record]),
    list: vi.fn(async () => [record]),
    update: vi.fn(async (_id: string, _input: UpdateRequestInput) => record),
    approve: vi.fn(async (_id: string) => undefined),
    reject: vi.fn(async (_id: string, _input: RejectRequestInput) => record),
    reopen: vi.fn(async (_id: string) => record),
  };
}

describe('Releases request operations', () => {
  it('delegates requester and moderation actions with domain inputs and results', async () => {
    const port = makeRequestsPort();
    const createInput: CreateRequestInput = {
      discName: 'Disco', artistName: 'Banda', genreId: 'genre-1', countryId: 'country-1',
    };
    const updateInput: UpdateRequestInput = { genreId: null, countryId: 'country-1', adminNotes: '' };
    const rejection: RejectRequestInput = { adminNotes: 'Datos incompletos' };

    await expect(createRequest(port, createInput)).resolves.toBe(record);
    await expect(listMyRequests(port)).resolves.toEqual([record]);
    await expect(listRequests(port)).resolves.toEqual([record]);
    await expect(updateRequest(port, 'request-1', updateInput)).resolves.toBe(record);
    await expect(approveRequest(port, 'request-1')).resolves.toBeUndefined();
    await expect(rejectRequest(port, 'request-1', rejection)).resolves.toBe(record);
    await expect(reopenRequest(port, 'request-1')).resolves.toBe(record);

    expect(port.create).toHaveBeenCalledWith(createInput);
    expect(port.listMine).toHaveBeenCalledOnce();
    expect(port.list).toHaveBeenCalledOnce();
    expect(port.update).toHaveBeenCalledWith('request-1', updateInput);
    expect(port.approve).toHaveBeenCalledWith('request-1');
    expect(port.reject).toHaveBeenCalledWith('request-1', rejection);
    expect(port.reopen).toHaveBeenCalledWith('request-1');
  });

  it('lists the complete collection without adding endpoint filters', async () => {
    const port = makeRequestsPort();
    await listRequests(port);
    expect(port.list).toHaveBeenCalledOnce();
    expect(port.list).toHaveBeenCalledWith();
  });

  it('propagates the original port failure without translating it', async () => {
    const failure = new Error('request persistence failed');
    const port: RequestsPort = {
      ...makeRequestsPort(),
      create: async () => { throw failure; },
    };
    await expect(createRequest(port, { discName: 'Disco', artistName: 'Banda' })).rejects.toBe(failure);
  });
});
