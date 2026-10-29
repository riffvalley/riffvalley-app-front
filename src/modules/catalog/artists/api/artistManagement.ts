import api from "@services/api/api";
import type {
  ArtistManagementResponse,
  DeleteOrphansResponse,
} from "../types/artistApi";

export async function deleteArtist(id: string): Promise<void> {
  await api.delete(`/artists/${id}`);
}

export async function deleteOrphanArtists(): Promise<DeleteOrphansResponse> {
  const response = await api.delete<DeleteOrphansResponse>("/artists/orphans/all");
  return response.data;
}

export async function getArtistsManagement(params: {
  query?: string;
  limit?: number;
  offset?: number;
  genreId?: string;
  needsReview?: boolean;
}): Promise<ArtistManagementResponse> {
  const { query, limit, offset, genreId, needsReview } = params;
  const response = await api.get<ArtistManagementResponse>(
    "/artists/management",
    { params: { query, limit, offset, needsReview, genreId } },
  );
  return response.data;
}
