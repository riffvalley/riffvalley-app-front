import api from "@services/api/api.ts";
import type { PaginatedResponse } from "@services/api/pagination";
import type { Disc } from "@services/discs/discs";

export interface UserDiscPending {
  id: string;
  disc: Disc;
}

export async function postPendingService(payload: any): Promise<void> {
  const response = await api.post("/pendings", payload);
  return response.data;
}

export async function deletePendingService(id: string): Promise<void> {
  await api.delete(`/pendings/${id}`);
}

export async function getPendingsByUser(
  limit: number,
  offset: number,
  query?: string,
  dateRange?: any,
  genre?: string,
  country?: string,
): Promise<PaginatedResponse<UserDiscPending>> {
  const response = await api.get<PaginatedResponse<UserDiscPending>>("/pendings", {
    params: {
      limit,
      offset,
      query,
      dateRange,
      genre,
      country,
    },
  });
  return response.data;
}
