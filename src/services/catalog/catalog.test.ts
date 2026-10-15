import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@services/api/api.ts";
import { getCatalog, type CatalogResponse } from "./catalog";

vi.mock("@services/api/api.ts", () => ({
  default: {
    get: vi.fn(),
  },
}));

describe("getCatalog", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  it("returns nullable catalog fields from the backend response", async () => {
    const payload: CatalogResponse = {
      genres: [
        { id: "genre-null", name: "Unknown color", color: null },
        { id: "genre-colored", name: "Rock", color: "#123456" },
      ],
      countries: [
        { id: "country-null", name: "Unknown code", isoCode: null },
        { id: "country-coded", name: "Spain", isoCode: "ES" },
      ],
    };
    vi.mocked(api.get).mockResolvedValue({ data: payload } as never);

    const catalog = await getCatalog();

    expect(api.get).toHaveBeenCalledWith("/catalog");
    expect(catalog).toEqual(payload);
    expect(catalog.genres[0].color).toBeNull();
    expect(catalog.countries[0].isoCode).toBeNull();
    expect(catalog.genres[1].color).toBe("#123456");
    expect(catalog.countries[1].isoCode).toBe("ES");
  });
});
