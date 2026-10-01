import { listUserPendings, loadDiscVotes, listUserFavorites, listUserRatings, saveDiscRating, toggleUserFavorite, toggleUserPending } from "@/modules/community";
import type { DiscRatingState, UserFavoritesQuery, UserPendingsQuery, UserRatingsQuery, UserRatingsResult } from "@/modules/community";
import { communityFavoriteState } from "@/modules/community/favorites/application/favoriteState";
import { communityPendingState } from "@/modules/community/pendings/application/pendingState";
import { communityRatingState } from "@/modules/community/ratings/application/ratingState";
import { ratingApi } from "@/modules/community/ratings/infrastructure/ratingApi";
import { userRatingsApi } from "@/modules/community/ratings/infrastructure/userRatingsApi";
import { listUserComments } from "@/modules/community";
import type { UserCommentsQuery, UserCommentsResult } from "@/modules/community";
import type { CommentDisc, DiscListItem } from "@/modules/catalog";
import { userCommentsApi } from "@/modules/community/comments/infrastructure/userCommentsApi";
import { favoriteApi } from "@/modules/community/favorites/infrastructure/favoriteApi";
import { pendingApi } from "@/modules/community/pendings/infrastructure/pendingApi";
import { useAuthStore } from "./identity";
import { fetchDiscList } from "./catalog";
import type { DiscListParams } from "@/modules/catalog/discs/listing/application/discListPort";

export interface ListedUserComment {
  id: string;
  comment: string;
  createdAt: string;
  disc: CommentDisc | null;
}

export interface ListedUserCommentsResult extends Omit<UserCommentsResult, "data"> {
  data: ListedUserComment[];
}

export interface ListedUserFavorite {
  id: string;
  disc: ListedCommunityDisc;
}

export interface ListedUserFavoritesResult {
  totalItems: number;
  data: ListedUserFavorite[];
}

export interface ListedUserPendingsResult {
  totalItems: number;
  data: Array<{ id: string; disc: ListedCommunityDisc }>;
}

export interface ListedUserRating extends Omit<UserRatingsResult["data"][number], "disc"> {
  disc: ListedCommunityDisc;
}

export interface ListedUserRatingsResult extends Omit<UserRatingsResult, "data"> {
  data: ListedUserRating[];
}

interface ListedCommunityDisc extends DiscListItem {
  artist?: (Record<string, unknown> & { country?: unknown }) | null;
  userRate?: { id?: string; rate: number | string | null; cover: number | string | null } | null;
  commentCount?: number;
  voteCount?: number;
  pendingId?: string | null;
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

function toCommunityListDisc(value: unknown): ListedCommunityDisc {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string") {
    throw new Error("La ficha del disco en la relación comunitaria no tiene el formato esperado.");
  }
  const artist = isRecord(value.artist)
    ? { ...value.artist, country: isRecord(value.artist.country) ? value.artist.country : null }
    : null;
  const userRate = isRecord(value.userRate)
    ? {
      ...value.userRate,
      id: typeof value.userRate.id === "string" ? value.userRate.id : undefined,
      rate: value.userRate.rate == null ? null : Number(value.userRate.rate),
      cover: value.userRate.cover == null ? null : Number(value.userRate.cover),
    }
    : null;
  const pendingId = isRecord(value.userPending) && typeof value.userPending.id === "string"
    ? value.userPending.id : typeof value.pendingId === "string" ? value.pendingId : null;
  return { ...value, id: value.id, name: value.name, artist, userRate, pendingId };
}

