import api from "@services/api/api.ts";

export interface Genre {
  id: string;
  name: string;
  color: string;
}

export interface Country {
  id: string;
  name: string;
  isoCode: string;
}

export interface CatalogResponse {
  genres: Genre[];
  countries: Country[];
}

export async function getCatalog(): Promise<CatalogResponse> {
  const response = await api.get<CatalogResponse>("/catalog");
  return response.data;
}
