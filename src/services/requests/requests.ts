import api from "@services/api/api.ts";

export interface CreateRequestDto {
  discName: string;
  artistName: string;
  releaseDate?: string;
  ep?: boolean;
  debut?: boolean;
  description?: string;
  image?: string;
  link?: string;
  genreId?: string;
  countryId?: string;
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
  releaseDate?: string;
  genreId?: string;
  countryId?: string;
  ep?: boolean;
  debut?: boolean;
  adminNotes?: string;
  status?: 'pending';
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

export async function rejectRequest(id: string, adminNotes: string): Promise<DiscRequest> {
  const response = await api.delete<DiscRequest>(`/requests/${id}`, {
    data: { adminNotes },
  });
  return response.data;
}
