import type { RatingVote, SaveDiscRatingInput } from "../domain/rating";

export interface RatingPort {
  listByDisc(discId: string): Promise<RatingVote[]>;
  create(input: SaveDiscRatingInput): Promise<string>;
  update(input: SaveDiscRatingInput): Promise<void>;
}
