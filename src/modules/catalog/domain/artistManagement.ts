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

const CALENDAR_COUNTRY_ID = "4108d9b0-a44e-4877-a839-a5541eac852d";
const ALTERNATE_CALENDAR_COUNTRY_ID = "a121dfc4-7ee8-4435-ab26-1db8e4071dde";

export function alternateCalendarCountryId(currentId: string | null | undefined): string {
  return currentId === CALENDAR_COUNTRY_ID ? ALTERNATE_CALENDAR_COUNTRY_ID : CALENDAR_COUNTRY_ID;
}
