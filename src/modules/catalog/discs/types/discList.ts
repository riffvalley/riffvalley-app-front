import type { Disc } from "@services/discs/discs";

export type DiscListMode = "all" | "rates" | "covers" | "comments" | "favorites" | "pendientes";

export interface DiscListFilters {
  query: string;
  dateRange: [string, string] | null;
  genre: string;
  country: string;
}

export interface DiscListRequest extends DiscListFilters {
  mode: DiscListMode;
  orderBy: string;
  offset: number;
  limit: number;
}

export interface DiscListRateRecord {
  id: string;
  rate: number | string | null;
  cover: number | string | null;
  disc: Disc;
}

export interface DiscListComment {
  id: string;
  comment: string;
  createdAt: string;
  disc?: Disc & {
    genre?: { name: string; color?: string | null } | null;
  };
}

export interface DiscListFavorite {
  id: string;
  disc: Disc & {
    userPending?: { id: string } | null;
  };
}

export interface DiscListPending {
  id: string;
  disc: Disc;
}

export interface DiscListDiscsResult {
  mode: Exclude<DiscListMode, "comments">;
  data: Disc[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export interface DiscListCommentsResult {
  mode: "comments";
  comments: DiscListComment[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export type DiscListResult = DiscListDiscsResult | DiscListCommentsResult;
