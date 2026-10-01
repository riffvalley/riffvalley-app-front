import type { FavoritePort } from "./favoritePort";
import type { UserFavoritesQuery } from "../domain/favorite";

export interface FavoriteStatePort {
  get(userId: string, discId: string): { favoriteId: string | null; loaded: boolean };
  getSessionGeneration(): number;
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
  const generation = state.getSessionGeneration();
  if (!state.beginSubmit(userId, discId)) return false;
  const current = state.get(userId, discId);
  try {
    if (current.favoriteId) {
      await port.remove(current.favoriteId);
      if (generation !== state.getSessionGeneration()) return false;
      state.set(userId, discId, null);
      return null;
    }
    const favoriteId = await port.create(discId);
    if (generation !== state.getSessionGeneration()) return false;
    state.set(userId, discId, favoriteId);
    return favoriteId;
  } finally {
    if (generation === state.getSessionGeneration()) state.finishSubmit(userId, discId);
  }
}

export function listUserFavorites(port: FavoritePort, query: UserFavoritesQuery) {
  return port.list(query);
}
