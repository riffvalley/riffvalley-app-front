import type {
  CreateRequestInput,
  DiscRequest,
  RejectRequestInput,
  UpdateRequestInput,
} from '../domain/request';
import type { RequestsPort } from './requestsPort';

export function createRequest(port: RequestsPort, input: CreateRequestInput): Promise<DiscRequest> {
  return port.create(input);
}

export function listMyRequests(port: RequestsPort): Promise<DiscRequest[]> {
  return port.listMine();
}

/** The current listing endpoint returns every request without server-side filters. */
export function listRequests(port: RequestsPort): Promise<DiscRequest[]> {
  return port.list();
}

export function updateRequest(
  port: RequestsPort,
  id: string,
  input: UpdateRequestInput,
): Promise<DiscRequest> {
  return port.update(id, input);
}

export function approveRequest(port: RequestsPort, id: string): Promise<void> {
  return port.approve(id);
}

export function rejectRequest(
  port: RequestsPort,
  id: string,
  input: RejectRequestInput,
): Promise<DiscRequest> {
  return port.reject(id, input);
}

export function reopenRequest(port: RequestsPort, id: string): Promise<DiscRequest> {
  return port.reopen(id);
}
