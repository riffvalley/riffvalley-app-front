import api from "@services/api/api.ts";

export interface Genre {
  id: string;
  name: string;
  color: string;
}

export interface GenresResponse {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  data: Genre[];
}

// Obtener la lista de géneros con paginación
export async function getGenres(
  limit: number,
  offset: number,
  signal?: AbortSignal
): Promise<GenresResponse> {
  const response = await api.get<GenresResponse>("/genres", {
    params: { limit, offset },
    ...(signal ? { signal } : {}),
  });
  return response.data;
}

// El backend no ofrece /genres/all: recuperar el catálogo recorriendo GET /genres.
export async function getAllGenres(signal?: AbortSignal): Promise<Genre[]> {
  const pageSize = 300;
  const genres: Genre[] = [];
  let offset = 0;

  while (true) {
    const response = await getGenres(pageSize, offset, signal);
    genres.push(...response.data);
    if (!response.data.length || response.currentPage >= response.totalPages) return genres;

    const nextOffset = offset + (response.limit || pageSize);
    if (nextOffset <= offset) return genres;
    offset = nextOffset;
  }
}
