import { loadDiscVotes, listUserRatings, saveDiscRating, useCommunityRatingStore } from "@/modules/community";
import type { DiscRatingState, UserRatingsQuery } from "@/modules/community";
import { legacyRatingApi } from "@/modules/community/ratings/infrastructure/legacyRatingApi";
import { userRatingsApi } from "@/modules/community/ratings/infrastructure/userRatingsApi";
import { listUserComments } from "@/modules/community";
import type { UserCommentsQuery, UserCommentsResult } from "@/modules/community";
import type { CommentDisc } from "@/modules/catalog";
import { userCommentsApi } from "@/modules/community/comments/infrastructure/userCommentsApi";
import { useAuthStore } from "./identity";

export interface ListedUserComment {
  id: string;
  comment: string;
  createdAt: string;
  disc: CommentDisc | null;
}

export interface ListedUserCommentsResult extends Omit<UserCommentsResult, "data"> {
  data: ListedUserComment[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toCommentDisc(value: unknown): CommentDisc | null {
  if (value === null) return null;
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string") {
    throw new Error("La ficha del disco en los comentarios no tiene el formato esperado.");
  }
  const artist = isRecord(value.artist) && typeof value.artist.name === "string"
    ? {
      name: value.artist.name,
      ...(typeof value.artist.id === "string" ? { id: value.artist.id } : {}),
      country: isRecord(value.artist.country) && typeof value.artist.country.name === "string"
        ? {
          name: value.artist.country.name,
          ...(typeof value.artist.country.id === "string" ? { id: value.artist.country.id } : {}),
          ...(typeof value.artist.country.isoCode === "string" ? { isoCode: value.artist.country.isoCode } : {}),
        }
        : null,
    }
    : null;
  const genre = isRecord(value.genre) && typeof value.genre.name === "string"
    ? {
      name: value.genre.name,
      ...(typeof value.genre.id === "string" ? { id: value.genre.id } : {}),
      ...(typeof value.genre.color === "string" ? { color: value.genre.color } : {}),
    }
    : null;
  return {
    id: value.id,
    name: value.name,
    image: typeof value.image === "string" || value.image === null ? value.image : undefined,
    releaseDate: typeof value.releaseDate === "string" || value.releaseDate === null ? value.releaseDate : undefined,
    artist,
    genre,
  };
}

export async function fetchUserComments(query: UserCommentsQuery): Promise<ListedUserCommentsResult> {
  const activeUser = useAuthStore().loggedUser;
  if (!activeUser.id) throw new Error("No hay una sesión activa para consultar los comentarios.");
  const result = await listUserComments(userCommentsApi, query);
  return {
    totalItems: result.totalItems,
    data: result.data.map((comment) => ({
      id: comment.id,
      comment: comment.comment,
      createdAt: comment.createdAt,
      disc: toCommentDisc(comment.disc),
    })),
  };
}

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
