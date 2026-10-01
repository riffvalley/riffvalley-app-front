import { loadMostPopularTrackId } from "@/integrations/spotify";
import { mostPopularTrackApi } from "@/integrations/spotify/infrastructure/mostPopularTrackApi";

export function fetchMostPopularTrackId(spotifyAlbumId: string) {
  return loadMostPopularTrackId(mostPopularTrackApi, { spotifyAlbumId });
}
