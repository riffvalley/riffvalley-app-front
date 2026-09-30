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
import { createCalendarArtist as createCalendarArtistOperation } from "@/modules/catalog/application/createCalendarArtist";
import { calendarArtistCreationApi } from "@/modules/catalog/infrastructure/calendarArtistCreationApi";

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

/** Update an artist from a Catalog-owned consumer such as the disc calendar. */
export function updateCalendarArtist(id: string, data: Pick<UpdateArtistInput, "name" | "countryId">) {
  return updateArtistOperation(artistManagementApi, id, data);
}

export function createAndAssociateCalendarArtist(discId: string, name: string) {
  return createCalendarArtistOperation(calendarArtistCreationApi, discId, name);
}

export function deleteManagedArtist(id: string) {
  return deleteArtistOperation(artistManagementApi, id);
}
