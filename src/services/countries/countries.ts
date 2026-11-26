import api from "@services/api/api.ts";

export interface Country {
  id: string;
  name: string;
  isoCode: string | null; // por si viene null en BD
}

export interface CountriesResponse {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  data: Country[];
}

/** Obtener la lista de países con paginación */
export async function getCountries(
  limit: number,
  offset: number
): Promise<CountriesResponse> {
  const response = await api.get<CountriesResponse>("/countries", {
    params: { limit: 500, offset },
  });
  return response.data;
}

/** Obtener todos los países. El backend no ofrece /countries/all: se recorre GET /countries. */
export async function getAllCountries(): Promise<Country[]> {
  const countries: Country[] = [];
  let offset = 0;

  while (true) {
    const response = await getCountries(500, offset);
    countries.push(...response.data);
    if (!response.data.length || response.currentPage >= response.totalPages) return countries;

    const nextOffset = offset + (response.limit || response.data.length);
    if (nextOffset <= offset) return countries;
    offset = nextOffset;
  }
}

