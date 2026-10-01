import { defineStore } from "pinia";
import type { FavoriteState } from "../domain/favorite";

const emptyFavorite = (): FavoriteState => ({ favoriteId: null, loaded: false });
const keyFor = (userId: string, discId: string) => userId + ":" + discId;

export const useCommunityFavoriteStore = defineStore("community-favorites", {
  state: () => ({
    favorites: {} as Record<string, FavoriteState>,
    submitting: {} as Record<string, boolean>,
  }),
  actions: {
    get(userId: string, discId: string): FavoriteState {
      return this.favorites[keyFor(userId, discId)] ?? emptyFavorite();
    },
    seed(userId: string, discId: string, favoriteId: string | null) {
      const key = keyFor(userId, discId);
      if (!this.favorites[key]) this.favorites[key] = { favoriteId, loaded: true };
    },
    set(userId: string, discId: string, favoriteId: string | null) {
      this.favorites[keyFor(userId, discId)] = { favoriteId, loaded: true };
    },
    isSubmitting(userId: string, discId: string): boolean {
      return this.submitting[keyFor(userId, discId)] === true;
    },
    beginSubmit(userId: string, discId: string): boolean {
      const key = keyFor(userId, discId);
      if (this.submitting[key]) return false;
      this.submitting[key] = true;
      return true;
    },
    finishSubmit(userId: string, discId: string) {
      delete this.submitting[keyFor(userId, discId)];
    },
    clear() {
      this.$reset();
    },
  },
});
