import api from "@services/api/api.ts";
import type { Genre } from "@services/genres/genres.ts";
import type { Country } from "@services/countries/countries.ts";

export type { Genre, Country };

export interface CatalogResponse {
  genres: Genre[];
  countries: Country[];
}

export async function getCatalog(): Promise<CatalogResponse> {
  const response = await api.get<CatalogResponse>("/catalog");
  return response.data;
}
