export interface RatingVote {
  id: string;
  user: { id: string; username: string; image?: string };
  rate: number;
  cover: number;
}

export interface DiscRatingState {
  ratingId: string | null;
  rate: number | null;
  cover: number | null;
  averageRate: number | null;
  averageCover: number | null;
  voteCount: number | null;
  summaryLoaded: boolean;
}

export interface SaveDiscRatingInput {
  discId: string;
  ratingId: string | null;
  rate: number | null;
  cover: number | null;
}
