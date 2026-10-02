/** Lifecycle states owned by Releases for a disc request. */
export type RequestStatus = 'pending' | 'approved' | 'rejected';

/** Local administrative tab filter; `all` is not a persisted request status. */
export type RequestStatusFilter = RequestStatus | 'all';

export interface RequestFilters {
  status?: RequestStatusFilter;
}

/** Small user projection rendered in the administrative request list. */
export interface RequestUserProjection {
  id?: string;
  username?: string | null;
  name?: string | null;
  email?: string | null;
}

/** Minimal display projection for a related catalog record; Catalog owns its model. */
export interface RequestCatalogReference {
  id: string;
  name: string;
}

/** Request record consumed by own and administrative listings. */
export interface DiscRequest {
  id: string;
  discName: string;
  artistName: string;
  releaseDate: string | null;
  ep: boolean;
  debut: boolean;
  status: RequestStatus;
  adminNotes: string | null;
  createdAt: string;
  genre: RequestCatalogReference | null;
  country: RequestCatalogReference | null;
  /** The list template renders this projection when the API includes it. */
  user?: RequestUserProjection | null;
}

/** Fields accepted by the current creation form and legacy service. */
export interface CreateRequestInput {
  discName: string;
  artistName: string;
  releaseDate?: string;
  ep?: boolean;
  debut?: boolean;
  description?: string;
  image?: string;
  link?: string;
  genreId?: string;
  countryId?: string;
}

/** Partial administrative edit; null clears a catalog relationship. */
export interface UpdateRequestInput {
  discName?: string;
  artistName?: string;
  releaseDate?: string;
  genreId?: string | null;
  countryId?: string | null;
  ep?: boolean;
  debut?: boolean;
  adminNotes?: string;
}

/** DELETE /requests/:id carries the required rejection note in its body. */
export interface RejectRequestInput {
  adminNotes: string;
}
