import api from "@services/api/api";
import {
  ENTITY_RESOLUTION_BATCH_LIMIT,
  IndexedBatchProtocolError,
  orderIndexedResults,
} from "@/services/api/indexedBatch";
import type {
  ArtistResolutionBatchResponse,
  ArtistResolutionResult,
  EntityCandidate,
  LocalityInspectionBatchRequest,
  LocalityInspectionBatchResponse,
  LocalityInspectionInput,
  LocalityInspectionResult,
  LocalityResolutionCandidate,
  TourResolutionBatchRequest,
  TourResolutionBatchResponse,
  TourResolutionResult,
} from "./entityResolutionContracts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEntityCandidate(value: unknown): value is EntityCandidate {
  return isRecord(value) && typeof value.id === "string" && typeof value.name === "string";
}

function isCandidateList(value: unknown, minimumLength: number): value is EntityCandidate[] {
  return Array.isArray(value) && value.length >= minimumLength && value.every(isEntityCandidate);
}

function isEmptyList(value: unknown): value is [] {
  return Array.isArray(value) && value.length === 0;
}

function isResolvedArtist(value: unknown): value is { id: string; name: string } {
  return isEntityCandidate(value);
}

function isArtistResult(value: unknown): value is ArtistResolutionResult {
  if (!isRecord(value) || !Number.isInteger(value.index) || typeof value.name !== "string") {
    return false;
  }
  switch (value.status) {
    case "existing":
      return isResolvedArtist(value.artist) && isEmptyList(value.candidates);
    case "new":
      return value.artist === null && isEmptyList(value.candidates);
    case "ambiguous":
      return (
        value.artist === null &&
        value.code === "ARTIST_AMBIGUOUS" &&
        isCandidateList(value.candidates, 1)
      );
    case "invalid":
      return (
        value.artist === null &&
        value.code === "ARTIST_NAME_INVALID" &&
        isEmptyList(value.candidates)
      );
    default:
      return false;
  }
}

function isLocalityInput(value: unknown): value is LocalityInspectionInput {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.countryId === "string" &&
    (value.administrativeRegionId === undefined ||
      typeof value.administrativeRegionId === "string") &&
    (value.province === undefined || typeof value.province === "string")
  );
}

function isLocalityCandidate(value: unknown): value is LocalityResolutionCandidate {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    (typeof value.province === "string" || value.province === null) &&
    isRecord(value.country) &&
    typeof value.country.id === "string" &&
    typeof value.country.name === "string" &&
    isRecord(value.administrativeRegion) &&
    typeof value.administrativeRegion.id === "string" &&
    typeof value.administrativeRegion.name === "string"
  );
}

function isLocalityResult(value: unknown): value is LocalityInspectionResult {
  if (!isRecord(value) || !Number.isInteger(value.index) || !isLocalityInput(value.input)) {
    return false;
  }
  switch (value.status) {
    case "existing":
      return isLocalityCandidate(value.locality) && isEmptyList(value.candidates);
    case "new":
      return (
        typeof value.requiresAdministrativeRegionId === "boolean" && isEmptyList(value.candidates)
      );
    case "ambiguous":
      return (
        value.code === "LOCALITY_AMBIGUOUS" &&
        Array.isArray(value.candidates) &&
        value.candidates.length > 0 &&
        value.candidates.every(isLocalityCandidate)
      );
    case "invalid":
      return (
        (value.code === "LOCALITY_COUNTRY_NOT_FOUND" ||
          value.code === "LOCALITY_REGION_NOT_FOUND" ||
          value.code === "LOCALITY_REGION_COUNTRY_MISMATCH") &&
        isEmptyList(value.candidates)
      );
    default:
      return false;
  }
}

function isTourResult(value: unknown): value is TourResolutionResult {
  if (!isRecord(value) || !Number.isInteger(value.index) || typeof value.name !== "string") {
    return false;
  }
  switch (value.status) {
    case "existing":
      return (
        value.code === "TOUR_CONFIRMATION_REQUIRED" &&
        isEntityCandidate(value.entity) &&
        isEmptyList(value.candidates)
      );
    case "new":
      return isEmptyList(value.candidates);
    case "ambiguous":
      return value.code === "TOUR_AMBIGUOUS" && isCandidateList(value.candidates, 2);
    case "invalid":
      return value.code === "TOUR_NAME_INVALID" && isEmptyList(value.candidates);
    default:
      return false;
  }
}

function readResults(payload: unknown): unknown[] {
  if (!isRecord(payload) || !Array.isArray(payload.results)) {
    throw new IndexedBatchProtocolError("La respuesta del inspector no contiene la lista results.");
  }
  return payload.results;
}

function validateResults<Result>(
  values: readonly unknown[],
  isResult: (value: unknown) => value is Result
): Result[] {
  const results: Result[] = [];
  for (const value of values) {
    if (!isResult(value)) {
      throw new IndexedBatchProtocolError(
        "La respuesta del inspector tiene un resultado malformado."
      );
    }
    results.push(value);
  }
  return results;
}

function sameLocalityInput(expected: LocalityInspectionInput, actual: LocalityInspectionInput) {
  return (
    expected.name === actual.name &&
    expected.countryId === actual.countryId &&
    expected.administrativeRegionId === actual.administrativeRegionId &&
    expected.province === actual.province
  );
}

function assertBatchLimit(length: number, entity: string): void {
  if (length > ENTITY_RESOLUTION_BATCH_LIMIT) {
    throw new RangeError(
      `La inspección admite como máximo ${ENTITY_RESOLUTION_BATCH_LIMIT} entradas de ${entity} por petición.`
    );
  }
}

export function validateArtistResolutionPayload(
  payload: unknown,
  names: readonly string[]
): ArtistResolutionBatchResponse["results"] {
  const results = validateResults(readResults(payload), isArtistResult);
  return orderIndexedResults(names, results, (name, result) => name === result.name);
}

export async function inspectLocalitiesBatch(
  request: LocalityInspectionBatchRequest,
  signal?: AbortSignal
): Promise<LocalityInspectionBatchResponse> {
  assertBatchLimit(request.localities.length, "localidades");
  const { data } = await api.post<unknown>("/localities/inspect-batch", request, { signal });
  const results = validateResults(readResults(data), isLocalityResult);
  return {
    results: orderIndexedResults(request.localities, results, (input, result) =>
      sameLocalityInput(input, result.input)
    ),
  };
}

export async function inspectToursBatch(
  request: TourResolutionBatchRequest,
  signal?: AbortSignal
): Promise<TourResolutionBatchResponse> {
  assertBatchLimit(request.names.length, "giras");
  const { data } = await api.post<unknown>("/tours/resolve-batch", request, { signal });
  const results = validateResults(readResults(data), isTourResult);
  return {
    results: orderIndexedResults(request.names, results, (name, result) => name === result.name),
  };
}
