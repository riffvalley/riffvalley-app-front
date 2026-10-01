import { catalogApi } from "@/modules/catalog/reference-data/infrastructure/catalogApi";
import { useCatalogStore } from "@/modules/catalog/reference-data/presentation/stores/catalogStore";
import { discListApi } from "@/modules/catalog/discs/listing/infrastructure/discListApi";
import type { DiscListParams } from "@/modules/catalog/discs/listing/application/discListPort";
import { artistManagementApi } from "@/modules/catalog/artists/infrastructure/artistManagementApi";
import type { ArtistManagementParams } from "@/modules/catalog/artists/domain/artistManagement";
import { updateArtist as updateArtistOperation } from "@/modules/catalog/artists/editing/application/updateArtist";
import type { UpdateArtistInput } from "@/modules/catalog/artists/application/artistManagementPort";
import { deleteArtist as deleteArtistOperation } from "@/modules/catalog/artists/deletion/application/deleteArtist";
import { createCalendarArtist as createCalendarArtistOperation } from "@/modules/catalog/artists/creation/application/createCalendarArtist";
import { calendarArtistCreationApi } from "@/modules/catalog/artists/creation/infrastructure/calendarArtistCreationApi";
import { fillMissingArtistImages } from "@/modules/catalog/artists/images/application/fillMissingArtistImages";
import type { FillMissingArtistImagesCallbacks } from "@/modules/catalog/artists/images/application/fillMissingArtistImages";
import { createBulkArtistImageSearchSession } from "@/app/dependencies/artistImages";
import { addCommunityRatingSummary, type CommunityArtistManagementItem } from "@/app/dependencies/communityArtistManagement";

/** Minimal composition for the catalog pilot consumer. */
export function fetchCatalog() {
  return useCatalogStore().fetchCatalog(catalogApi);
}

export function fetchDiscList(params: DiscListParams) {
  return discListApi.getDiscs(params);
}

export async function fetchArtistManagement(params: ArtistManagementParams) {
  const result = await artistManagementApi.getArtistsManagement(params);
  return {
    ...result,
    data: result.data.map((artist) => addCommunityRatingSummary(artist)) as CommunityArtistManagementItem[],
  };
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

export function fillManagedArtistImages(callbacks: FillMissingArtistImagesCallbacks = {}) {
  return fillMissingArtistImages(
    artistManagementApi,
    { createSearchSession: createBulkArtistImageSearchSession },
    callbacks,
  );
}
