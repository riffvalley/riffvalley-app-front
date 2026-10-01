export interface ArtistManagementDisc {
  id: string;
  name: string;
  releaseDate: string;
  ep: boolean;
  debut: boolean;
  image: string | null;
  link: string | null;
  genre: { id: string; name: string; color: string } | null;
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

export interface ArtistManagementItem<TDisc extends ArtistManagementDisc = ArtistManagementDisc> {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  country: { id: string; name: string; isoCode: string } | null;
  discs: TDisc[];
  nationalReleases: ArtistManagementNationalRelease[];
  spotifyPlaylists: ArtistManagementSpotifyPlaylist[];
}

/** Fields consumed from GET /artists/search/by-name by the management modal. */
export interface ArtistManagementMatch<TDisc extends ArtistManagementDisc = ArtistManagementDisc> {
  id: string;
  name: string;
  image: string | null;
  discs: TDisc[];
}

export interface ArtistManagementResponse<TArtist extends ArtistManagementItem = ArtistManagementItem> {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  orphanCount: number;
  data: TArtist[];
}

export interface ArtistManagementParams {
  query?: string;
  limit?: number;
  offset?: number;
  genreId?: string;
  countryId?: string;
  needsReview?: boolean;
}
