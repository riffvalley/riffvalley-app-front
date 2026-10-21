import api from "@services/api/api.ts";

export interface CreateRequestDto {
  discName: string;
  artistName: string;
  releaseDate?: string | null;
  ep?: boolean;
  debut?: boolean;
  description?: string;
  image?: string;
  link?: string;
  genreId?: string | null;
  countryId?: string | null;
}

export interface DiscRequest {
  id: string;
  discName: string;
  artistName: string;
  releaseDate: string | null;
  ep: boolean;
  debut: boolean;
  status: "pending" | "approved" | "rejected";
  adminNotes: string | null;
  createdAt: string;
  genre: { id: string; name: string } | null;
  country: { id: string; name: string } | null;
}

export interface UpdateRequestDto {
  discName?: string;
  artistName?: string;
  releaseDate?: string | null;
  genreId?: string | null;
  countryId?: string | null;
  ep?: boolean;
  debut?: boolean;
  adminNotes?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getRequestErrorMessage(error: unknown, fallback: string): string {
  const response = isRecord(error) ? error.response : undefined;
  const data = isRecord(response) ? response.data : undefined;
  const message = isRecord(data) ? data.message : undefined;

  if (typeof message === "string" && message.trim()) return message;
  if (Array.isArray(message)) {
    const messages = message.filter(
      (item): item is string => typeof item === "string" && Boolean(item.trim()),
    );
    if (messages.length > 0) return messages.join(". ");
  }

  return fallback;
}

export async function createRequest(dto: CreateRequestDto): Promise<DiscRequest> {
  const response = await api.post<DiscRequest>("/requests", dto);
  return response.data;
}

export async function getMyRequests(): Promise<DiscRequest[]> {
  const response = await api.get<DiscRequest[]>("/requests/my");
  return response.data;
}

export async function getAllRequests(): Promise<DiscRequest[]> {
  const response = await api.get<DiscRequest[]>("/requests");
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
  const response = await api.delete<DiscRequest>(`/requests/${id}`, {
    data: { adminNotes },
  });
  return response.data;
}
