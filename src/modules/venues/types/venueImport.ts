export const VENUE_TYPES = [
  "concert_hall",
  "arena",
  "stadium",
  "theater",
  "outdoor",
  "festival_ground",
  "bar_pub",
  "other",
] as const;

export type VenueType = (typeof VENUE_TYPES)[number];
export type VenueImportStatus = "created" | "existing" | "duplicate_in_batch" | "failed";

export interface VenueImportResult {
  id: string;
  name: string;
  type: VenueType;
  status: VenueImportStatus | "pending" | null;
  venueId: string | null;
  localityId: string | null;
  error: string | null;
}

export interface VenueImportRow {
  id: string;
  name: string;
  type: VenueType;
  locality: string;
  result: VenueImportResult | null;
}

export interface VenueResolutionResult {
  name: string;
  localityId: string;
  venue: { id: string; name: string } | null;
}

export interface VenueImportBatchResponse {
  summary: {
    total: number;
    created: number;
    existing: number;
    duplicates: number;
    failed: number;
  };
  results: Array<{
    index: number;
    name: string;
    status: VenueImportStatus;
    venueId?: string;
    error?: string;
  }>;
}

export interface ResolveLocalityResponse {
  locality: { id: string; name: string } | null;
  geocoding: { status: "cached" | "geocoded" | "not_found" | "ambiguous" | "unavailable" };
}

export interface AdministrativeRegion {
  id: string;
  name: string;
  countryId: string;
}
