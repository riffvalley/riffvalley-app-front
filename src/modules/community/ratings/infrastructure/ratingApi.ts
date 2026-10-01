import api from "@/shared/infrastructure/http/client";
import type { RatingPort } from "../application/ratingPort";
import type { RatingVote, SaveDiscRatingInput } from "../domain/rating";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNumber(value: unknown): number {
  const result = Number(value ?? 0);
  if (!Number.isFinite(result)) throw new Error("La respuesta de valoraciones contiene una nota inválida.");
  return result;
}

function parseVote(value: unknown): RatingVote {
  if (!isRecord(value) || typeof value.id !== "string" || !isRecord(value.user) ||
    typeof value.user.id !== "string" || typeof value.user.username !== "string") {
    throw new Error("La respuesta de valoraciones no tiene el formato esperado.");
  }
  return {
    id: value.id,
    user: {
      id: value.user.id,
      username: value.user.username,
      ...(typeof value.user.image === "string" ? { image: value.user.image } : {}),
    },
    rate: toNumber(value.rate),
    cover: toNumber(value.cover),
  };
}

function parseVoteList(value: unknown): RatingVote[] {
  if (!Array.isArray(value)) throw new Error("La respuesta de valoraciones no es una lista.");
  return value.map(parseVote);
}

function parseCreatedId(value: unknown): string {
  if (!isRecord(value) || typeof value.id !== "string") {
    throw new Error("La respuesta al guardar el voto no contiene su identificador.");
  }
  return value.id;
}

export const ratingApi: RatingPort = {
  async listByDisc(discId) {
    const response = await api.get<unknown>(`/rates/disc/${discId}`);
    return parseVoteList(response.data);
  },
  async create(input: SaveDiscRatingInput) {
    const response = await api.post<unknown>("/rates", {
      discId: input.discId,
      rate: input.rate,
      cover: input.cover,
    });
    return parseCreatedId(response.data);
  },
  async update(input) {
    if (!input.ratingId) throw new Error("No hay una valoración propia que actualizar.");
    await api.patch(`/rates/${input.ratingId}`, {
      discId: input.discId,
      rate: input.rate,
      cover: input.cover,
    });
  },
};
