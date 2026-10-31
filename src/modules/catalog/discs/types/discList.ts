export type DiscListMode = "all" | "rates" | "covers" | "comments" | "favorites" | "pendientes";

export interface DiscListFilters {
  query: string;
  dateRange: [string, string] | null;
  genreIds: string[];
  countryId: string;
  artistId?: string;
}

export interface DiscListSuggestionCountry {
  id: string;
  name: string;
  isoCode: string | null;
}

export interface DiscListArtistSuggestion {
  id: string;
  name: string;
  image: string | null;
  country: DiscListSuggestionCountry | null;
}

export interface DiscListDiscSuggestion {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  image: string | null;
}

export interface DiscListSuggestions {
  artists: DiscListArtistSuggestion[];
  discs: DiscListDiscSuggestion[];
}

export interface DiscListSelectedArtist {
  id: string;
  name: string;
}

export interface DiscListRequest extends DiscListFilters {
  mode: DiscListMode;
  orderBy: string;
  eligibility?: "noRates";
  offset: number;
  limit: number;
}

export interface DiscListApiCard {
  id: string;
  entryId: string;
  itemType: "disc" | "rate" | "cover" | "favorite" | "pending";
  name: string;
  image: string | null;
  releaseDate: string | null;
  link: string | null;
  ep: boolean;
  debut: boolean;
  artist: { name: string; country: { id: string; name: string; isoCode: string | null } | null };
  genre: { id: string; name: string; color: string | null } | null;
  averageRate: number | null;
  averageCover: number | null;
  voteCount: number;
  commentCount: number;
  userRate: { id: string; rate: number | null; cover: number | null } | null;
  favoriteId: string | null;
  pendingId: string | null;
}

export interface DiscListApiComment {
  itemType: "comment";
  entryId: string;
  comment: string;
  createdAt: string;
  disc: {
    id: string;
    name: string;
    image: string | null;
    releaseDate: string | null;
    artist: { name: string; country: { id: string; name: string; isoCode: string | null } | null };
    genre: { id: string; name: string; color: string | null } | null;
  };
}

export interface DiscListPageMetadata {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export interface DiscListApiPage<T> extends DiscListPageMetadata {
  data: T[];
}

export interface DiscListOptionCountry {
  id: string;
  name: string;
  isoCode: string | null;
}

export interface DiscListOptionGenre {
  id: string;
  name: string;
  color: string | null;
}

export interface DiscListOptions {
  countries: DiscListOptionCountry[];
  genres: DiscListOptionGenre[];
}

export interface DiscListCardDisc {
  id: string;
  name: string;
  image: string;
  releaseDate: string;
  link: string | null;
  ep: boolean;
  debut: boolean;
  artist: {
    name: string;
    country: { id: string; name: string; isoCode?: string } | null;
  };
  genre: { id: string; name: string; color: string | null } | null;
  averageRate: number | null;
  averageCover: number | null;
  voteCount: number;
  commentCount: number;
  userRate: { id: string; rate: number | null; cover: number | null } | null;
  favoriteId: string | null;
  pendingId: string | null;
}

export interface DiscListComment extends Omit<DiscListApiComment, "disc"> {
  id: string;
  disc: DiscListCardDisc;
}

export interface DiscListDiscsResult extends DiscListPageMetadata {
  mode: Exclude<DiscListMode, "comments">;
  data: DiscListCardDisc[];
}

export interface DiscListCommentsResult extends DiscListPageMetadata {
  mode: "comments";
  comments: DiscListComment[];
}

export type DiscListResult = DiscListDiscsResult | DiscListCommentsResult;
