import {
  approveRequest as approveRequestOperation,
  createRequest as createRequestOperation,
  listMyRequests,
  listRequests,
  rejectRequest as rejectRequestOperation,
  reopenRequest as reopenRequestOperation,
  updateRequest as updateRequestOperation,
} from '@/modules/releases/requests/application/requestOperations';
import type { RequestsPort } from '@/modules/releases/requests/application/requestsPort';
import type {
  CreateRequestInput,
  DiscRequest,
  RejectRequestInput,
  UpdateRequestInput,
} from '@/modules/releases/requests/domain/request';
import { requestsApi } from '@/modules/releases/requests/infrastructure/requestsApi';
import { fetchCatalog as fetchCatalogData } from './catalog';
import { useCatalogStore, type Catalog } from '@/modules/catalog';

export const requestsPort: RequestsPort = requestsApi;

/** Loads Catalog's shared reference data and publishes only the options requests need. */
export async function fetchRequestCatalogOptions(): Promise<Pick<Catalog, 'genres' | 'countries'>> {
  await fetchCatalogData();
  const catalog = useCatalogStore();
  return { genres: catalog.genres, countries: catalog.countries };
}

export function createDiscRequest(
  input: CreateRequestInput,
  port: RequestsPort = requestsPort,
): Promise<DiscRequest> {
  return createRequestOperation(port, input);
}

export function fetchMyDiscRequests(port: RequestsPort = requestsPort): Promise<DiscRequest[]> {
  return listMyRequests(port);
}

export function fetchDiscRequests(port: RequestsPort = requestsPort): Promise<DiscRequest[]> {
  return listRequests(port);
}

export function updateDiscRequest(
  id: string,
  input: UpdateRequestInput,
  port: RequestsPort = requestsPort,
): Promise<DiscRequest> {
  return updateRequestOperation(port, id, input);
}

export function approveDiscRequest(id: string, port: RequestsPort = requestsPort): Promise<void> {
  return approveRequestOperation(port, id);
}

export function rejectDiscRequest(
  id: string,
  input: RejectRequestInput,
  port: RequestsPort = requestsPort,
): Promise<DiscRequest> {
  return rejectRequestOperation(port, id, input);
}

export function reopenDiscRequest(id: string, port: RequestsPort = requestsPort): Promise<DiscRequest> {
  return reopenRequestOperation(port, id);
}
