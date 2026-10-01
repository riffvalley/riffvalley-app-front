import type { UserFavoritesQuery, UserFavoritesResult } from "../domain/favorite";

export interface FavoritePort {
  create(discId: string): Promise<string>;
  remove(favoriteId: string): Promise<void>;
  list(query: UserFavoritesQuery): Promise<UserFavoritesResult>;
}
