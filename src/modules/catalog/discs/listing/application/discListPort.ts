export interface DiscListParams {
  limit: number;
  offset: number;
  query?: string;
  dateRange?: [string, string] | null;
  genre?: string;
  country?: string;
  orderBy?: string;
  voted?: boolean;
  votedType?: string;
}

export interface DiscListResult {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  data: DiscListItem[];
}

export interface DiscListItem {
  id: string;
  name: string;
  releaseDate?: string;
  image?: string | null;
  /** Opaque transport extensions are interpreted at app composition, never as Catalog domain fields. */
  [key: string]: unknown;
}

export interface DiscListPort {
  getDiscs(params: DiscListParams): Promise<DiscListResult>;
}
