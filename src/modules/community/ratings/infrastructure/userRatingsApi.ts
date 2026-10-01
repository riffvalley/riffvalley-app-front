import api from "@/shared/infrastructure/http/client";
import type { UserRatingsPort } from "../application/userRatingsPort";
import type { UserRatingsQuery, UserRatingsResult } from "../domain/userRatings";

interface UserRatingDto {
  id: string;
  rate: number | string | null;
  cover: number | string | null;
  disc: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRatingValue(value: unknown): value is number | string | null {
  return value === null || typeof value === "number" || typeof value === "string";
}

function parsePage(value: unknown): UserRatingsResult {
  if (!isRecord(value) || typeof value.totalItems !== "number" || !Array.isArray(value.data)) {
    throw new Error("La lista de valoraciones no tiene el formato esperado.");
  }
  const data = value.data.map((entry: unknown): UserRatingDto => {
    if (!isRecord(entry) || typeof entry.id !== "string" || !isRatingValue(entry.rate) ||
      !isRatingValue(entry.cover) || !("disc" in entry)) {
      throw new Error("La lista de valoraciones no tiene el formato esperado.");
    }
    return { id: entry.id, rate: entry.rate, cover: entry.cover, disc: entry.disc };
  });
  return { totalItems: value.totalItems, data };
}

export const userRatingsApi: UserRatingsPort = {
  async list(query: UserRatingsQuery): Promise<UserRatingsResult> {
    const response = await api.get<unknown>("/rates", {
      params: {
        limit: query.limit,
        offset: query.offset,
        query: query.query,
        dateRange: query.dateRange,
        genre: query.genre,
        country: query.country,
        type: query.type,
        orderBy: query.orderBy,
      },
    });
    return parsePage(response.data);
  },
};
