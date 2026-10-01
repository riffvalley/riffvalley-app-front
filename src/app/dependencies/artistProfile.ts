import { loadArtistProfile } from "@/integrations/spotify/application/artistProfile";
import { artistProfileApi } from "@/integrations/spotify/infrastructure/artistProfileApi";

export function fetchArtistProfile(artistName: string) {
  return loadArtistProfile(artistProfileApi, { artistName });
}
