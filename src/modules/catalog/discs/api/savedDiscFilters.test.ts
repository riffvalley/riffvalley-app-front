import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock("@services/api/api", () => ({ default: api }));

import {
  createSavedDiscFilter,
  deleteSavedDiscFilter,
  getSavedDiscFilters,
  updateSavedDiscFilter,
} from "./savedDiscFilters";

beforeEach(() => {
  api.get.mockReset().mockResolvedValue({ data: [] });
  api.post.mockReset().mockResolvedValue({ data: { id: "filter-a" } });
  api.patch.mockReset().mockResolvedValue({ data: { id: "filter-a" } });
  api.delete.mockReset().mockResolvedValue({ status: 204 });
});

describe("saved DiscList filters API", () => {
  it("lists filters and forwards cancellation", async () => {
    const signal = new AbortController().signal;
    await getSavedDiscFilters(signal);
    expect(api.get).toHaveBeenCalledWith("/discs/list/saved-filters", { signal });
  });

  it("creates only the saved criteria and name", async () => {
    const payload = {
      name: "Metal",
      filters: { genreIds: ["genre-a"], countryId: null, yearFrom: 2025, yearTo: null },
    };
    await createSavedDiscFilter(payload);
    expect(api.post).toHaveBeenCalledWith("/discs/list/saved-filters", payload);
  });

  it("updates a filter and encodes its ID in the resource path", async () => {
    await updateSavedDiscFilter("filter/a", { name: "Renombrado" });
    expect(api.patch).toHaveBeenCalledWith("/discs/list/saved-filters/filter%2Fa", {
      name: "Renombrado",
    });
  });

  it("deletes one filter", async () => {
    await deleteSavedDiscFilter("filter-a");
    expect(api.delete).toHaveBeenCalledWith("/discs/list/saved-filters/filter-a");
  });
});
