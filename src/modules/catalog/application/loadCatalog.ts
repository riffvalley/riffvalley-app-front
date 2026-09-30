import type { Catalog } from "../domain/catalog";
import type { CatalogPort } from "./catalogPort";

export async function loadCatalog(port: CatalogPort): Promise<Catalog> {
  const catalog = await port.getCatalog();
  return {
    genres: [...catalog.genres].sort((a, b) => a.name.localeCompare(b.name)),
    countries: [...catalog.countries].sort((a, b) => a.name.localeCompare(b.name)),
  };
}
