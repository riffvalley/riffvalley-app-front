// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ImportDiscs from "./ImportDiscs.vue";
import ImportPage from "./ImportPage.vue";
import { fetchManualData, uploadDiscFile } from "@services/imports/imports";
import type {
  CatalogImportResultItem,
  ExcelImportResponse,
  ManualImportResponse,
} from "@services/imports/imports";

vi.mock("@services/imports/imports", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@services/imports/imports")>();
  return {
    ...actual,
    fetchManualData: vi.fn(),
    uploadDiscFile: vi.fn(),
  };
});

vi.mock("@stores/catalog/catalog", () => ({
  useCatalogStore: () => ({ genres: [], countries: [], fetchCatalog: vi.fn() }),
}));

vi.mock("@services/discs/discs", () => ({ updateDisc: vi.fn() }));
vi.mock("@services/spotify/spotifyLookup", () => ({
  resolveSpotifyAlbum: vi.fn(),
}));
vi.mock("@services/swal/SwalService", () => ({
  default: { success: vi.fn() },
}));

const manualImport = vi.mocked(fetchManualData);
const excelImport = vi.mocked(uploadDiscFile);

function imported(
  inputIndex: number,
  artistName: string,
  discName: string,
  inputLine: string,
): CatalogImportResultItem {
  return {
    inputIndex,
    source: { kind: "manual", inputLine },
    status: "imported",
    artistName,
    discName,
    artistId: `artist-${inputIndex}`,
    discId: `disc-${inputIndex}`,
    message: "Disco importado correctamente.",
  };
}

function duplicate(
  inputIndex: number,
  artistName: string,
  discName: string,
  inputLine: string,
): CatalogImportResultItem {
  return {
    inputIndex,
    source: { kind: "manual", inputLine },
    status: "duplicate",
    artistName,
    discName,
    artistId: `artist-${inputIndex}`,
    discId: `disc-${inputIndex}`,
    message: "El disco ya existe y se ha omitido.",
  };
}

function failedManual(inputIndex: number): CatalogImportResultItem {
  return {
    inputIndex,
    source: { kind: "manual", inputLine: "Gamma – Unknown Album" },
    status: "failed",
    reasonCode: "REFERENCE_NOT_FOUND",
    artistName: "Gamma",
    discName: "Unknown Album",
    message: "El género indicado no existe.",
  };
}

function successfulManualResponse(
  results: CatalogImportResultItem[],
): ManualImportResponse {
  return { message: "Data processed successfully", data: { results } };
}

function buttonWithText(wrapper: VueWrapper, text: string) {
  const button = wrapper
    .findAll("button")
    .find((item) => item.text().includes(text));
  if (!button) throw new Error(`Button not found: ${text}`);
  return button;
}

async function submitManual(wrapper: VueWrapper, line = "Artist – Album") {
  await wrapper.get("#date").setValue("2026-10-15");
  await wrapper
    .get('input[placeholder="Artista – Nombre del disco"]')
    .setValue(line);
  await buttonWithText(wrapper, "Añadir").trigger("click");
  await buttonWithText(wrapper, "Enviar").trigger("click");
  await flushPromises();
}

async function uploadExcel(wrapper: VueWrapper) {
  const input = wrapper.get("#file");
  Object.defineProperty(input.element, "files", {
    value: [new File(["mock workbook"], "albums.xlsx")],
  });
  await input.trigger("change");
  await buttonWithText(wrapper, "Importar discos").trigger("click");
  await flushPromises();
}

const globalStubs = { SearchableSelect: true };

