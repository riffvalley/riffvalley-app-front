import { createArtistImageSearchSession, searchArtistImages } from "@/integrations/spotify";
import { artistImagesApi } from "@/integrations/spotify/infrastructure/artistImagesApi";

export function findArtistImages(name: string, limit: 1 | 5) {
  return searchArtistImages(artistImagesApi, { name, limit });
}

export async function createBulkArtistImageSearchSession() {
  const search = await createArtistImageSearchSession(artistImagesApi);
  return async (name: string) => (await search({ name, limit: 1 }))[0]?.image ?? null;
}
