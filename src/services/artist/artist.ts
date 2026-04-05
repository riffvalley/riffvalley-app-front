import api from "@services/api/api.ts";

export interface ArtistResult {
  id: string;
  name: string;
  image?: string;
}

export async function searchArtists(query: string): Promise<ArtistResult[]> {
  const response = await api.get<ArtistResult[]>("/artists/search", { params: { query } });
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

export async function searchArtistsByName(name: string): Promise<ArtistWithCountry[]> {
  const response = await api.get<ArtistWithCountry[]>("/artists/search/by-name", { params: { name } });
  return response.data;
}

export async function postArtist(payload: { name: string; countryId?: string }): Promise<ArtistWithCountry> {
  const response = await api.post<ArtistWithCountry>("/artists", payload);
  return response.data;
}

export async function updateArtist(
  id: string,
  data: {
    name?: string;
    countryId?: string;
    image?: string;
    description?: string;
  }
): Promise<void> {
  console.log("Actualizando artista", id);
  console.log("Datos enviados al backend:", data);

  await api.patch(`/artists/${id}`, data);
}

export async function deleteArtist(id: string): Promise<void> {
  await api.delete(`/artists/${id}`);
}

export interface ArtistManagementDisc {
  id: string;
  name: string;
  releaseDate: string;
  ep: boolean;
  debut: boolean;
  image: string | null;
  link: string | null;
  genre: { id: string; name: string; color: string } | null;
  rateCount: number;
  averageRate: number;
}

export interface ArtistManagementNationalRelease {
  id: string;
  discName: string;
  discType: string;
  genre: string;
  releaseDay: string;
  approved: boolean;
  link: string | null;
  discId: string;
}

export interface ArtistManagementItem {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  country: { id: string; name: string; isoCode: string } | null;
  discs: ArtistManagementDisc[];
  nationalReleases: ArtistManagementNationalRelease[];
}

export interface ArtistManagementResponse {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  data: ArtistManagementItem[];
}

export async function getArtistsManagement(params: {
  query?: string;
  limit?: number;
  offset?: number;
  genreId?: string;
  needsReview?: boolean;
}): Promise<ArtistManagementResponse> {
  const response = await api.get<ArtistManagementResponse>("/artists/management", { params });
  return response.data;
}