describe("Manual catalog import results", () => {
  beforeEach(() => {
    vi.mocked(manualImport).mockReset();
  });

  it("shows a fully successful import", async () => {
    manualImport.mockResolvedValue(
      successfulManualResponse([
        imported(0, "Artist", "Album", "Artist – Album"),
      ]),
    );
    const wrapper = mount(ImportPage, { global: { stubs: globalStubs } });

    await submitManual(wrapper);

    expect(wrapper.text()).toContain("Importado");
    expect(wrapper.text()).toContain("Importados");
    expect(wrapper.text()).toContain("Artist – Album");
    expect(wrapper.text()).toContain("Buscar en Spotify");
    wrapper.unmount();
  });

  it("keeps mixed results ordered, shows original lines, repeated titles, and distinct duplicate/failure states", async () => {
    manualImport.mockResolvedValue(
      successfulManualResponse([
        imported(0, "Alpha", "Repeat", "Alpha – Repeat"),
        duplicate(1, "Beta", "Repeat", "Beta – Repeat"),
        failedManual(2),
        imported(3, "Delta", "Repeat", "Delta – Repeat"),
      ]),
    );
    const wrapper = mount(ImportPage, { global: { stubs: globalStubs } });

    await submitManual(wrapper, "Alpha – Repeat");

    const results = wrapper.get('[aria-label="Resultados de importación"]');
    const entries = results.findAll("li").map((entry) => entry.text());
    expect(entries).toHaveLength(4);
    expect(entries[0]).toContain("Alpha – Repeat");
    expect(entries[1]).toContain("Beta – Repeat");
    expect(entries[2]).toContain("Gamma – Unknown Album");
    expect(entries[3]).toContain("Delta – Repeat");
    expect(entries[1]).toContain("Duplicado · omitido");
    expect(entries[1]).toContain("El disco ya existe y se ha omitido.");
    expect(entries[2]).toContain("Fallido");
    expect(entries[2]).toContain("El género indicado no existe.");
    expect(wrapper.text()).toContain("2");
    expect(wrapper.find(".bg-amber-100").exists()).toBe(true);
    wrapper.unmount();
  });

  it("warns about earlier saved records on a systemic error without retrying or exposing internals", async () => {
    manualImport.mockRejectedValue({
      response: {
        data: {
          message:
            "No se pudo completar la importación. Los discos confirmados antes del fallo se conservan.",
        },
      },
      message: "QueryFailedError: private database detail",
    });
    const wrapper = mount(ImportPage, { global: { stubs: globalStubs } });

    await submitManual(wrapper);

    expect(wrapper.text()).toContain(
      "Algunos registros anteriores pueden haberse guardado.",
    );
    expect(wrapper.text()).not.toContain("private database detail");
    expect(manualImport).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("does not interpret legacy savedDiscs/existingDiscs responses", async () => {
    manualImport.mockResolvedValue({
      message: "legacy",
      data: {
        savedDiscs: [
          {
            artistId: "a",
            discId: "d",
            message: 'Artist "Old" => Disc "Album"',
          },
        ],
        existingDiscs: [],
      },
    } as unknown as ManualImportResponse);
    const wrapper = mount(ImportPage, { global: { stubs: globalStubs } });

    await submitManual(wrapper);

    expect(wrapper.text()).not.toContain("Old – Album");
    expect(
      wrapper.get('[aria-label="Resultados de importación"]').findAll("li"),
    ).toHaveLength(0);
    wrapper.unmount();
  });
});

describe("Excel catalog import results", () => {
  beforeEach(() => {
    excelImport.mockReset();
  });

  it("shows ordered imported, duplicate, and failed rows with sheet and physical row", async () => {
    const results: CatalogImportResultItem[] = [
      {
        inputIndex: 0,
        source: { kind: "excel", sheet: "Discos", rowNumber: 7 },
        status: "imported",
        artistName: "Artist A",
        discName: "Same Title",
        artistId: "artist-a",
        discId: "disc-a",
        message: "Disco importado correctamente.",
      },
      {
        inputIndex: 1,
        source: { kind: "excel", sheet: "EPs", rowNumber: 12 },
        status: "duplicate",
        artistName: "Artist B",
        discName: "Same Title",
        artistId: "artist-b",
        discId: "disc-b",
        message: "El disco ya existe y se ha omitido.",
      },
      {
        inputIndex: 2,
        source: { kind: "excel", sheet: "Discos", rowNumber: 21 },
        status: "failed",
        reasonCode: "PERSISTENCE_FAILED",
        artistName: "Artist C",
        discName: "Bad Record",
        message: "No se pudo guardar esta fila por un problema con sus datos.",
      },
    ];
    excelImport.mockResolvedValue({ data: { results } });
    const wrapper = mount(ImportDiscs);

    await uploadExcel(wrapper);

    expect(wrapper.text()).toContain(
      "1 importados · 1 duplicados omitidos · 1 fallidos",
    );
    expect(wrapper.text()).toContain("Discos, fila física 7");
    expect(wrapper.text()).toContain("EPs, fila física 12");
    expect(wrapper.text()).toContain("Discos, fila física 21");
    expect(wrapper.text()).toContain("Duplicado · omitido");
    expect(wrapper.text()).toContain(
      "No se pudo guardar esta fila por un problema con sus datos.",
    );
    const entries = wrapper
      .get('[aria-label="Resultados de importación"]')
      .findAll("li");
    expect(entries.map((entry) => entry.text())).toEqual([
      expect.stringContaining("Artist A – Same Title"),
      expect.stringContaining("Artist B – Same Title"),
      expect.stringContaining("Artist C – Bad Record"),
    ]);
    wrapper.unmount();
  });

  it("shows systemic failure guidance once and does not expose database details", async () => {
    excelImport.mockRejectedValue({
      response: {
        data: {
          message:
            "No se pudo completar la importación del archivo. Los resultados confirmados antes del fallo se conservan.",
        },
      },
      message: "QueryFailedError: private database detail",
    });
    const wrapper = mount(ImportDiscs);

    await uploadExcel(wrapper);

    expect(wrapper.text()).toContain(
      "Algunos registros anteriores pueden haberse guardado.",
    );
    expect(wrapper.text()).not.toContain("private database detail");
    expect(excelImport).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("does not interpret the legacy created/errors response", async () => {
    excelImport.mockResolvedValue({
      created: 1,
      errors: [],
    } as unknown as ExcelImportResponse);
    const wrapper = mount(ImportDiscs);

    await uploadExcel(wrapper);

    expect(wrapper.text()).not.toContain("1 importados");
    expect(wrapper.text()).toContain("No se pudo completar la importación.");
    expect(
      wrapper.find('[aria-label="Resultados de importación"]').exists(),
    ).toBe(false);
    wrapper.unmount();
  });
});
