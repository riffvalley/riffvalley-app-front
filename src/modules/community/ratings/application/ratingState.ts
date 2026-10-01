import type { DiscRatingState, RatingVote } from "../domain/rating";
import { createUserDiscState } from "../../shared/application/userDiscState";

interface RatingEntry {
  rating: DiscRatingState;
  votes: RatingVote[];
}

const emptyRating = (): DiscRatingState => ({
  ratingId: null,
  rate: null,
  cover: null,
  averageRate: null,
  averageCover: null,
  voteCount: null,
  summaryLoaded: false,
});

const cloneRating = (value: DiscRatingState): DiscRatingState => ({ ...value });
const cloneVotes = (votes: RatingVote[]): RatingVote[] => votes.map((vote) => ({
  ...vote,
  user: { ...vote.user },
}));

const entries = createUserDiscState<RatingEntry>(
  () => ({ rating: emptyRating(), votes: [] }),
  (entry) => ({ rating: cloneRating(entry.rating), votes: cloneVotes(entry.votes) }),
);

export const communityRatingState = {
  get(userId: string, discId: string): DiscRatingState {
    return cloneRating(entries.get(userId, discId).rating);
  },
  getVotes(userId: string, discId: string): RatingVote[] {
    return cloneVotes(entries.get(userId, discId).votes);
  },
  seed(userId: string, discId: string, rating: DiscRatingState) {
    if (entries.has(userId, discId)) return;
    entries.seed(userId, discId, { rating: cloneRating(rating), votes: [] });
  },
  set(userId: string, discId: string, rating: DiscRatingState) {
    const current = entries.get(userId, discId);
    entries.set(userId, discId, { ...current, rating: cloneRating(rating) });
  },
  setVotes(userId: string, discId: string, votes: RatingVote[]) {
    const current = entries.get(userId, discId);
    entries.set(userId, discId, { ...current, votes: cloneVotes(votes) });
  },
  isSubmitting: entries.isSubmitting,
  getSessionGeneration: entries.getSessionGeneration,
  beginSubmit: entries.beginSubmit,
  finishSubmit: entries.finishSubmit,
  clear: entries.clear,
  subscribe: entries.subscribe,
  subscribeAll: entries.subscribeAll,
};
