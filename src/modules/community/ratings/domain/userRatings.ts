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

export interface UserRating {
  id: string;
  rate: string | number | null;
  cover: string | number | null;
  /** Opaque Catalog transport projection; app maps it at the composition boundary. */
  disc: unknown;
}

export interface UserRatingsResult {
  totalItems: number;
  data: UserRating[];
}
