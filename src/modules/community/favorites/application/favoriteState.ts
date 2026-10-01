import type { FavoriteState } from "../domain/favorite";
import { createUserDiscState } from "../../shared/application/userDiscState";

const emptyFavorite = (): FavoriteState => ({ favoriteId: null, loaded: false });

const entries = createUserDiscState(
  emptyFavorite,
  (value) => ({ ...value }),
);

export const communityFavoriteState = {
  get: entries.get,
  seed(userId: string, discId: string, favoriteId: string | null) {
    entries.seed(userId, discId, { favoriteId, loaded: true });
  },
  set(userId: string, discId: string, favoriteId: string | null) {
    entries.set(userId, discId, { favoriteId, loaded: true });
  },
  isSubmitting: entries.isSubmitting,
  getSessionGeneration: entries.getSessionGeneration,
  beginSubmit: entries.beginSubmit,
  finishSubmit: entries.finishSubmit,
  clear: entries.clear,
  subscribe: entries.subscribe,
  subscribeAll: entries.subscribeAll,
};
