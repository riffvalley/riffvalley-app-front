import api from "@services/api/api";
import type { ArtistDetailsDto } from "../types/artistApi";

export async function getArtistDetails(id: string, signal?: AbortSignal): Promise<ArtistDetailsDto> {
  const { data } = await api.get<ArtistDetailsDto>(`/artists/${encodeURIComponent(id)}/details`, { signal });
  return data;
}
