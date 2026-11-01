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

// Obtener todos los géneros sin paginación (opcional)
export async function getAllGenres(): Promise<Genre[]> {
  const response = await api.get<Genre[]>("/genres/all");
  return response.data;
}
