import axios from "axios";
import { queryOptions } from "@tanstack/vue-query";
import { resolveArtistsBatch } from "../api/artistResolution";
import { inspectLocalitiesBatch, inspectToursBatch } from "../api/entityResolution";
import type {
  LocalityInspectionInput,
  TourResolutionBatchRequest,
} from "../api/entityResolutionContracts";
import { IndexedBatchProtocolError } from "@/services/api/indexedBatch";
import { resolveVenueBatch } from "@/modules/venues";
import type { VenueResolutionInput } from "@/modules/venues";

export const ENTITY_RESOLUTION_STALE_TIME = 15_000;

const entityResolutionRoot = ["events-festivals", "entity-resolution"] as const;

export const entityResolutionQueryKeys = {
  all: entityResolutionRoot,
  artists(names: readonly string[]) {
    return [...entityResolutionRoot, "artist", [...names]] as const;
  },
  localities(inputs: readonly LocalityInspectionInput[]) {
    return [
      ...entityResolutionRoot,
      "locality",
      inputs.map(({ name, countryId, administrativeRegionId, province }) => [
        name,
        countryId,
        administrativeRegionId ?? null,
        province ?? null,
      ]),
    ] as const;
  },
  venues(inputs: readonly VenueResolutionInput[]) {
    return [
      ...entityResolutionRoot,
      "venue",
      inputs.map(({ name, localityId }) => [name, localityId]),
    ] as const;
  },
  tours(names: readonly string[]) {
    return [...entityResolutionRoot, "tour", [...names]] as const;
  },
};

function shouldRetryResolution(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1 || error instanceof IndexedBatchProtocolError || axios.isCancel(error)) {
    return false;
  }
  if (!axios.isAxiosError(error)) return false;
  if (!error.response) return true;
  return error.response.status >= 500 && error.response.status < 600;
}

export function artistResolutionQueryOptions(names: readonly string[]) {
  const requestNames = [...names];
  return queryOptions({
    queryKey: entityResolutionQueryKeys.artists(requestNames),
    queryFn: ({ signal }) => resolveArtistsBatch(requestNames, signal),
    staleTime: ENTITY_RESOLUTION_STALE_TIME,
    retry: shouldRetryResolution,
  });
}

export function localityInspectionQueryOptions(inputs: readonly LocalityInspectionInput[]) {
  const localities = inputs.map((input) => ({ ...input }));
  return queryOptions({
    queryKey: entityResolutionQueryKeys.localities(localities),
    queryFn: ({ signal }) => inspectLocalitiesBatch({ localities }, signal),
    staleTime: ENTITY_RESOLUTION_STALE_TIME,
    retry: shouldRetryResolution,
  });
}

export function venueResolutionQueryOptions(inputs: readonly VenueResolutionInput[]) {
  const venues = inputs.map((input) => ({ ...input }));
  return queryOptions({
    queryKey: entityResolutionQueryKeys.venues(venues),
    queryFn: ({ signal }) => resolveVenueBatch(venues, signal),
    staleTime: ENTITY_RESOLUTION_STALE_TIME,
    retry: shouldRetryResolution,
  });
}

export function tourResolutionQueryOptions(request: TourResolutionBatchRequest) {
  const names = [...request.names];
  return queryOptions({
    queryKey: entityResolutionQueryKeys.tours(names),
    queryFn: ({ signal }) => inspectToursBatch({ names }, signal),
    staleTime: ENTITY_RESOLUTION_STALE_TIME,
    retry: shouldRetryResolution,
  });
}
