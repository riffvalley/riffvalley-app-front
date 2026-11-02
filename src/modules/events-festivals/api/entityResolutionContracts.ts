export {
  ENTITY_RESOLUTION_BATCH_LIMIT,
  IndexedBatchProtocolError,
  orderIndexedResults,
} from "@/services/api/indexedBatch";

export interface EntityCandidate {
  id: string;
  name: string;
}

export interface ResolvedArtist {
  id: string;
  name: string;
}

interface ArtistResultBase {
  index: number;
  name: string;
  /** Legacy field retained by the backend for existing consumers. */
  artist: ResolvedArtist | null;
}

export type ArtistResolutionResult =
  | (ArtistResultBase & { status: "existing"; artist: ResolvedArtist; candidates: [] })
  | (ArtistResultBase & { status: "new"; artist: null; candidates: [] })
  | (ArtistResultBase & {
      status: "ambiguous";
      code: "ARTIST_AMBIGUOUS";
      artist: null;
      candidates: [EntityCandidate, ...EntityCandidate[]];
    })
  | (ArtistResultBase & {
      status: "invalid";
      code: "ARTIST_NAME_INVALID";
      artist: null;
      candidates: [];
    });

export interface ArtistResolutionBatchResponse {
  results: ArtistResolutionResult[];
}

export interface LocalityInspectionInput {
  name: string;
  countryId: string;
  administrativeRegionId?: string;
  province?: string;
}

export interface LocalityResolutionCandidate {
  id: string;
  name: string;
  province: string | null;
  country: { id: string; name: string };
  administrativeRegion: { id: string; name: string };
}

interface LocalityResultBase {
  index: number;
  input: LocalityInspectionInput;
}

export type LocalityInspectionResult =
  | (LocalityResultBase & {
      status: "existing";
      locality: LocalityResolutionCandidate;
      candidates: [];
    })
  | (LocalityResultBase & {
      status: "new";
      candidates: [];
      requiresAdministrativeRegionId: boolean;
    })
  | (LocalityResultBase & {
      status: "ambiguous";
      code: "LOCALITY_AMBIGUOUS";
      candidates: [LocalityResolutionCandidate, ...LocalityResolutionCandidate[]];
    })
  | (LocalityResultBase & {
      status: "invalid";
      code:
        | "LOCALITY_COUNTRY_NOT_FOUND"
        | "LOCALITY_REGION_NOT_FOUND"
        | "LOCALITY_REGION_COUNTRY_MISMATCH";
      candidates: [];
    });

export interface LocalityInspectionBatchRequest {
  localities: LocalityInspectionInput[];
}

export interface LocalityInspectionBatchResponse {
  results: LocalityInspectionResult[];
}

interface TourResolutionResultBase {
  index: number;
  name: string;
}

export type TourResolutionResult =
  | (TourResolutionResultBase & {
      status: "existing";
      code: "TOUR_CONFIRMATION_REQUIRED";
      entity: EntityCandidate;
      candidates: [];
    })
  | (TourResolutionResultBase & { status: "new"; candidates: [] })
  | (TourResolutionResultBase & {
      status: "ambiguous";
      code: "TOUR_AMBIGUOUS";
      candidates: [EntityCandidate, ...EntityCandidate[]];
    })
  | (TourResolutionResultBase & {
      status: "invalid";
      code: "TOUR_NAME_INVALID";
      candidates: [];
    });

export interface TourResolutionBatchRequest {
  names: string[];
}

export interface TourResolutionBatchResponse {
  results: TourResolutionResult[];
}

// Venue DTOs are owned and exported by the venues capability.

export type {
  VenueResolutionBatchRequest,
  VenueResolutionBatchResponse,
  VenueResolutionInput,
  VenueResolutionResult,
} from "@/modules/venues";
