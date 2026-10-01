import api from "@services/api/api.ts";

export interface ArtistWithCountry {
  id: string;
  name: string;
  nameNormalized: string;
  description: string | null;
  image: string | null;
  countryId: string;
  country: { id: string; name: string; isoCode: string };
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
