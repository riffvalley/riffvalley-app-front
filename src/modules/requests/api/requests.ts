import api from "@services/api/api";
import type { CreateRequestDto, DiscRequest, UpdateRequestDto } from "../types/requests";

export async function createRequest(dto: CreateRequestDto): Promise<DiscRequest> {
  const response = await api.post<DiscRequest>("/requests", dto);
  return response.data;
}

export async function getMyRequests(signal?: AbortSignal): Promise<DiscRequest[]> {
  const response = await api.get<DiscRequest[]>("/requests/my", { signal });
  return response.data;
}

export async function getAllRequests(signal?: AbortSignal): Promise<DiscRequest[]> {
  const response = await api.get<DiscRequest[]>("/requests", { signal });
  return response.data;
}

export async function updateRequest(id: string, dto: UpdateRequestDto): Promise<DiscRequest> {
  const response = await api.patch<DiscRequest>(`/requests/${id}`, dto);
  return response.data;
}

export async function approveRequest(id: string): Promise<void> {
  await api.post(`/requests/${id}/approve`);
}

export async function reopenRequest(id: string): Promise<DiscRequest> {
  const response = await api.post<DiscRequest>(`/requests/${id}/reopen`);
  return response.data;
}

export async function rejectRequest(id: string, adminNotes: string): Promise<DiscRequest> {
  const response = await api.delete<DiscRequest>(`/requests/${id}`, { data: { adminNotes } });
  return response.data;
}
