import { getDiscRates, postRateService, updateRateService } from "@services/rates/rates";
import type { RatingPort } from "../application/ratingPort";
import type { SaveDiscRatingInput } from "../domain/rating";

function toNumber(value: number | string | null | undefined): number {
  return Number(value ?? 0);
}

export const legacyRatingApi: RatingPort = {
  async listByDisc(discId) {
    const votes = await getDiscRates(discId);
    return votes.map((vote) => ({
      id: vote.id,
      user: {
        id: vote.user.id,
        username: vote.user.username,
        image: vote.user.image ?? undefined,
      },
      rate: toNumber(vote.rate),
      cover: toNumber(vote.cover),
    }));
  },
  async create(input: SaveDiscRatingInput) {
    const response: unknown = await postRateService({
      discId: input.discId,
      rate: input.rate,
      cover: input.cover,
    });
    if (typeof response !== "object" || response === null || !("id" in response) || typeof response.id !== "string") {
      throw new Error("La respuesta al guardar el voto no contiene su identificador.");
    }
    return response.id;
  },
  async update(input) {
    if (!input.ratingId) throw new Error("No hay una valoración propia que actualizar.");
    await updateRateService(input.ratingId, {
      discId: input.discId,
      rate: input.rate,
      cover: input.cover,
    });
  },
};
