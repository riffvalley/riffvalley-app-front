import { catalogApi } from "@/modules/catalog/infrastructure/catalogApi";
import { useCatalogStore } from "@/modules/catalog/presentation/catalogStore";

/** Minimal composition for the catalog pilot consumer. */
export function fetchCatalog() {
  return useCatalogStore().fetchCatalog(catalogApi);
}
