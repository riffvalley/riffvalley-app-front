import api from "@services/api/api";
import type {
  ArtistImageFillBatchResult,
  ArtistImageFillPreview,
} from "../types/artistApi";

export async function previewArtistImageFill(
  signal?: AbortSignal,
): Promise<ArtistImageFillPreview> {
  const { data } = await api.get<ArtistImageFillPreview>(
    "/artists/images/fill/preview",
    { signal },
  );
  return data;
}

export async function fillArtistImages(
  payload: { cursor: string | null; batchSize: number },
  signal?: AbortSignal,
): Promise<ArtistImageFillBatchResult> {
  const { data } = await api.post<ArtistImageFillBatchResult>(
    "/artists/images/fill",
    payload,
    { signal },
  );
  return data;
}
