export interface UserCommentsQuery {
  limit: number;
  offset: number;
  query?: string;
  dateRange?: [string, string] | null;
  genre?: string;
  country?: string;
  orderBy?: string;
}

export interface UserComment {
  id: string;
  comment: string;
  createdAt: string;
  disc: unknown;
}

export interface UserCommentsResult {
  totalItems: number;
  data: UserComment[];
}