/** App composition restores the Community fields needed by the legacy card from Catalog's mixed endpoint. */
export async function fetchCommunityDiscList(params: DiscListParams) {
  const result = await fetchDiscList(params);
  return { ...result, data: result.data.map((disc) => toCommunityListDisc(disc)) };
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

export async function fetchUserFavorites(query: UserFavoritesQuery): Promise<ListedUserFavoritesResult> {
  const userId = useAuthStore().loggedUser.id;
  if (!userId) throw new Error("No hay una sesión activa para consultar los favoritos.");
  const result = await listUserFavorites(favoriteApi, query);
  const data = result.data.map((favorite) => {
    const disc = toCommunityListDisc(favorite.disc);
    return { id: favorite.id, disc };
  });
  return {
    totalItems: result.totalItems,
    data,
  };
}

export async function fetchUserPendings(query: UserPendingsQuery): Promise<ListedUserPendingsResult> {
  const userId = useAuthStore().loggedUser.id;
  if (!userId) throw new Error("No hay una sesión activa para consultar los pendientes.");
  const result = await listUserPendings(pendingApi, query);
  const data = result.data.map((pending) => {
    const disc = toCommunityListDisc(pending.disc);
    return { id: pending.id, disc: { ...disc, pendingId: pending.id } };
  });
  return { totalItems: result.totalItems, data };
}

export function getCommunityFavorite(userId: string, discId: string) {
  return communityFavoriteState.get(userId, discId);
}

export function seedCommunityFavorite(userId: string, discId: string, favoriteId: string | null) {
  communityFavoriteState.seed(userId, discId, favoriteId);
}

export function isCommunityFavoriteSubmitting(userId: string, discId: string): boolean {
  return communityFavoriteState.isSubmitting(userId, discId);
}

export function toggleCommunityFavorite(userId: string, discId: string) {
  if (!userId) throw new Error("No hay una sesión activa para cambiar el favorito.");
  return toggleUserFavorite(communityFavoriteState, favoriteApi, userId, discId);
}

export function getCommunityPending(userId: string, discId: string) {
  return communityPendingState.get(userId, discId);
}

export function seedCommunityPending(userId: string, discId: string, pendingId: string | null) {
  communityPendingState.seed(userId, discId, pendingId);
}

export function isCommunityPendingSubmitting(userId: string, discId: string): boolean {
  return communityPendingState.isSubmitting(userId, discId);
}

export function toggleCommunityPending(userId: string, discId: string) {
  if (!userId) throw new Error("No hay una sesión activa para cambiar el pendiente.");
  return toggleUserPending(communityPendingState, pendingApi, userId, discId);
}

export interface SaveCommunityRatingInput {
  userId: string;
  discId: string;
  rate: number | null;
  cover: number | null;
}

export function getCommunityRating(userId: string, discId: string): DiscRatingState {
  return communityRatingState.get(userId, discId);
}

export function isCommunityRatingSubmitting(userId: string, discId: string): boolean {
  return communityRatingState.isSubmitting(userId, discId);
}

export function getCommunityRatingVotes(userId: string, discId: string) {
  return communityRatingState.getVotes(userId, discId);
}

export function seedCommunityRating(userId: string, discId: string, value: DiscRatingState) {
  communityRatingState.seed(userId, discId, value);
}

export async function loadCommunityRating(userId: string, discId: string) {
  const store = communityRatingState;
  const sessionGeneration = store.getSessionGeneration();
  const votes = await loadCommunityVotes(userId, discId);
  if (store.getSessionGeneration() !== sessionGeneration) return store.get(userId, discId);
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
  const current = communityRatingState.get(input.userId, input.discId);
  return saveCommunityRating({
    userId: input.userId,
    discId: input.discId,
    rate: current.rate,
    cover: input.cover,
  });
}

export async function loadCommunityVotes(userId: string, discId: string) {
  const store = communityRatingState;
  const sessionGeneration = store.getSessionGeneration();
  const votes = await loadDiscVotes(ratingApi, discId);
  if (store.getSessionGeneration() !== sessionGeneration) return votes;
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
  const store = communityRatingState;
  const sessionGeneration = store.getSessionGeneration();
  if (!store.beginSubmit(input.userId, input.discId)) return false;
  const previous = store.get(input.userId, input.discId);
  try {
    const ratingId = await saveDiscRating(ratingApi, {
      discId: input.discId,
      ratingId: previous.ratingId,
      rate: input.rate,
      cover: input.cover,
    });
    if (store.getSessionGeneration() !== sessionGeneration) return false;
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
    if (store.getSessionGeneration() === sessionGeneration) store.finishSubmit(input.userId, input.discId);
  }
}

export async function fetchUserRatings(params: UserRatingsQuery): Promise<ListedUserRatingsResult> {
  const result = await listUserRatings(userRatingsApi, params);
  return { ...result, data: result.data.map((rating) => ({ ...rating, disc: toCommunityListDisc(rating.disc) })) };
}
