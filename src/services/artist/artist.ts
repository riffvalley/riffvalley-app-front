import api from "@services/api/api.ts";
import type { ArtistManagementResponse } from "@/modules/catalog/domain/artistManagement";
export type {
  ArtistManagementDisc,
  ArtistManagementNationalRelease,
  ArtistManagementSpotifyPlaylist,
  ArtistManagementItem,
  ArtistManagementResponse,
} from "@/modules/catalog/domain/artistManagement";

export interface ArtistResult {
  id: string;
  name: string;
  image?: string;
}

export async function searchArtists(query: string): Promise<ArtistResult[]> {
  const response = await api.get<ArtistResult[]>("/artists/search", {
    params: { query },
  });
  return response.data;
}

export interface ArtistWithCountry {
  id: string;
  name: string;
  nameNormalized: string;
  description: string | null;
  image: string | null;
  countryId: string;
  country: { id: string; name: string; isoCode: string };
}

export async function searchArtistsByName(
  name: string,
): Promise<ArtistWithCountry[]> {
  const response = await api.get<ArtistWithCountry[]>(
    "/artists/search/by-name",
    { params: { name } },
  );
  return response.data;
}

export async function postArtist(payload: {
  name: string;
  countryId?: string;
}): Promise<ArtistWithCountry> {
  const response = await api.post<ArtistWithCountry>("/artists", payload);
  return response.data;
}

export async function updateArtist(
  id: string,
  data: {
    name?: string;
    countryId?: string | null;
    image?: string;
    description?: string;
  },
): Promise<void> {
  console.log("Actualizando artista", id);
  console.log("Datos enviados al backend:", data);

  await api.patch(`/artists/${id}`, data);
}

export async function deleteArtist(id: string): Promise<void> {
  await api.delete(`/artists/${id}`);
}

export interface DeleteOrphansResponse {
  deleted: number;
  artists: string[];
}

export async function deleteOrphanArtists(): Promise<DeleteOrphansResponse> {
  const response = await api.delete<DeleteOrphansResponse>(
    "/artists/orphans/all",
  );
  return response.data;
}

export async function getArtistsManagement(params: {
  query?: string;
  limit?: number;
  offset?: number;
  genreId?: string;
  countryId?: string;
  needsReview?: boolean;
}): Promise<ArtistManagementResponse> {
  const response = await api.get<ArtistManagementResponse>(
    "/artists/management",
    { params },
  );
  return response.data;
}
