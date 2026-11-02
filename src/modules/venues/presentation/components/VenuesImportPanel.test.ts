// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import VenuesImportPanel from "./VenuesImportPanel.vue";
import { venueCatalogQueryKey } from "../../application/useVenueCatalog";

const { countriesMock, regionsMock, resolveMock, resolveBatchMock, batchMock } = vi.hoisted(() => ({
  countriesMock: vi.fn(),
  regionsMock: vi.fn(),
  resolveMock: vi.fn(),
  resolveBatchMock: vi.fn(),
  batchMock: vi.fn(),
}));

vi.mock("../../api/venueImport", () => ({
  getVenueImportCountries: countriesMock,
  getAdministrativeRegions: regionsMock,
  resolveVenueLocality: resolveMock,
  resolveVenueBatch: resolveBatchMock,
  importVenueBatch: batchMock,
}));

const countries = [
  { id: "country-es-real", name: "España", isoCode: "ES" },
  { id: "country-fr", name: "Francia", isoCode: "FR" },
];
const regions = [
  { id: "region-eus", name: "País Vasco", countryId: "country-es-real" },
  { id: "region-catalonia", name: "Cataluña", countryId: "country-es-real" },
];

describe("VenuesImportPanel", () => {
  let wrapper: VueWrapper | undefined;
  let queryClient: QueryClient;

  function mountPanel() {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    wrapper = mount(VenuesImportPanel, {
      global: { plugins: [[VueQueryPlugin, { queryClient }]] },
    });
    return wrapper;
  }

  async function readyPanel() {
    const panel = mountPanel();
    await flushPromises();
    return panel;
  }

  async function chooseRegion(panel: VueWrapper = wrapper!) {
    await panel.get("#venue-region").setValue("region-eus");
  }

  async function setLocation(panel: VueWrapper = wrapper!) {
    await panel.get("#venue-locality").setValue("Bilbao");
    await chooseRegion(panel);
  }

  async function importRows(panel: VueWrapper = wrapper!) {
    const button = panel
      .findAll("button")
      .find((candidate) => candidate.classes().includes("bg-rv-navy"));
    if (!button) throw new Error("Import button was not found");
    await button.trigger("click");
  }

  beforeEach(() => {
    countriesMock.mockReset().mockResolvedValue(countries);
    regionsMock
      .mockReset()
      .mockImplementation(async (countryId: string) =>
        countryId === "country-es-real"
          ? regions
          : [{ id: "region-fr", name: "Occitania", countryId }]
      );
    resolveMock.mockReset().mockResolvedValue({
      locality: { id: "locality-resolved", name: "Bilbao" },
      geocoding: { status: "cached" },
    });
    resolveBatchMock
      .mockReset()
      .mockImplementation(async (venues: Array<{ name: string }>) =>
        venues.map(({ name }) => ({ name, localityId: "locality-resolved", venue: null }))
      );
    batchMock
      .mockReset()
      .mockImplementation(async ({ venues }: { venues: Array<{ name: string }> }) => ({
        summary: {
          total: venues.length,
          created: venues.length,
          existing: 0,
          duplicates: 0,
          failed: 0,
        },
        results: venues.map((venue, index) => ({
          index,
          name: venue.name,
          status: "created",
          venueId: `venue-${venue.name}`,
        })),
      }));
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    queryClient?.clear();
    vi.clearAllMocks();
  });

  it("loads countries, selects Spain by ISO code, and fetches its readable administrative regions", async () => {
    const panel = await readyPanel();

    expect(panel.get("#venue-country").element.value).toBe("country-es-real");
    expect(panel.get("#venue-region").text()).toContain("País Vasco");
    expect(panel.get("#venue-region").text()).toContain("Cataluña");
    expect(regionsMock).toHaveBeenCalledWith("country-es-real", expect.any(AbortSignal));
  });

  it("changes country, reloads matching regions, and clears an incompatible selection", async () => {
    const panel = await readyPanel();
    await chooseRegion(panel);

    await panel.get("#venue-country").setValue("country-fr");
    await flushPromises();

    expect(panel.get("#venue-region").element.value).toBe("");
    expect(panel.get("#venue-region").text()).toContain("Occitania");
    expect(regionsMock).toHaveBeenCalledWith("country-fr", expect.any(AbortSignal));
  });

  it("keeps locality text editable, leaves province optional, and adds/deletes/edits rows independently", async () => {
    const panel = await readyPanel();
    await panel.get("#venue-locality").setValue("Girona");
    expect(resolveMock).not.toHaveBeenCalled();
    expect(panel.get("#venue-province").attributes("required")).toBeUndefined();

    await panel.get('input[aria-label="Nombre de la sala, fila 1"]').setValue("Sala + Uno  ");
    await panel.get('select[aria-label="Tipo de recinto, fila 1"]').setValue("arena");
    await panel.get("button").trigger("click");
    await panel.get('input[aria-label="Nombre de la sala, fila 2"]').setValue("Sala Dos");
    await panel.get('button[aria-label="Eliminar fila 1"]').trigger("click");

    expect(panel.get('input[aria-label="Nombre de la sala, fila 1"]').element.value).toBe(
      "Sala Dos"
    );
    expect(panel.get('select[aria-label="Tipo de recinto, fila 1"]').element.value).toBe(
      "concert_hall"
    );
  });

  it("shows an optional row locality and leaves new and pasted rows blank", async () => {
    const panel = await readyPanel();
    expect(panel.get('input[aria-label="Localidad opcional, fila 1"]').element.value).toBe("");
    await panel
      .get<HTMLInputElement>('input[aria-label="Nombre de la sala, fila 1"]')
      .trigger("paste", { clipboardData: { getData: () => "Sala A\nSala B" } });

    expect(
      panel.findAll('input[aria-label^="Localidad opcional"]').map((input) => input.element.value)
    ).toEqual(["", ""]);
  });

  it("deduplicates pasted names against the table using normalized exact names and preserves other rows", async () => {
    const panel = await readyPanel();
    await panel.get('input[aria-label="Nombre de la sala, fila 1"]').setValue("Antes");
    await panel.get("button").trigger("click");
    await panel.get('input[aria-label="Nombre de la sala, fila 2"]').setValue(" Sala Á  ");
    await panel.get("button").trigger("click");
    await panel.get('input[aria-label="Nombre de la sala, fila 3"]').setValue("Después");

    await panel
      .get<HTMLInputElement>('input[aria-label="Nombre de la sala, fila 3"]')
      .trigger("paste", {
        clipboardData: { getData: () => "sala a\r\n\r\nSALA A\nSala B\r\nsala b\nSala A2" },
      });

    expect(
      panel.findAll('input[aria-label^="Nombre de la sala"]').map((input) => input.element.value)
    ).toEqual(["Antes", " Sala Á  ", "Sala B", "Sala A2", "Después"]);
    expect(panel.text()).toContain("Se omitieron 3 duplicados del pegado.");
  });

  it("handles consecutive pastes without removing earlier rows and keeps exact non-similar names", async () => {
    const panel = await readyPanel();
    await panel
      .get<HTMLInputElement>('input[aria-label="Nombre de la sala, fila 1"]')
      .trigger("paste", {
        clipboardData: { getData: () => "Sala A\nSala B" },
      });
    await panel
      .get<HTMLInputElement>('input[aria-label="Nombre de la sala, fila 2"]')
      .trigger("paste", {
        clipboardData: { getData: () => "sala   a\nSala AB\nSala B" },
      });
    expect(
      panel.findAll('input[aria-label^="Nombre de la sala"]').map((input) => input.element.value)
    ).toEqual(["Sala A", "Sala AB", "Sala B"]);
    expect(panel.text()).toContain("Se omitieron 2 duplicados del pegado.");
  });

  it("resolves existing venues after locality resolution, preserves their IDs, and skips them on import", async () => {
    resolveBatchMock.mockResolvedValueOnce([
      {
        name: "Sala existente",
        localityId: "locality-resolved",
        venue: { id: "venue-existing", name: "Sala Existente" },
      },
    ]);
    const panel = await readyPanel();
    await setLocation(panel);
    await panel.get('input[aria-label="Nombre de la sala, fila 1"]').setValue("Sala existente");
    await importRows(panel);
    await flushPromises();

    expect(resolveBatchMock).toHaveBeenCalledWith([
      { name: "Sala existente", localityId: "locality-resolved" },
    ]);
    expect(batchMock).not.toHaveBeenCalled();
    expect(panel.text()).toContain("Ya está en PostgreSQL");
    expect(panel.text()).toContain("venue-existing");
  });

  it("invalidates known matches when the locality changes", async () => {
    resolveBatchMock.mockResolvedValueOnce([
      { name: "Sala", localityId: "locality-resolved", venue: { id: "venue-id", name: "Sala" } },
    ]);
    const panel = await readyPanel();
    await setLocation(panel);
    await panel.get('input[aria-label="Nombre de la sala, fila 1"]').setValue("Sala");
    await importRows(panel);
    await flushPromises();
    expect(panel.text()).toContain("venue-id");

    await panel.get("#venue-locality").setValue("Vitoria");
    expect(panel.text()).not.toContain("venue-id");
    expect(panel.text()).toContain("Pendiente de comprobar");
  });

  it("keeps row text and avoids import when catalog resolution fails", async () => {
    resolveBatchMock.mockRejectedValueOnce(new Error("Red no disponible"));
    const panel = await readyPanel();
    await setLocation(panel);
    await panel.get('input[aria-label="Nombre de la sala, fila 1"]').setValue("Sala conservada");
    await importRows(panel);
    await flushPromises();

    expect(batchMock).not.toHaveBeenCalled();
    expect(panel.get('input[aria-label="Nombre de la sala, fila 1"]').element.value).toBe(
      "Sala conservada"
    );
    expect(panel.text()).toContain("Red no disponible");
  });

  it("keeps editing available and identifies a missing venue as pending creation", async () => {
    let finishImport!: (value: unknown) => void;
    batchMock.mockReturnValueOnce(new Promise((resolve) => (finishImport = resolve)));
    const panel = await readyPanel();
    await setLocation(panel);
    const input = panel.get<HTMLInputElement>('input[aria-label="Nombre de la sala, fila 1"]');
    await input.setValue("Sala pendiente");
    await importRows(panel);
    await flushPromises();

    expect(input.element.disabled).toBe(false);
    expect(panel.text()).toContain("Pendiente de crear");
    await input.setValue("Sala editada durante la petición");
    finishImport({
      summary: { total: 1, created: 1, existing: 0, duplicates: 0, failed: 0 },
      results: [{ index: 0, name: "Sala pendiente", status: "created", venueId: "old-id" }],
    });
    await flushPromises();

    expect(input.element.value).toBe("Sala editada durante la petición");
    expect(panel.text()).not.toContain("old-id");
  });

  it("resolves the entered locality only on import and continues when geocoding has no coordinates", async () => {
    resolveMock.mockResolvedValueOnce({
      locality: { id: "locality-new", name: "Gerona" },
      geocoding: { status: "unavailable" },
    });
    const panel = await readyPanel();
    await panel.get("#venue-locality").setValue("Gerona");
    await chooseRegion(panel);
    await panel.get("#venue-province").setValue("Girona");
    await panel.get('input[aria-label="Nombre de la sala, fila 1"]').setValue("Sala de muestra");
    await importRows(panel);
    await flushPromises();

    expect(resolveMock).toHaveBeenCalledWith({
      name: "Gerona",
      administrativeRegionId: "region-eus",
      province: "Girona",
    });
    expect(batchMock).toHaveBeenCalledWith({
      localityId: "locality-new",
      venues: [{ name: "Sala de muestra", type: "concert_hall" }],
    });
    expect(panel.text()).toContain("no se pudieron obtener coordenadas");
    expect(panel.text()).toContain("Creada");
  });

  it("resolves several row localities once each, omits the main province from alternatives, and imports by locality ID", async () => {
    resolveMock.mockImplementation(async ({ name }: { name: string }) => ({
      locality: { id: `id-${name.toLowerCase()}`, name },
      geocoding: { status: "cached" },
    }));
    const panel = await readyPanel();
    await panel.get("#venue-locality").setValue("Madrid");
    await panel.get("#venue-province").setValue("Madrid");
    await chooseRegion(panel);
    for (const [index, name] of ["Sala Madrid", "Sala Fuenla", "Sala Móstoles"].entries()) {
      if (index > 0) await panel.get("button").trigger("click");
      await panel
        .get<HTMLInputElement>(`input[aria-label="Nombre de la sala, fila ${index + 1}"]`)
        .setValue(name);
    }
    await panel
      .get<HTMLInputElement>('input[aria-label="Localidad opcional, fila 2"]')
      .setValue("Fuenlabrada");
    await panel
      .get<HTMLInputElement>('input[aria-label="Localidad opcional, fila 3"]')
      .setValue("Móstoles");

    await importRows(panel);
    await flushPromises();

    expect(resolveMock).toHaveBeenCalledTimes(3);
    expect(resolveMock).toHaveBeenCalledWith({
      name: "Madrid",
      administrativeRegionId: "region-eus",
      province: "Madrid",
    });
    expect(resolveMock).toHaveBeenCalledWith({
      name: "Fuenlabrada",
      administrativeRegionId: "region-eus",
    });
    expect(resolveMock).toHaveBeenCalledWith({
      name: "Móstoles",
      administrativeRegionId: "region-eus",
    });
    expect(batchMock.mock.calls.map(([payload]) => payload.localityId)).toEqual([
      "id-madrid",
      "id-fuenlabrada",
      "id-móstoles",
    ]);
    expect(panel.text()).toContain("Creada");
  });

  it("deduplicates equal venue names only within the resolved locality and groups locality aliases by ID", async () => {
    resolveMock.mockImplementation(async ({ name }: { name: string }) => ({
      locality: { id: name === "Madrid" ? "locality-madrid" : "locality-fuenla", name },
      geocoding: { status: "cached" },
    }));
    const panel = await readyPanel();
    await panel.get("#venue-locality").setValue("Madrid");
    await chooseRegion(panel);
    await panel.get('input[aria-label="Nombre de la sala, fila 1"]').setValue("Sala Ejemplo");
    await panel.get("button").trigger("click");
    await panel.get('input[aria-label="Nombre de la sala, fila 2"]').setValue("Sala ejemplo");
    await panel.get("button").trigger("click");
    await panel.get('input[aria-label="Nombre de la sala, fila 3"]').setValue("Sala Ejemplo");
    await panel.get('input[aria-label="Localidad opcional, fila 3"]').setValue("Fuenlabrada");

    await importRows(panel);
    await flushPromises();

    expect(resolveBatchMock).toHaveBeenCalledTimes(2);
    expect(batchMock).toHaveBeenCalledTimes(2);
    expect(batchMock.mock.calls.map(([payload]) => payload.localityId).sort()).toEqual([
      "locality-fuenla",
      "locality-madrid",
    ]);
    expect(panel.text()).toContain("1 duplicadas");
  });

  it("processes valid locality groups when another is ambiguous and retries only failed rows", async () => {
    resolveMock.mockImplementation(async ({ name }: { name: string }) => {
      if (name === "Fuenlabrada" && resolveMock.mock.calls.length === 2)
        return { locality: null, geocoding: { status: "ambiguous" } };
      return {
        locality: { id: name === "Madrid" ? "locality-madrid" : "locality-fuenla", name },
        geocoding: { status: "cached" },
      };
    });
    const panel = await readyPanel();
    await panel.get("#venue-locality").setValue("Madrid");
    await chooseRegion(panel);
    await panel.get('input[aria-label="Nombre de la sala, fila 1"]').setValue("Sala Madrid");
    await panel.get("button").trigger("click");
    await panel.get('input[aria-label="Nombre de la sala, fila 2"]').setValue("Sala Fuenla");
    await panel.get('input[aria-label="Localidad opcional, fila 2"]').setValue("Fuenlabrada");

    await importRows(panel);
    await flushPromises();
    expect(batchMock).toHaveBeenCalledTimes(1);
    expect(panel.text()).toContain("Hay varias localidades posibles");
    expect(panel.text()).toContain("1 creadas");

    await importRows(panel);
    await flushPromises();
    expect(batchMock).toHaveBeenCalledTimes(2);
    expect(batchMock.mock.calls[1]?.[0].venues).toEqual([
      { name: "Sala Fuenla", type: "concert_hall" },
    ]);
    expect(panel.text()).toContain("2 creadas");
  });

  it("invalidates row outcomes when a row locality or administrative region changes", async () => {
    const panel = await readyPanel();
    await setLocation(panel);
    await panel.get('input[aria-label="Nombre de la sala, fila 1"]').setValue("Sala");
    await importRows(panel);
    await flushPromises();
    expect(panel.text()).toContain("Creada");

    await panel.get('input[aria-label="Localidad opcional, fila 1"]').setValue("Vitoria");
    expect(panel.text()).not.toContain("Creada");
    await importRows(panel);
    await flushPromises();
    expect(panel.text()).toContain("Creada");

    await panel.get("#venue-region").setValue("region-catalonia");
    expect(panel.text()).not.toContain("Creada");
  });

  it("merges distinct locality names that resolve through geographic aliases to the same ID", async () => {
    resolveMock.mockImplementation(async ({ name }: { name: string }) => ({
      locality: { id: name === "Madrid" ? "locality-madrid" : "locality-same-alias", name },
      geocoding: { status: "cached" },
    }));
    const panel = await readyPanel();
    await panel.get("#venue-locality").setValue("Madrid");
    await chooseRegion(panel);
    await panel.get('input[aria-label="Nombre de la sala, fila 1"]').setValue("Sala Uno");
    await panel.get("button").trigger("click");
    await panel.get('input[aria-label="Nombre de la sala, fila 2"]').setValue("Sala Dos");
    await panel.get('input[aria-label="Localidad opcional, fila 1"]').setValue("Fuenlabrada");
    await panel.get('input[aria-label="Localidad opcional, fila 2"]').setValue("Fuenla");

    await importRows(panel);
    await flushPromises();

    expect(resolveMock).toHaveBeenCalledTimes(2);
    expect(resolveBatchMock).toHaveBeenCalledTimes(1);
    expect(batchMock).toHaveBeenCalledTimes(1);
    expect(batchMock.mock.calls[0]?.[0].localityId).toBe("locality-same-alias");
    expect(batchMock.mock.calls[0]?.[0].venues).toHaveLength(2);
  });

  it("does not import an ambiguous locality and retains all edited rows", async () => {
    resolveMock.mockResolvedValueOnce({ locality: null, geocoding: { status: "ambiguous" } });
    const panel = await readyPanel();
    await setLocation(panel);
    await panel.get('input[aria-label="Nombre de la sala, fila 1"]').setValue("Sala conservada");
    await importRows(panel);
    await flushPromises();

    expect(batchMock).not.toHaveBeenCalled();
    expect(resolveMock).toHaveBeenCalledWith({
      name: "Bilbao",
      administrativeRegionId: "region-eus",
    });
    expect(panel.text()).toContain("Hay varias localidades posibles");
    expect(panel.get('input[aria-label="Nombre de la sala, fila 1"]').element.value).toBe(
      "Sala conservada"
    );
  });

  it("does not import a successful HTTP response that has no locality ID", async () => {
    resolveMock.mockResolvedValueOnce({ locality: null, geocoding: { status: "unavailable" } });
    const panel = await readyPanel();
    await setLocation(panel);
    await panel.get('input[aria-label="Nombre de la sala, fila 1"]').setValue("Sala conservada");
    await importRows(panel);
    await flushPromises();

    expect(batchMock).not.toHaveBeenCalled();
    expect(panel.text()).toContain("No se pudo confirmar la localidad");
    expect(panel.get('input[aria-label="Nombre de la sala, fila 1"]').element.value).toBe(
      "Sala conservada"
    );
  });

  it("shows country loading failures and the empty catalog state", async () => {
    countriesMock.mockRejectedValueOnce(new Error("Offline"));
    const panel = await readyPanel();

    expect(panel.text()).toContain("No se pudieron cargar los países");
    countriesMock.mockResolvedValueOnce([]);
    await panel.get("button").trigger("click");
    await flushPromises();
    expect(panel.text()).toContain("No hay países disponibles");
  });

  it("shows per-row outcomes, keeps IDs, and summarizes created, existing, duplicate, and failed rows", async () => {
    batchMock.mockResolvedValueOnce({
      summary: { total: 3, created: 1, existing: 1, duplicates: 0, failed: 1 },
      results: [
        { index: 0, name: "Sala A", status: "created", venueId: "id-created" },
        { index: 1, name: "Sala B", status: "existing", venueId: "id-existing" },
        { index: 2, name: "Sala C", status: "failed", error: "Nombre no admitido" },
      ],
    });
    const panel = await readyPanel();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue(undefined);
    await setLocation(panel);
    const names = ["Sala A", "Sala B", "Sala A", "Sala C"];
    for (let index = 0; index < names.length; index += 1) {
      if (index > 0) await panel.get("button").trigger("click");
      await panel
        .get<HTMLInputElement>(`input[aria-label="Nombre de la sala, fila ${index + 1}"]`)
        .setValue(names[index]!);
    }
    await importRows(panel);
    await flushPromises();

    expect(panel.text()).toContain("1 creadas");
    expect(panel.text()).toContain("1 ya existentes");
    expect(panel.text()).toContain("1 duplicadas");
    expect(panel.text()).toContain("1 fallidas");
    expect(panel.text()).toContain("id-created");
    expect(panel.text()).toContain("id-existing");
    expect(batchMock).toHaveBeenCalledWith({
      localityId: "locality-resolved",
      venues: [
        { name: "Sala A", type: "concert_hall" },
        { name: "Sala B", type: "concert_hall" },
        { name: "Sala C", type: "concert_hall" },
      ],
    });
    expect(panel.text()).toContain("Nombre no admitido");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: venueCatalogQueryKey });
  });

  it("ignores empty rows, marks overlong rows locally, and imports the remaining valid rows", async () => {
    const panel = await readyPanel();
    await setLocation(panel);
    await panel.get('input[aria-label="Nombre de la sala, fila 1"]').setValue("x".repeat(181));
    await panel.get("button").trigger("click");
    await panel.get('input[aria-label="Nombre de la sala, fila 2"]').setValue("Sala válida");
    await importRows(panel);
    await flushPromises();

    expect(batchMock).toHaveBeenCalledWith({
      localityId: "locality-resolved",
      venues: [{ name: "Sala válida", type: "concert_hall" }],
    });
    expect(panel.text()).toContain("supera los 180 caracteres");
    expect(panel.text()).toContain("1 fallidas");
  });

  it("splits 205 venues into sequential batches of at most 100", async () => {
    const panel = await readyPanel();
    await setLocation(panel);
    const pasteNames = Array.from({ length: 205 }, (_, index) => `Recinto ${index + 1}`).join("\n");
    await panel
      .get<HTMLInputElement>('input[aria-label="Nombre de la sala, fila 1"]')
      .trigger("paste", {
        clipboardData: { getData: () => pasteNames },
      });
    await importRows(panel);
    await flushPromises();

    expect(batchMock).toHaveBeenCalledTimes(3);
    expect(batchMock.mock.calls.map(([payload]) => payload.venues.length)).toEqual([100, 100, 5]);
    expect(resolveBatchMock.mock.calls.map(([venues]) => venues.length)).toEqual([100, 100, 5]);
    expect(panel.findAll('input[aria-label^="Nombre de la sala"]')).toHaveLength(205);
  });

  it("prevents concurrent submissions while a batch request is pending", async () => {
    let finishFirst!: (value: unknown) => void;
    batchMock.mockReturnValueOnce(
      new Promise((resolve) => {
        finishFirst = resolve;
      })
    );
    const panel = await readyPanel();
    await setLocation(panel);
    await panel
      .get('input[aria-label="Nombre de la sala, fila 1"]')
      .setValue("Sala para reintento");
    const importButton = panel
      .findAll("button")
      .find((candidate) => candidate.classes().includes("bg-rv-navy"))!.element;
    await importRows(panel);
    await flushPromises();
    expect(importButton.disabled).toBe(true);
    await importRows(panel);
    expect(resolveMock).toHaveBeenCalledTimes(1);

    finishFirst({
      summary: { total: 1, created: 1, existing: 0, duplicates: 0, failed: 0 },
      results: [{ index: 0, name: "Sala para reintento", status: "created", venueId: "retry-id" }],
    });
    await flushPromises();
    expect(importButton.disabled).toBe(false);
    expect(panel.get('input[aria-label="Nombre de la sala, fila 1"]').element.value).toBe(
      "Sala para reintento"
    );
  });

  it("keeps rows after a failed request and resolves the locality again on retry", async () => {
    batchMock.mockRejectedValueOnce(new Error("Servicio no disponible"));
    const panel = await readyPanel();
    await setLocation(panel);
    await panel.get('input[aria-label="Nombre de la sala, fila 1"]').setValue("Sala reintentable");
    await importRows(panel);
    await flushPromises();
    expect(panel.text()).toContain("Conservamos las filas");
    expect(panel.get('input[aria-label="Nombre de la sala, fila 1"]').element.value).toBe(
      "Sala reintentable"
    );

    await importRows(panel);
    await flushPromises();
    expect(resolveMock).toHaveBeenCalledTimes(2);
    expect(batchMock).toHaveBeenCalledTimes(2);
    expect(panel.text()).toContain("Creada");
  });
});
