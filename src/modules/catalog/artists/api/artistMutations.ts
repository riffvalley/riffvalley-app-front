import api from "@services/api/api";
import type {
  ArtistResult,
  ArtistWithCountry,
  CreateArtistPayload,
  UpdateArtistPayload,
} from "../types/artistApi";

export async function searchArtists(query: string): Promise<ArtistResult[]> {
  const response = await api.get<ArtistResult[]>("/artists/search", {
    params: { query },
  });
  return response.data;
}

export async function searchArtistsByName(name: string): Promise<ArtistWithCountry[]> {
  const response = await api.get<ArtistWithCountry[]>(
    "/artists/search/by-name",
    { params: { name } },
  );
  return response.data;
}

export async function postArtist(payload: CreateArtistPayload): Promise<ArtistWithCountry> {
  const response = await api.post<ArtistWithCountry>("/artists", payload);
  return response.data;
}

export async function updateArtist(id: string, data: UpdateArtistPayload): Promise<void> {
  console.log("Actualizando artista", id);
  console.log("Datos enviados al backend:", data);

  await api.patch(`/artists/${id}`, data);
}
