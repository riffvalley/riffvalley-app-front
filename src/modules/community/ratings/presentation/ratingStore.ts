import { defineStore } from "pinia";
import type { DiscRatingState, RatingVote } from "../domain/rating";

const emptyRating = (): DiscRatingState => ({
  ratingId: null, rate: null, cover: null,
  averageRate: null, averageCover: null, voteCount: null, summaryLoaded: false,
});

const keyFor = (userId: string, discId: string) => userId + ":" + discId;

export const useCommunityRatingStore = defineStore("community-ratings", {
  state: () => ({
    ratings: {} as Record<string, DiscRatingState>,
    votes: {} as Record<string, RatingVote[]>,
    submitting: {} as Record<string, boolean>,
  }),
  actions: {
    get(userId: string, discId: string): DiscRatingState {
      return this.ratings[keyFor(userId, discId)] ?? emptyRating();
    },
    getVotes(userId: string, discId: string): RatingVote[] {
      return this.votes[keyFor(userId, discId)] ?? [];
    },
    isSubmitting(userId: string, discId: string): boolean {
      return this.submitting[keyFor(userId, discId)] === true;
    },
    seed(userId: string, discId: string, value: DiscRatingState) {
      const key = keyFor(userId, discId);
      if (!this.ratings[key]) this.ratings[key] = { ...value };
    },
    set(userId: string, discId: string, value: DiscRatingState) {
      this.ratings[keyFor(userId, discId)] = { ...value };
    },
    setVotes(userId: string, discId: string, votes: RatingVote[]) {
      this.votes[keyFor(userId, discId)] = votes;
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
