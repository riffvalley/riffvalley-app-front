import type { Catalog } from "../domain/catalog";

export interface CatalogPort {
  getCatalog(): Promise<Catalog>;
}
