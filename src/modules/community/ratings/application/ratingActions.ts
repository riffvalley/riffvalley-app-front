import type { RatingPort } from "./ratingPort";
import type { RatingVote, SaveDiscRatingInput } from "../domain/rating";

export async function loadDiscVotes(port: RatingPort, discId: string): Promise<RatingVote[]> {
  return port.listByDisc(discId);
}

export async function saveDiscRating(port: RatingPort, input: SaveDiscRatingInput): Promise<string | null> {
  if (input.ratingId) {
    await port.update(input);
    return input.ratingId;
  }
  return port.create(input);
}
