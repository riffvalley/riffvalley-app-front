import type { ArtistDetailIdentity } from "@/modules/catalog";
import { loadArtistDetails } from "@/integrations/spotify";
import { artistDetailsApi } from "@/integrations/spotify/infrastructure/artistDetailsApi";

export function fetchArtistDetails(identity: ArtistDetailIdentity) {
  return loadArtistDetails(artistDetailsApi, {
    discName: identity.discName,
    artistName: identity.artistName,
  });
}
