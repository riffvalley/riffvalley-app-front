import { getDiscListPage } from "../api/discList";
import type {
  DiscListApiCard,
  DiscListApiComment,
  DiscListCardDisc,
  DiscListComment,
  DiscListRequest,
  DiscListResult,
} from "../types/discList";

function toCardDisc(item: DiscListApiCard): DiscListCardDisc {
  return {
    id: item.id,
    name: item.name,
    image: item.image ?? "",
    releaseDate: item.releaseDate ?? "",
    link: item.link,
    ep: item.ep,
    debut: item.debut,
    artist: {
      name: item.artist.name,
      country: item.artist.country
        ? {
            ...item.artist.country,
            isoCode: item.artist.country.isoCode ?? undefined,
          }
        : null,
    },
    genre: item.genre,
    averageRate: item.averageRate,
    averageCover: item.averageCover,
    voteCount: item.voteCount,
    commentCount: item.commentCount,
    userRate: item.userRate,
    favoriteId: item.favoriteId,
    pendingId: item.pendingId,
  };
}

function toComment(item: DiscListApiComment): DiscListComment {
  return {
    id: item.entryId,
    entryId: item.entryId,
    itemType: item.itemType,
    comment: item.comment,
    createdAt: item.createdAt,
    disc: {
      id: item.disc.id,
      name: item.disc.name,
      image: item.disc.image ?? "",
      releaseDate: item.disc.releaseDate ?? "",
      artist: {
        name: item.disc.artist.name,
        country: item.disc.artist.country
          ? {
              ...item.disc.artist.country,
              isoCode: item.disc.artist.country.isoCode ?? undefined,
            }
          : null,
      },
      genre: item.disc.genre,
    },
  };
}

export async function loadDiscList(request: DiscListRequest): Promise<DiscListResult> {
  if (request.mode === "comments") {
    const response = await getDiscListPage(request);
    return {
      mode: "comments",
      comments: response.data.map(toComment),
      totalItems: response.totalItems,
      totalPages: response.totalPages,
      currentPage: response.currentPage,
      limit: response.limit,
    };
  }

  const response = await getDiscListPage(request);
  return {
    mode: request.mode,
    data: response.data.map(toCardDisc),
    totalItems: response.totalItems,
    totalPages: response.totalPages,
    currentPage: response.currentPage,
    limit: response.limit,
  };
}
