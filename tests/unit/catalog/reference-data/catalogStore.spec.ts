import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const getCatalog = vi.hoisted(() => vi.fn());
import { useCatalogStore } from "../../../../src/modules/catalog/reference-data/presentation/stores/catalogStore.ts";

describe("catalog pilot store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    getCatalog.mockReset();
  });

  it("sorts genres and countries, then reuses the cached catalog", async () => {
    getCatalog.mockResolvedValue({
      genres: [
        { id: "2", name: "Zeta", color: "blue" },
        { id: "1", name: "Alpha", color: "red" },
      ],
      countries: [
        { id: "2", name: "Spain", isoCode: "ES" },
        { id: "1", name: "Argentina", isoCode: "AR" },
      ],
    });
    const store = useCatalogStore();

    const port = { getCatalog };
    await store.fetchCatalog(port);
    await store.fetchCatalog(port);

    expect(store.genres.map(({ name }) => name)).toEqual(["Alpha", "Zeta"]);
    expect(store.countries.map(({ name }) => name)).toEqual(["Argentina", "Spain"]);
    expect(getCatalog).toHaveBeenCalledTimes(1);
    expect(store.loaded).toBe(true);
  });

  it("accepts an empty catalog and marks it cached", async () => {
    getCatalog.mockResolvedValue({ genres: [], countries: [] });
    const store = useCatalogStore();

    await store.fetchCatalog({ getCatalog });

    expect(store.genres).toEqual([]);
    expect(store.countries).toEqual([]);
    expect(store.loaded).toBe(true);
  });

  it("keeps failures retryable and clears loading state", async () => {
    getCatalog.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({
      genres: [{ id: "1", name: "Rock", color: "red" }],
      countries: [],
    });
    const store = useCatalogStore();

    const port = { getCatalog };
    await expect(store.fetchCatalog(port)).rejects.toThrow("offline");
    expect(store.loaded).toBe(false);
    expect(store.loading).toBe(false);

    await store.fetchCatalog(port);
    expect(store.genres[0]?.name).toBe("Rock");
    expect(store.loaded).toBe(true);
  });
});
