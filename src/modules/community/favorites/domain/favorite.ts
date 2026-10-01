export interface FavoriteState {
  favoriteId: string | null;
  loaded: boolean;
}

export interface UserFavoritesQuery {
  limit: number;
  offset: number;
  query?: string;
  dateRange?: [string, string] | null;
  genre?: string;
  country?: string;
  type?: string;
  orderBy?: string;
}

export interface UserFavorite {
  id: string;
  disc: unknown;
}

export interface UserFavoritesResult {
  totalItems: number;
  data: UserFavorite[];
}
