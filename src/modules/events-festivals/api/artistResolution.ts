import api from "@services/api/api";

export interface ResolvedArtist {
  id: string;
  name: string;
}

export interface ArtistResolutionResult {
  name: string;
  artist: ResolvedArtist | null;
}

interface ResolveArtistsBatchResponse {
  results: ArtistResolutionResult[];
}

export async function resolveArtistsBatch(
  names: string[],
  signal?: AbortSignal
): Promise<ArtistResolutionResult[]> {
  if (names.length > 100) {
    throw new RangeError("La resolución admite como máximo 100 artistas por petición.");
  }

  const { data } = await api.post<ResolveArtistsBatchResponse>(
    "/artists/resolve-batch",
    { names },
    { signal }
  );

  if (!Array.isArray(data.results) || data.results.length !== names.length) {
    throw new Error("La respuesta de resolución de artistas no coincide con la petición.");
  }

  return data.results;
}
