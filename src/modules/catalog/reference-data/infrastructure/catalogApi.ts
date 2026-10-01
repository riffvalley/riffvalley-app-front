import api from "@/shared/infrastructure/http/client";
import type { CatalogPort } from "../application/catalogPort";
import type { Catalog } from "../domain/catalog";

export const catalogApi: CatalogPort = {
  async getCatalog() {
    const response = await api.get<Catalog>("/catalog");
    return response.data;
  },
};
