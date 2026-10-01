import api from "@services/api/api";
import type { UserCommentsPort } from "../application/userCommentsPort";
import type { UserComment, UserCommentsQuery, UserCommentsResult } from "../domain/userComments";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseResult(value: unknown): UserCommentsResult {
  if (!isRecord(value) || typeof value.totalItems !== "number" || !Array.isArray(value.data)) {
    throw new Error("La respuesta de comentarios no tiene el formato esperado.");
  }
  const data: UserComment[] = value.data.map((entry: unknown) => {
    if (!isRecord(entry) || typeof entry.id !== "string" || typeof entry.comment !== "string" ||
      typeof entry.createdAt !== "string" || !("disc" in entry)) {
      throw new Error("La respuesta de comentarios no tiene el formato esperado.");
    }
    return { id: entry.id, comment: entry.comment, createdAt: entry.createdAt, disc: entry.disc };
  });
  return { totalItems: value.totalItems, data };
}

export const userCommentsApi: UserCommentsPort = {
  async listByUser(query: UserCommentsQuery): Promise<UserCommentsResult> {
    const response = await api.get<unknown>("/comments", {
      params: {
        limit: query.limit,
        offset: query.offset,
        query: query.query,
        dateRange: query.dateRange,
        genre: query.genre,
        country: query.country,
        type: "comment",
        orderBy: query.orderBy,
      },
    });
    return parseResult(response.data);
  },
};
