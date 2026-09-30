import { catalogApi } from "@/modules/catalog/infrastructure/catalogApi";
import { useCatalogStore } from "@/modules/catalog/presentation/catalogStore";
import { discListApi } from "@/modules/catalog/infrastructure/discListApi";
import { listDiscs } from "@/modules/catalog/application/listDiscs";
import type { DiscListParams } from "@/modules/catalog/application/catalogPort";
import { artistManagementApi } from "@/modules/catalog/infrastructure/artistManagementApi";
import type { ArtistManagementParams } from "@/modules/catalog/domain/artistManagement";
import { updateArtist as updateArtistOperation } from "@/modules/catalog/application/updateArtist";
import type { UpdateArtistInput } from "@/modules/catalog/application/artistManagementPort";
import { deleteArtist as deleteArtistOperation } from "@/modules/catalog/application/deleteArtist";

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

export function saveManagedArtist(id: string, data: UpdateArtistInput) {
  return updateArtistOperation(artistManagementApi, id, data);
}

export function deleteManagedArtist(id: string) {
  return deleteArtistOperation(artistManagementApi, id);
}
