import api from "@services/api/api";
import { ENTITY_RESOLUTION_BATCH_LIMIT } from "@/services/api/indexedBatch";
import { validateArtistResolutionPayload } from "./entityResolution";
import type { ArtistResolutionResult } from "./entityResolutionContracts";

export type { ArtistResolutionResult, ResolvedArtist } from "./entityResolutionContracts";

export async function resolveArtistsBatch(
  names: string[],
  signal?: AbortSignal
): Promise<ArtistResolutionResult[]> {
  if (names.length > ENTITY_RESOLUTION_BATCH_LIMIT) {
    throw new RangeError("La resolución admite como máximo 100 artistas por petición.");
  }

  const { data } = await api.post<unknown>("/artists/resolve-batch", { names }, { signal });

  return validateArtistResolutionPayload(data, names);
}
