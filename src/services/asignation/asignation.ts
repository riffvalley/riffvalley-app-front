import api from "@services/api/api.ts";

export interface EditorialAsignation {
  id: string;
  done: boolean | null;
  position: number | null;
  description: string | null;
  similarBands?: string | null;
  spotifyTrackId?: string | null;
  genre?: string | null;
  user: { id: string; username: string; image?: string | null } | null;
  disc: {
    id: string;
    name: string;
    image: string | null;
    releaseDate?: string;
    artist: {
      id: string;
      name: string;
      country?: { id: string; name: string; isoCode?: string } | null;
    };
    genre?: { id?: string; name: string; color?: string | null } | null;
    country?: { id: string; name: string; isoCode?: string } | null;
  } | null;
}

export interface AssignationListResponse {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  data: EditorialAsignation[];
}

export interface CreateAsignationPayload {
  userId: string;
  discId: string;
  listId: string;
  genre?: string;
}

export interface UpdateAsignationPayload {
  done?: boolean;
  position?: number;
  userId?: string;
  description?: string;
  similarBands?: string;
  spotifyTrackId?: string;
  genre?: string;
}

export async function postAsignationService(
  payload: CreateAsignationPayload
): Promise<EditorialAsignation> {
  const response = await api.post<EditorialAsignation>("/asignations", payload);
  return response.data;
}

export async function getAsignationsByListService(
  listId: string,
  signal?: AbortSignal
): Promise<EditorialAsignation[]> {
  const response = signal
    ? await api.get<AssignationListResponse>(`/asignations/list/${listId}`, { signal })
    : await api.get<AssignationListResponse>(`/asignations/list/${listId}`);
  return response.data.data;
}

export async function deleteAsignationService(id: string): Promise<void> {
  await api.delete(`/asignations/${id}`);
}

export async function updateAsignationService(
  id: string,
  data: UpdateAsignationPayload
): Promise<EditorialAsignation> {
  const response = await api.patch<EditorialAsignation>(`/asignations/${id}`, data);
  return response.data;
}
