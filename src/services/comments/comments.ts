import api from "@services/api/api.ts";

export async function getCommentsByUser(
  limit: number,
  offset: number,
  searchQuery?: string,
  selectedWeek?: any,
  selectedGenre?: string,
  selectedCountry?: string,
  orderBy?: string
): Promise<any> {
  const response = await api.get("/comments", {
    params: {
      limit,
      offset,
      query: searchQuery,
      dateRange: selectedWeek,
      genre: selectedGenre,
      country: selectedCountry,
      type: "comment",
      orderBy,
    },
  });

  return response.data;
}
