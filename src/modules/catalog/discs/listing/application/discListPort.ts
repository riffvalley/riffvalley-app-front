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
  userRate?: { rate: number | string | null; cover: number | string | null; [key: string]: unknown } | null;
  [key: string]: unknown;
}

export interface DiscListPort {
  getDiscs(params: DiscListParams): Promise<DiscListResult>;
}
