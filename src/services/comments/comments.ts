import api from "@services/api/api.ts";
import type { PaginatedResponse } from "@services/api/pagination";
import type { Disc } from "@services/discs/discs";

export interface UserDiscComment {
  id: string;
  comment: string;
  createdAt: string;
  disc?: Disc & { genre?: { name: string; color?: string | null } | null };
}

export async function postcommentService(payload: any): Promise<void> {
  const response = await api.post("/comments", payload);
  return response.data;
}

export async function updatecommentService(
  ratingId: string,
  updatecommentDto: any
) {
  // PATCH /comments/:id
  return api.patch(`/comments/${ratingId}`, updatecommentDto);
}

export async function getDisccomments(discId: string): Promise<any[]> {
  const response = await api.get<any[]>(`/comments/disc/${discId}`);

  return response.data;
}

export async function deleteCommentService(id: string): Promise<void> {
  await api.delete(`/comments/${id}`);
}

export async function updateCommentService(
  ratingId: string,
  updatecommentDto: any
) {
  // PATCH /comments/:id
  const response = await api.patch(`/comments/${ratingId}`, updatecommentDto);
  return response.data; 
}

export async function getCommentsByUser(
  limit: number,
  offset: number,
  searchQuery?: string,
  selectedWeek?: any,
  selectedGenre?: string,
  selectedCountry?: string,
  orderBy?: string
): Promise<PaginatedResponse<UserDiscComment>> {
  const response = await api.get<PaginatedResponse<UserDiscComment>>("/comments", {
    params: {
      limit,
      offset,
      query: searchQuery,
      dateRange: selectedWeek,
      genre: selectedGenre,
      country: selectedCountry,
      type: "comment",
      orderBy,
    },
  });

  return response.data;
}
