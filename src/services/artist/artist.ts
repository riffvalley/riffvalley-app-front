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

export async function postArtist(payload: any): Promise<void> {
  const response = await api.post("/artists", payload);
  return response.data;
}

export async function updateArtist(
  id: string,
  data: {
    name?: string;
    countryId?: string;
  }
): Promise<void> {
  await api.patch(`/artists/${id}`, data);
}

export async function deleteArtist(id: string): Promise<void> {
  await api.delete(`/artists/${id}`);
}
