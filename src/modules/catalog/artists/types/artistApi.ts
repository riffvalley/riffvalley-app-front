export interface ArtistImageFillPreview {
  eligible: number;
  batchSize: number;
  estimatedBatches: number;
  startCursor: string | null;
}

export type ArtistImageFillOutcome =
  | "updated"
  | "not_found"
  | "ambiguous"
  | "failed"
  | "concurrent_update";

export interface ArtistImageFillResultItem {
  artistId: string;
  outcome: ArtistImageFillOutcome;
  reason?:
    | "no_name_match"
    | "multiple_name_matches"
    | "no_image_available"
    | "provider_error"
    | "image_already_set"
    | "record_unavailable";
}

export interface ArtistImageFillBatchResult {
  processed: number;
  updated: number;
  notFound: number;
  ambiguous: number;
  failed: number;
  concurrentUpdates: number;
  results: ArtistImageFillResultItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ArtistDetailsDiscDto {
  id: string;
  name: string;
  image: string | null;
  releaseDate: string | null;
  genre: { id: string; name: string; color: string | null } | null;
  ep?: boolean;
  debut?: boolean;
  link?: string | null;
  rateCount: number;
  averageRate: number | null;
}

export interface ArtistDetailsDto {
  id: string;
  name: string;
  image: string | null;
  description: string | null;
  country: { id: string; name: string; isoCode?: string | null } | null;
  genres?: Array<{ id: string; name: string }>;
  discs: ArtistDetailsDiscDto[];
}

export interface ArtistResult {
  id: string;
  name: string;
  image?: string;
}

export interface ArtistWithCountry {
  id: string;
  name: string;
  nameNormalized: string;
  description: string | null;
  image: string | null;
  countryId: string;
  country: { id: string; name: string; isoCode: string };
}

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

export interface ArtistManagementRiffValleyPlaylist {
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
  riffValleyPlaylists: ArtistManagementRiffValleyPlaylist[];
}

export interface ArtistManagementResponse {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  orphanCount: number;
  data: ArtistManagementItem[];
}

export interface DeleteOrphansResponse {
  deleted: number;
  artists: string[];
}

export interface CreateArtistPayload {
  name: string;
  countryId?: string;
}

export interface UpdateArtistPayload {
  name?: string;
  countryId?: string;
  image?: string;
  description?: string;
}
