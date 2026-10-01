import type { FavoritePort } from "./favoritePort";
import type { UserFavoritesQuery } from "../domain/favorite";

export interface FavoriteStatePort {
  get(userId: string, discId: string): { favoriteId: string | null; loaded: boolean };
  beginSubmit(userId: string, discId: string): boolean;
  set(userId: string, discId: string, favoriteId: string | null): void;
  finishSubmit(userId: string, discId: string): void;
}

export async function toggleUserFavorite(
  state: FavoriteStatePort,
  port: FavoritePort,
  userId: string,
  discId: string,
): Promise<string | null | false> {
  if (!state.beginSubmit(userId, discId)) return false;
  const current = state.get(userId, discId);
  try {
    if (current.favoriteId) {
      await port.remove(current.favoriteId);
      state.set(userId, discId, null);
      return null;
    }
    const favoriteId = await port.create(discId);
    state.set(userId, discId, favoriteId);
    return favoriteId;
  } finally {
    state.finishSubmit(userId, discId);
  }
}

export function listUserFavorites(port: FavoritePort, query: UserFavoritesQuery) {
  return port.list(query);
}
