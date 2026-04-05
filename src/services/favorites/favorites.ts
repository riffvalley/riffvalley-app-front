import api from "@services/api/api.ts";

export async function postFavoriteService(payload: any): Promise<void> {
  const response = await api.post("/favorites", payload);
  return response.data;
}


export async function deleteFavoriteService(id: string): Promise<void> {
  await api.delete(`/favorites/${id}`);
}

export async function getFavoritesByUser(
  limit: number,
  offset: number,
  query?: string,
  dateRange?: any,
  genre?: string,
  country?: string,
  type?: string,
  orderBy?: string,
): Promise<any[]> {
  const response = await api.get<any[]>("/favorites", {
    params: {
      limit,
      offset,
      query,
      dateRange,
      genre,
      country,
      type,
      orderBy,
    },
  });
  return response.data;
}
