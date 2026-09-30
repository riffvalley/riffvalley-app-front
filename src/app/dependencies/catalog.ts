import { catalogApi } from "@/modules/catalog/infrastructure/catalogApi";
import { useCatalogStore } from "@/modules/catalog/presentation/catalogStore";
import { discListApi } from "@/modules/catalog/infrastructure/discListApi";
import { listDiscs } from "@/modules/catalog/application/listDiscs";
import type { DiscListParams } from "@/modules/catalog/application/catalogPort";
import { artistManagementApi } from "@/modules/catalog/infrastructure/artistManagementApi";
import type { ArtistManagementParams } from "@/modules/catalog/domain/artistManagement";

/** Minimal composition for the catalog pilot consumer. */
export function fetchCatalog() {
  return useCatalogStore().fetchCatalog(catalogApi);
}

export function fetchDiscList(params: DiscListParams) {
  return listDiscs(discListApi, params);
}

export function fetchArtistManagement(params: ArtistManagementParams) {
  return artistManagementApi.getArtistsManagement(params);
}
