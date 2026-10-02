import api from '@/shared/infrastructure/http/client';
import type {
  CreateRequestInput,
  DiscRequest,
  RejectRequestInput,
  UpdateRequestInput,
} from '../domain/request';
import type { RequestsPort } from '../application/requestsPort';

// Keep the transport shapes local to this adapter. The current endpoint
// responses have the same observable fields as the Releases request model.
type CreateRequestDto = CreateRequestInput;
type UpdateRequestDto = UpdateRequestInput;
type RejectRequestDto = RejectRequestInput;
type DiscRequestResponseDto = DiscRequest;
type DiscRequestListResponseDto = DiscRequest[];

export const requestsApi: RequestsPort = {
  async create(input) {
    const dto: CreateRequestDto = input;
    const response = await api.post<DiscRequestResponseDto>('/requests', dto);
    return response.data;
  },

  async listMine() {
    const response = await api.get<DiscRequestListResponseDto>('/requests/my');
    return response.data;
  },

  async list() {
    const response = await api.get<DiscRequestListResponseDto>('/requests');
    return response.data;
  },

  async update(id, input) {
    const dto: UpdateRequestDto = input;
    const response = await api.patch<DiscRequestResponseDto>(`/requests/${id}`, dto);
    return response.data;
  },

  async approve(id) {
    // Legacy service discards the response body and resolves void.
    await api.post(`/requests/${id}/approve`);
  },

  async reject(id, input) {
    const dto: RejectRequestDto = { adminNotes: input.adminNotes };
    const response = await api.delete<DiscRequestResponseDto>(`/requests/${id}`, { data: dto });
    return response.data;
  },

  async reopen(id) {
    const response = await api.post<DiscRequestResponseDto>(`/requests/${id}/reopen`);
    return response.data;
  },
};
