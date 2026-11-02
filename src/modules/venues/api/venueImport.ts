import api from "@/services/api/api";
import {
  ENTITY_RESOLUTION_BATCH_LIMIT,
  IndexedBatchProtocolError,
  orderIndexedResults,
} from "@/services/api/indexedBatch";
import type { CountriesResponse, Country } from "@/services/countries/countries";
import type {
  AdministrativeRegion,
  ResolveLocalityResponse,
  VenueImportBatchResponse,
  VenueResolutionBatchRequest,
  VenueResolutionResult,
  VenueType,
} from "../types/venueImport";

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
  venues: VenueResolutionBatchRequest["venues"],
  signal?: AbortSignal
): Promise<VenueResolutionResult[]> {
  if (venues.length > ENTITY_RESOLUTION_BATCH_LIMIT) {
    throw new RangeError("La resolución admite como máximo 100 salas por petición.");
  }
  if (venues.some(({ name }) => !name.trim())) {
    throw new RangeError("La resolución exacta de salas requiere un nombre no vacío.");
  }
  const { data } = await api.post<unknown>("/venues/resolve-batch", { venues }, { signal });

  if (!isRecord(data) || !Array.isArray(data.results)) {
    throw new IndexedBatchProtocolError("La respuesta de resolución de salas no contiene results.");
  }
  const results: VenueResolutionResult[] = [];
  for (const result of data.results) {
    if (!isVenueResolutionResult(result)) {
      throw new IndexedBatchProtocolError("La respuesta de resolución de salas está malformada.");
    }
    results.push(result);
  }
  return orderIndexedResults(
    venues,
    results,
    (input, result) => input.name === result.name && input.localityId === result.localityId
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isVenueCandidate(value: unknown): value is { id: string; name: string } {
  return isRecord(value) && typeof value.id === "string" && typeof value.name === "string";
}

function isVenueResolutionResult(value: unknown): value is VenueResolutionResult {
  if (
    !isRecord(value) ||
    !Number.isInteger(value.index) ||
    typeof value.name !== "string" ||
    typeof value.localityId !== "string" ||
    !Array.isArray(value.candidates) ||
    !value.candidates.every(isVenueCandidate)
  ) {
    return false;
  }

  switch (value.status) {
    case "existing":
      return (
        isVenueCandidate(value.venue) &&
        value.candidates.length === 1 &&
        value.candidates[0]?.id === value.venue.id &&
        value.candidates[0]?.name === value.venue.name
      );
    case "new":
      return value.venue === null && value.candidates.length === 0;
    case "ambiguous":
      return (
        value.venue === null && value.code === "VENUE_AMBIGUOUS" && value.candidates.length > 1
      );
    default:
      return false;
  }
}
