export interface UserRatingsQuery {
  limit: number;
  offset: number;
  query?: string;
  dateRange?: [string, string] | null;
  genre?: string;
  country?: string;
  type: "rate" | "cover";
  orderBy?: string;
}

export interface UserRatingDisc {
  id: string;
  name: string;
  image?: string | null;
  releaseDate?: string;
  ep?: boolean;
  artist?: { id?: string; name?: string; country?: { id?: string; name?: string; isoCode?: string } | null } | null;
  genre?: { id?: string; name?: string; color?: string } | null;
  [key: string]: unknown;
}

export interface UserRating {
  id: string;
  rate: string | number | null;
  cover: string | number | null;
  disc: UserRatingDisc;
}

export interface UserRatingsResult {
  totalItems: number;
  data: UserRating[];
}
