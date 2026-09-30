import { catalogApi } from "@/modules/catalog/infrastructure/catalogApi";
import type { Catalog, Country, Genre } from "@/modules/catalog/domain/catalog";

export type { Country, Genre };
export type CatalogResponse = Catalog;

/** Legacy facade retained for consumers not yet migrated to the catalog module. */
export function getCatalog(): Promise<CatalogResponse> {
  return catalogApi.getCatalog();
}
