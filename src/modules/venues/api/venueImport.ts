import api from "@/services/api/api";
import type { CountriesResponse, Country } from "@/services/countries/countries";
import type {
  AdministrativeRegion,
  ResolveLocalityResponse,
  VenueImportBatchResponse,
  VenueResolutionResult,
  VenueType,
} from "../types/venueImport";

const VENUE_RESOLUTION_BATCH_SIZE = 100;

export async function getVenueImportCountries(signal?: AbortSignal): Promise<Country[]> {
  const countries: Country[] = [];
  const limit = 500;
  let offset = 0;
  let totalItems = Number.POSITIVE_INFINITY;

  while (countries.length < totalItems) {
    const response = await api.get<CountriesResponse>("/countries", {
      params: { limit, offset },
      signal,
    });
    countries.push(...response.data.data);
    totalItems = response.data.totalItems;
    if (response.data.data.length === 0) break;
    offset += response.data.data.length;
  }
  return countries;
}

export async function getAdministrativeRegions(
  countryId: string,
  signal?: AbortSignal
): Promise<AdministrativeRegion[]> {
  const regions: AdministrativeRegion[] = [];
  const limit = 100;
  let offset = 0;
  let totalItems = Number.POSITIVE_INFINITY;

  while (regions.length < totalItems) {
    const response = await api.get<{
      data: AdministrativeRegion[];
      totalItems: number;
      limit: number;
    }>("/administrative-regions", { params: { countryId, limit, offset }, signal });
    regions.push(...response.data.data);
    totalItems = response.data.totalItems;
    if (response.data.data.length === 0) break;
    offset += response.data.data.length;
  }
  return regions;
}

export async function resolveVenueLocality(
  payload: { name: string; administrativeRegionId: string; province?: string },
  signal?: AbortSignal
): Promise<ResolveLocalityResponse> {
  const response = await api.post<ResolveLocalityResponse>("/localities/resolve", payload, {
    signal,
  });
  return response.data;
}

export async function importVenueBatch(
  payload: { localityId: string; venues: Array<{ name: string; type: VenueType }> },
  signal?: AbortSignal
): Promise<VenueImportBatchResponse> {
  const response = await api.post<VenueImportBatchResponse>("/venues/import-batch", payload, {
    signal,
  });
  return response.data;
}

export async function resolveVenueBatch(
  venues: Array<{ name: string; localityId: string }>,
  signal?: AbortSignal
): Promise<VenueResolutionResult[]> {
  if (venues.length > VENUE_RESOLUTION_BATCH_SIZE) {
    throw new RangeError("La resolución admite como máximo 100 salas por petición.");
  }
  const { data } = await api.post<{ results: VenueResolutionResult[] }>(
    "/venues/resolve-batch",
    { venues },
    { signal }
  );
  if (!Array.isArray(data.results) || data.results.length !== venues.length) {
    throw new Error("La respuesta de resolución de salas no coincide con la petición.");
  }
  return data.results;
}
