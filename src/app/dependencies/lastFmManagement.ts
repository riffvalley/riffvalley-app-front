import type { LastFmManagementDependencies } from "@/modules/catalog";
import { searchCatalogArtists } from "@/modules/catalog/artists/discovery/application/artistExternalProfile";
import { artistManagementApi } from "@/modules/catalog/artists/infrastructure/artistManagementApi";
import { loadLastFmManagementArtist } from "@/integrations/lastfm";
import { managementArtistApi } from "@/integrations/lastfm/infrastructure/managementArtistApi";
import { findArtistImages } from "./artistImages";

export const lastFmManagementDependencies: LastFmManagementDependencies = {
  loadProfile(name) {
    return loadLastFmManagementArtist(managementArtistApi, name);
  },
  searchCatalogArtists(name) {
    return searchCatalogArtists(artistManagementApi, name);
  },
  async findFallbackImage(name) {
    return (await findArtistImages(name, 1))[0]?.image ?? null;
  },
};
