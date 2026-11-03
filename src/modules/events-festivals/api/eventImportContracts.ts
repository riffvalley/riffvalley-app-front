import type { EventType } from "../application/eventType";

export interface ImportArtistDto {
  name: string;
  artistId?: string;
}

/** HTTP row contract; editor keys, revisions, and resolution state stay local. */
export interface ImportEventRowDto {
  rowId: string;
  type: EventType;
  name?: string;
  lineup?: ImportArtistDto[];
  startDate: string;
  endDate?: string;
  venue?: string;
  city: string;
  localityId?: string;
  province?: string;
  administrativeRegionId?: string;
  venueId?: string;
  tourId?: string;
  price?: string;
  otherInfo?: string;
}

export interface ImportBatchRequest {
  batchId: string;
  countryId: string;
  rows: ImportEventRowDto[];
}
