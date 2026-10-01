export interface ArtistManagementDisc {
  id: string;
  name: string;
  releaseDate: string;
  ep: boolean;
  debut: boolean;
  image: string | null;
  link: string | null;
  genre: { id: string; name: string; color: string } | null;
  rateCount: number;
  averageRate: number;
}

export interface ArtistManagementNationalRelease {
  id: string;
  discName: string;
  discType: string;
  genre: string;
  releaseDay: string;
  approved: boolean;
  link: string | null;
  discId: string;
}

export interface ArtistManagementSpotifyPlaylist {
  id: string;
  name: string;
  link: string;
  type: "festival" | "genero" | "especial" | "otras";
  imageUrl: string | null;
}

export interface ArtistManagementItem {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  country: { id: string; name: string; isoCode: string } | null;
  discs: ArtistManagementDisc[];
  nationalReleases: ArtistManagementNationalRelease[];
  spotifyPlaylists: ArtistManagementSpotifyPlaylist[];
}

/** Fields consumed from GET /artists/search/by-name by the management modal. */
export interface ArtistManagementMatch {
  id: string;
  name: string;
  image: string | null;
  discs: ArtistManagementDisc[];
}

export interface ArtistManagementResponse {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  orphanCount: number;
  data: ArtistManagementItem[];
}

export interface ArtistManagementParams {
  query?: string;
  limit?: number;
  offset?: number;
  genreId?: string;
  countryId?: string;
  needsReview?: boolean;
}
