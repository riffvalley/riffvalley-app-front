import { loadArtistBiography } from "@/integrations/lastfm";
import { artistBiographyApi } from "@/integrations/lastfm/infrastructure/artistBiographyApi";

export function fetchArtistBiography(artistName: string) {
  return loadArtistBiography(artistBiographyApi, artistName);
}
