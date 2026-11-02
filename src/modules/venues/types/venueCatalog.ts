import type { VenueType } from "./venueImport";

export const VENUE_STATUSES = ["active", "closed", "temporary"] as const;
export type VenueStatus = (typeof VENUE_STATUSES)[number];

export interface VenueCatalogVenue {
  id: string;
  name: string;
  type: VenueType;
  status: VenueStatus;
  locality: {
    id: string;
    name: string;
    province?: string | null;
    administrativeRegion: {
      id: string;
      name: string;
      country: { id: string; name: string };
    };
  };
}

export interface VenueCatalogPage {
  data: VenueCatalogVenue[];
  totalItems?: number;
  totalPages?: number;
  currentPage?: number;
  limit: number;
}

export interface VenueCatalogFilters {
  query: string;
  countryId: string;
  administrativeRegionId: string;
  localityId: string;
  type: VenueType | "";
  status: VenueStatus | "";
}

export interface VenueCatalogRequest extends VenueCatalogFilters {
  limit: number;
  offset: number;
}

export interface VenueCatalogLocalityOption {
  id: string;
  name: string;
}

export interface UpdateVenueCatalogPayload {
  name: string;
  type: VenueType;
  status: VenueStatus;
}
