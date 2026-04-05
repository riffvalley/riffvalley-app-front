import { defineStore } from "pinia";
import { getCatalog, type Genre, type Country } from "@services/catalog/catalog";

export const useCatalogStore = defineStore("catalog", {
  state: () => ({
    genres: [] as Genre[],
    countries: [] as Country[],
    loaded: false,
  }),
  actions: {
    async fetchCatalog() {
      if (this.loaded) return;
      const data = await getCatalog();
      this.genres = data.genres.sort((a, b) => a.name.localeCompare(b.name));
      this.countries = data.countries.sort((a, b) => a.name.localeCompare(b.name));
      this.loaded = true;
    },
  },
});
