import api from "@/shared/infrastructure/http/client";
import type { FavoritePort } from "../application/favoritePort";
import type { UserFavoritesQuery, UserFavoritesResult } from "../domain/favorite";
import { parseUserDiscRelationPage } from "../../shared/infrastructure/userDiscRelationPage";

export const favoriteApi: FavoritePort = {
  async create(discId) {
    const response = await api.post<unknown>("/favorites", { discId });
    if (typeof response.data !== "object" || response.data === null || !("id" in response.data)
      || typeof response.data.id !== "string") {
      throw new Error("La respuesta al guardar el favorito no contiene su identificador.");
    }
    return response.data.id;
  },
  async remove(favoriteId) {
    await api.delete(`/favorites/${favoriteId}`);
  },
  async list(query: UserFavoritesQuery): Promise<UserFavoritesResult> {
    const response = await api.get<unknown>("/favorites", { params: query });
    return parseUserDiscRelationPage(response.data, "La lista de favoritos no tiene el formato esperado.");
  },
};
