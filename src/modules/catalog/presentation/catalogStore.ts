import { defineStore } from "pinia";
import type { Country, Genre } from "../domain/catalog";
import type { CatalogPort } from "../application/catalogPort";
import { loadCatalog } from "../application/loadCatalog";

export const useCatalogStore = defineStore("catalog-pilot", {
  state: () => ({
    genres: [] as Genre[],
    countries: [] as Country[],
    loaded: false,
    loading: false,
  }),
  actions: {
    async fetchCatalog(port: CatalogPort) {
      if (this.loaded || this.loading) return;
      this.loading = true;
      try {
        const catalog = await loadCatalog(port);
        this.genres = catalog.genres;
        this.countries = catalog.countries;
        this.loaded = true;
      } finally {
        this.loading = false;
      }
    },
  },
});
