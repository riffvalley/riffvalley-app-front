import { loadDiscVotes, listUserRatings, saveDiscRating, useCommunityRatingStore } from "@/modules/community";
import type { DiscRatingState, UserRatingsQuery } from "@/modules/community";
import { legacyRatingApi } from "@/modules/community/ratings/infrastructure/legacyRatingApi";
import { userRatingsApi } from "@/modules/community/ratings/infrastructure/userRatingsApi";

export interface SaveCommunityRatingInput {
  userId: string;
  discId: string;
  rate: number | null;
  cover: number | null;
}

export function getCommunityRating(userId: string, discId: string): DiscRatingState {
  return useCommunityRatingStore().get(userId, discId);
}

export function isCommunityRatingSubmitting(userId: string, discId: string): boolean {
  return useCommunityRatingStore().isSubmitting(userId, discId);
}

export function seedCommunityRating(userId: string, discId: string, value: DiscRatingState) {
  useCommunityRatingStore().seed(userId, discId, value);
}

export async function loadCommunityRating(userId: string, discId: string) {
  const votes = await loadCommunityVotes(userId, discId);
  const store = useCommunityRatingStore();
  const ownVote = votes.find((vote) => vote.user.id === userId);
  const current = store.get(userId, discId);
  store.set(userId, discId, {
    ...current,
    ratingId: ownVote?.id ?? null,
    rate: ownVote?.rate ?? null,
    cover: ownVote?.cover ?? null,
  });
  return store.get(userId, discId);
}

export async function saveCommunityCoverVote(input: { userId: string; discId: string; cover: number }): Promise<boolean> {
  if (!Number.isFinite(input.cover) || input.cover < 1 || input.cover > 10 || input.cover * 2 % 1 !== 0) {
    return false;
  }
  const current = useCommunityRatingStore().get(input.userId, input.discId);
  return saveCommunityRating({
    userId: input.userId,
    discId: input.discId,
    rate: current.rate,
    cover: input.cover,
  });
}

export async function loadCommunityVotes(userId: string, discId: string) {
  const votes = await loadDiscVotes(legacyRatingApi, discId);
  const store = useCommunityRatingStore();
  store.setVotes(userId, discId, votes);
  const rates = votes.map((vote) => vote.rate).filter((value) => value > 0);
  const covers = votes.map((vote) => vote.cover).filter((value) => value > 0);
  store.set(userId, discId, {
    ...store.get(userId, discId),
    averageRate: rates.length ? rates.reduce((sum, value) => sum + value, 0) / rates.length : null,
    averageCover: covers.length ? covers.reduce((sum, value) => sum + value, 0) / covers.length : null,
    voteCount: rates.length,
    summaryLoaded: true,
  });
  return votes;
}

export async function saveCommunityRating(input: SaveCommunityRatingInput): Promise<boolean> {
  const store = useCommunityRatingStore();
  if (!store.beginSubmit(input.userId, input.discId)) return false;
  const previous = store.get(input.userId, input.discId);
  try {
    const ratingId = await saveDiscRating(legacyRatingApi, {
      discId: input.discId,
      ratingId: previous.ratingId,
      rate: input.rate,
      cover: input.cover,
    });
    store.set(input.userId, input.discId, {
      ...previous,
      ratingId,
      rate: input.rate,
      cover: input.cover,
      summaryLoaded: false,
    });
    try {
      await loadCommunityVotes(input.userId, input.discId);
    } catch {
      // The saved vote stays visible; the previous summary remains available for a later refresh.
    }
    return true;
  } finally {
    store.finishSubmit(input.userId, input.discId);
  }
}

export function fetchUserRatings(params: UserRatingsQuery) {
  return listUserRatings(userRatingsApi, params);
}
