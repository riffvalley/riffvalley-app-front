import { getDiscs } from "@services/discs/discs";
import { getRatesByUser } from "@services/rates/rates";
import { getCommentsByUser } from "@services/comments/comments";
import { getFavoritesByUser } from "@services/favorites/favorites";
import { getPendingsByUser } from "@services/pendings/pendings";
import type {
  DiscListFavorite,
  DiscListPending,
  DiscListRateRecord,
  DiscListRequest,
  DiscListResult,
} from "../types/discList";

function normalizeUserRate(rate: number | string | null | undefined) {
  return rate == null ? null : Number.parseFloat(String(rate));
}

function withRate(record: DiscListRateRecord) {
  return {
    ...record.disc,
    artist: {
      ...record.disc.artist,
      country: record.disc.artist?.country ?? null,
    },
    userRate: {
      rate: normalizeUserRate(record.rate),
      cover: normalizeUserRate(record.cover),
      id: record.id,
    },
    commentCount: record.disc.commentCount,
    voteCount: record.disc.voteCount,
  };
}

function withFavorite(favorite: DiscListFavorite) {
  return {
    ...favorite.disc,
    artist: {
      ...favorite.disc.artist,
      country: favorite.disc.artist?.country ?? null,
    },
    favoriteId: favorite.id,
    pendingId: favorite.disc.userPending ? favorite.disc.userPending.id : null,
    userRate: favorite.disc.userRate
      ? {
          id: favorite.disc.userRate.id,
          rate: normalizeUserRate(favorite.disc.userRate.rate),
          cover: normalizeUserRate(favorite.disc.userRate.cover),
        }
      : null,
    commentCount: favorite.disc.commentCount,
    voteCount: favorite.disc.voteCount,
  };
}

function withPending(pending: DiscListPending) {
  return {
    ...pending.disc,
    artist: {
      ...pending.disc.artist,
      country: pending.disc.artist?.country ?? null,
    },
    pendingId: pending.id,
    userRate: pending.disc.userRate
      ? {
          id: pending.disc.userRate.id,
          rate: normalizeUserRate(pending.disc.userRate.rate),
          cover: normalizeUserRate(pending.disc.userRate.cover),
        }
      : null,
    commentCount: pending.disc.commentCount,
    voteCount: pending.disc.voteCount,
  };
}

function pageMetadata(response: {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}) {
  return {
    totalItems: response.totalItems,
    totalPages: response.totalPages,
    currentPage: response.currentPage,
    limit: response.limit,
  };
}

export async function loadDiscList(request: DiscListRequest): Promise<DiscListResult> {
  const { mode, limit, offset, query, dateRange, genre, country, orderBy } = request;

  if (mode === "rates" || mode === "covers") {
    const response = await getRatesByUser(
      limit,
      offset,
      query,
      dateRange,
      genre,
      country,
      mode === "rates" ? "rate" : "cover",
      orderBy
    );
    return { mode, data: response.data.map(withRate), ...pageMetadata(response) };
  }

  if (mode === "comments") {
    const response = await getCommentsByUser(
      limit,
      offset,
      query,
      dateRange,
      genre,
      country,
      orderBy
    );
    return { mode, comments: response.data, ...pageMetadata(response) };
  }

  if (mode === "favorites") {
    const response = await getFavoritesByUser(
      limit,
      offset,
      query,
      dateRange,
      genre,
      country,
      undefined,
      orderBy
    );
    return { mode, data: response.data.map(withFavorite), ...pageMetadata(response) };
  }

  if (mode === "pendientes") {
    const response = await getPendingsByUser(limit, offset, query, dateRange, genre, country);
    return { mode, data: response.data.map(withPending), ...pageMetadata(response) };
  }

  let voted: boolean | undefined;
  let votedType: string | undefined;
  let actualOrderBy = orderBy;
  if (orderBy.startsWith("UNVOTED:")) {
    voted = false;
    votedType = orderBy.split(":")[1];
    actualOrderBy = "disc.releaseDate:DESC,artist.name:ASC";
  }
  const response = await getDiscs(
    limit,
    offset,
    query,
    dateRange,
    genre,
    country,
    actualOrderBy,
    voted,
    votedType
  );
  const discs = response.data.map((disc) => ({
    ...disc,
    userRate: disc.userRate
      ? {
          ...disc.userRate,
          rate: normalizeUserRate(disc.userRate.rate),
          cover: normalizeUserRate(disc.userRate.cover),
        }
      : null,
  }));
  return { mode, data: discs, ...pageMetadata(response) };
}
