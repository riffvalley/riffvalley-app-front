import { searchArtistImages } from "@/integrations/spotify";
import { artistImagesApi } from "@/integrations/spotify/infrastructure/artistImagesApi";

export function findArtistImages(name: string, limit: 1 | 5) {
  return searchArtistImages(artistImagesApi, { name, limit });
}
