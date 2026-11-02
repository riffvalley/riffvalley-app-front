import api from "@/services/api/api";
import type {
  VenueCatalogLocalityOption,
  VenueCatalogPage,
  VenueCatalogRequest,
  VenueCatalogVenue,
  UpdateVenueCatalogPayload,
} from "../types/venueCatalog";

const CATALOG_PAGE_SIZE = 20;

export interface VenueNameLookup {
  id: string;
  name: string;
  locality: {
    id: string;
    name: string;
    province: string | null;
    administrativeRegion: { id: string; name: string; country: { id: string; name: string } };
  };
}

function requestParams(request: VenueCatalogRequest) {
  return {
    limit: request.limit,
    offset: request.offset,
    ...(request.query.trim() ? { query: request.query.trim() } : {}),
    ...(request.countryId ? { countryId: request.countryId } : {}),
    ...(request.administrativeRegionId
      ? { administrativeRegionId: request.administrativeRegionId }
      : {}),
    ...(request.localityId ? { localityId: request.localityId } : {}),
    ...(request.type ? { type: request.type } : {}),
    ...(request.status ? { status: request.status } : {}),
  };
}

export async function getVenueCatalog(
  request: VenueCatalogRequest,
  signal?: AbortSignal
): Promise<VenueCatalogPage> {
  const { data } = await api.get<VenueCatalogPage>("/venues", {
    params: requestParams(request),
    signal,
  });
  return data;
}

/** Searches only name-compatible catalogue pages; callers must verify exact normalized names. */
export async function searchVenueNames(query: string): Promise<VenueNameLookup[]> {
  const venues: VenueNameLookup[] = [];
  let offset = 0;
  let totalItems = Number.POSITIVE_INFINITY;

  while (offset < totalItems) {
    const page = await getVenueCatalog({
      query,
      countryId: "",
      administrativeRegionId: "",
      localityId: "",
      type: "",
      status: "",
      limit: 100,
      offset,
    });
    venues.push(...(page.data as VenueNameLookup[]));
    totalItems = page.totalItems ?? offset + page.data.length;
    if (page.data.length === 0) break;
    offset += page.data.length;
  }

  return venues;
}

export async function getVenueLocalityOptions(
  countryId: string,
  administrativeRegionId: string,
  signal?: AbortSignal
): Promise<VenueCatalogLocalityOption[]> {
  const localities = new Map<string, VenueCatalogLocalityOption>();
  let offset = 0;
  let totalItems = Number.POSITIVE_INFINITY;

  while (offset < totalItems) {
    const page = await getVenueCatalog(
      {
        query: "",
        countryId,
        administrativeRegionId,
        localityId: "",
        type: "",
        status: "",
        limit: 100,
        offset,
      },
      signal
    );
    for (const venue of page.data) {
      localities.set(venue.locality.id, {
        id: venue.locality.id,
        name: venue.locality.name,
      });
    }
    totalItems = page.totalItems ?? offset + page.data.length;
    if (page.data.length === 0) break;
    offset += page.data.length;
  }

  return [...localities.values()].sort((left, right) => left.name.localeCompare(right.name));
}

export async function updateVenueCatalog(
  id: string,
  payload: UpdateVenueCatalogPayload
): Promise<VenueCatalogVenue> {
  const { data } = await api.patch<VenueCatalogVenue>(`/venues/${id}`, payload);
  return data;
}

export async function deleteVenueCatalog(id: string): Promise<void> {
  await api.delete(`/venues/${id}`);
}

export const VENUE_CATALOG_PAGE_SIZE = CATALOG_PAGE_SIZE;
