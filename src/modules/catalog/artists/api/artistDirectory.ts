import api from "@services/api/api";
import type { ArtistDirectoryPage, ArtistDirectoryParams } from "../types/artistDirectory";

export async function getArtistDirectory(
  params: ArtistDirectoryParams,
  signal?: AbortSignal
): Promise<ArtistDirectoryPage> {
  const { data } = await api.get<ArtistDirectoryPage>("/artists/directory", {
    params,
    signal,
  });
  return data;
}
