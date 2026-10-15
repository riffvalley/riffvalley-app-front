import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@services/api/api.ts";
import {
  fetchManualData,
  getCatalogImportGlobalErrorMessage,
  uploadDiscFile,
} from "./imports";
import type {
  CatalogImportImportedResult,
  ManualImportResponse,
} from "./imports";

vi.mock("@services/api/api.ts", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const importedResult: CatalogImportImportedResult = {
  inputIndex: 0,
  source: { kind: "manual", inputLine: "Artist – Album" },
  status: "imported",
  artistName: "Artist",
  discName: "Album",
  artistId: "artist-id",
  discId: "disc-id",
  message: "Disco importado correctamente.",
};

describe("catalog import services", () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset();
  });

  it("returns Manual results from the single data.results contract", async () => {
    const payload: ManualImportResponse = {
      message: "Data processed successfully",
      data: { results: [importedResult] },
    };
    vi.mocked(api.post).mockResolvedValue({ data: payload } as never);

    const response = await fetchManualData("October 15, 2026", [
      { line: "Artist – Album" },
    ]);

    expect(api.post).toHaveBeenCalledWith("/catalog/import/manual", {
      date: "October 15, 2026",
      albums: [{ line: "Artist – Album" }],
    });
    expect(response.data.results).toEqual([importedResult]);
    expect(response.data).not.toHaveProperty("savedDiscs");
    expect(response.data).not.toHaveProperty("existingDiscs");
  });

  it("rejects the legacy Manual response shape", async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        message: "legacy",
        data: { savedDiscs: [], existingDiscs: [] },
      },
    } as never);

    await expect(fetchManualData("date", [])).rejects.toThrow(
      "Invalid catalog import response",
    );
  });

  it("returns Excel results from data.results without created/errors", async () => {
    const payload = {
      data: {
        results: [
          {
            ...importedResult,
            source: { kind: "excel" as const, sheet: "Discos", rowNumber: 7 },
          },
        ],
      },
    };
    vi.mocked(api.post).mockResolvedValue({ data: payload } as never);

    const file = new File(["fixture"], "albums.xlsx");
    const response = await uploadDiscFile(file);

    expect(api.post).toHaveBeenCalledWith(
      "/catalog/import/excel",
      expect.any(FormData),
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    expect(response.data.results).toEqual(payload.data.results);
    expect(response).not.toHaveProperty("created");
    expect(response).not.toHaveProperty("errors");
  });

  it("rejects the legacy Excel response shape", async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { created: 1, errors: [] },
    } as never);

    await expect(
      uploadDiscFile(new File(["fixture"], "albums.xlsx")),
    ).rejects.toThrow("Invalid catalog import response");
  });

  it("shows only approved systemic messages and warns about earlier commits", () => {
    const message =
      "No se pudo completar la importación del archivo. Los resultados confirmados antes del fallo se conservan.";

    expect(
      getCatalogImportGlobalErrorMessage({ response: { data: { message } } }),
    ).toContain("Algunos registros anteriores pueden haberse guardado.");
    expect(
      getCatalogImportGlobalErrorMessage({
        response: {
          data: { message: "QueryFailedError: password at postgres" },
        },
      }),
    ).toBe(
      "No se pudo completar la importación. Comprueba el catálogo antes de volver a intentarlo.",
    );
  });
});
