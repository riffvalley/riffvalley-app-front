// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { nextTick } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EventsFestivalsImportView from "./EventsFestivalsImportView.vue";

const {
  resolveArtistsBatchMock,
  searchVenueNamesMock,
  inspectLocalitiesMock,
  inspectToursMock,
  resolveVenuesMock,
  countriesMock,
  regionsMock,
} = vi.hoisted(() => ({
  resolveArtistsBatchMock: vi.fn(),
  searchVenueNamesMock: vi.fn(),
  inspectLocalitiesMock: vi.fn(),
  inspectToursMock: vi.fn(),
  resolveVenuesMock: vi.fn(),
  countriesMock: vi.fn(),
  regionsMock: vi.fn(),
}));
vi.mock("../../api/artistResolution", () => ({ resolveArtistsBatch: resolveArtistsBatchMock }));
vi.mock("../../api/entityResolution", () => ({
  inspectLocalitiesBatch: inspectLocalitiesMock,
  inspectToursBatch: inspectToursMock,
}));
vi.mock("@/modules/venues", () => ({
  resolveVenueBatch: resolveVenuesMock,
  getVenueImportCountries: countriesMock,
  getAdministrativeRegions: regionsMock,
  venueCatalogCountriesQueryKey: ["venues", "import", "countries"],
  venueCatalogRegionsQueryKey: (countryId: string) => ["venues", "import", "regions", countryId],
}));

const allowedCountries = [
  ["ES", "España"],
  ["PT", "Portugal"],
  ["FR", "Francia"],
  ["DE", "Alemania"],
  ["GB", "Reino Unido"],
  ["BE", "Bélgica"],
  ["NL", "Países Bajos"],
  ["IT", "Italia"],
].map(([isoCode, name]) => ({ id: `country-${isoCode}`, isoCode, name }));

function mountImportView() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return mount(EventsFestivalsImportView, {
    global: { plugins: [[VueQueryPlugin, { queryClient }]] },
  });
}

async function paste(input: HTMLInputElement, text: string) {
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", { value: { getData: () => text } });
  input.dispatchEvent(event);
  await nextTick();
}

describe("EventsFestivalsImportView", () => {
  beforeEach(() => {
    resolveArtistsBatchMock.mockReset().mockImplementation(async (names: string[]) =>
      names.map((name, index) => ({
        index,
        name,
        status: name === "Banda Desconocida" ? "new" : "existing",
        artist:
          name === "Banda Desconocida" ? null : { id: `id-${name}`, name: `${name} Canonical` },
        candidates: [],
      }))
    );
    searchVenueNamesMock.mockReset().mockResolvedValue([]);
    inspectLocalitiesMock
      .mockReset()
      .mockImplementation(
        async ({
          localities,
        }: {
          localities: Array<{ name: string; countryId: string; province?: string }>;
        }) => ({
          results: localities.map((input, index) => ({
            index,
            input,
            status: "existing",
            locality: {
              id: "locality-1",
              name: input.name,
              province: input.province ?? null,
              country: { id: input.countryId, name: "España" },
              administrativeRegion: { id: "region-1", name: "Cataluña" },
            },
            candidates: [],
          })),
        })
      );
    inspectToursMock.mockReset().mockImplementation(async ({ names }: { names: string[] }) => ({
      results: names.map((name, index) => ({ index, name, status: "new", candidates: [] })),
    }));
    resolveVenuesMock
      .mockReset()
      .mockImplementation(async (venues: Array<{ name: string; localityId: string }>) =>
        venues.map((input, index) => ({
          index,
          ...input,
          status: "existing",
          venue: { id: "venue-1", name: input.name },
          candidates: [{ id: "venue-1", name: input.name }],
        }))
      );
    countriesMock.mockReset().mockResolvedValue(allowedCountries);
    regionsMock.mockReset().mockResolvedValue([]);
  });

  it("renders the requested editable columns in order", async () => {
    const wrapper = mountImportView();
    await flushPromises();
    const headers = wrapper.findAll("th[scope='col']").map((header) => header.text());

    expect(wrapper.get("h1").text()).toBe("Importador de conciertos y festivales");
    expect(headers.slice(1, 11)).toEqual([
      "Type",
      "Event / Name",
      "Lineup",
      "Start Date",
      "End Date (opcional)",
      "Venue",
      "Price (opcional)",
      "Other Info (opcional)",
      "City",
      "Province (opcional)",
    ]);
    expect(headers).not.toContain("Artista / Evento");
    expect(headers).not.toContain("Festival Lineup");
    expect(wrapper.findAll("tbody input")).toHaveLength(45);
    expect(wrapper.findAll("tbody select")).toHaveLength(5);
    expect(wrapper.get<HTMLSelectElement>('select[aria-label="Type, fila 1"]').element.value).toBe(
      "concert"
    );
    expect(wrapper.get('select[aria-label="Type, fila 1"]').text()).toContain("Concierto");
    expect(wrapper.get('select[aria-label="Type, fila 1"]').text()).toContain("Festival");
    expect(wrapper.get('select[aria-label="Type, fila 1"]').text()).toContain("Tour");
  });

  it("pastes Tour as a type and preserves Name while changing types", async () => {
    const wrapper = mountImportView();
    await flushPromises();
    const type = wrapper.get<HTMLSelectElement>('select[aria-label="Type, fila 1"]');
    await type.setValue("tour");
    const name = wrapper.get<HTMLInputElement>('input[aria-label="Name (gira), fila 1"]');
    await name.setValue("Septicflesh European Tour 2027");
    await type.setValue("festival");
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Event, fila 1"]').element.value).toBe(
      "Septicflesh European Tour 2027"
    );
    await paste(type.element, "tour\nconcert");
    expect(wrapper.get<HTMLSelectElement>('select[aria-label="Type, fila 1"]').element.value).toBe(
      "tour"
    );
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Name (gira), fila 1"]').element.value
    ).toBe("Septicflesh European Tour 2027");
  });

  it("shares a tour lookup and its explicit confirmation across equivalent rows", async () => {
    const wrapper = mountImportView();
    await flushPromises();
    inspectToursMock.mockImplementation(async ({ names }: { names: string[] }) => ({
      results: names.map((name, index) => ({
        index,
        name,
        status: "existing",
        code: "TOUR_CONFIRMATION_REQUIRED",
        entity: { id: "tour-uuid", name: "Septicflesh European Tour 2027" },
        candidates: [],
      })),
    }));
    vi.useFakeTimers();
    for (const rowNumber of [1, 2]) {
      await wrapper
        .get<HTMLSelectElement>(`select[aria-label="Type, fila ${rowNumber}"]`)
        .setValue("tour");
      await wrapper
        .get<HTMLInputElement>(`input[aria-label="Name (gira), fila ${rowNumber}"]`)
        .setValue(
          rowNumber === 1 ? "Septicflesh European Tour 2027" : "  SEPTICFLESH   EUROPEAN TOUR 2027 "
        );
    }
    await vi.advanceTimersByTimeAsync(450);
    await flushPromises();
    expect(inspectToursMock).toHaveBeenCalledTimes(1);
    expect(inspectToursMock).toHaveBeenCalledWith(
      { names: ["Septicflesh European Tour 2027"] },
      expect.anything()
    );
    expect(wrapper.text()).toContain("Gira existente: Septicflesh European Tour 2027");
    const confirmButtons = wrapper
      .findAll("button")
      .filter((button) => button.text() === "Utilizar esta gira");
    await confirmButtons[0]?.trigger("click");
    await nextTick();
    expect(
      wrapper.findAll("span[role='status']").filter((item) => item.text() === "Confirmada")
    ).toHaveLength(2);

    await wrapper
      .get<HTMLInputElement>('input[aria-label="Name (gira), fila 1"]')
      .setValue("Otra gira 2027");
    await nextTick();
    expect(
      wrapper.findAll("span[role='status']").filter((item) => item.text() === "Confirmada")
    ).toHaveLength(1);
    vi.useRealTimers();
  });

  it("keeps ambiguous candidates selectable and makes technical errors retryable", async () => {
    const wrapper = mountImportView();
    await flushPromises();
    inspectToursMock.mockImplementation(async ({ names }: { names: string[] }) => ({
      results: names.map((name, index) =>
        name === "Gira ambigua"
          ? {
              index,
              name,
              status: "ambiguous",
              code: "TOUR_AMBIGUOUS",
              candidates: [
                { id: "tour-a", name: "Gira ambigua A" },
                { id: "tour-b", name: "Gira ambigua B" },
              ],
            }
          : { index, name, status: "invalid", code: "TOUR_NAME_INVALID", candidates: [] }
      ),
    }));
    vi.useFakeTimers();
    for (const [rowNumber, value] of [
      [1, "Gira ambigua"],
      [2, "Nombre inválido"],
    ] as const) {
      await wrapper
        .get<HTMLSelectElement>(`select[aria-label="Type, fila ${rowNumber}"]`)
        .setValue("tour");
      await wrapper
        .get<HTMLInputElement>(`input[aria-label="Name (gira), fila ${rowNumber}"]`)
        .setValue(value);
    }
    await vi.advanceTimersByTimeAsync(450);
    await flushPromises();
    expect(wrapper.text()).toContain("Hay varias candidatas. Elige una gira:");
    expect(wrapper.text()).toContain("Nombre de gira no válido.");
    const candidate = wrapper.get<HTMLSelectElement>(
      'select[aria-label="Candidata de gira, fila 1"]'
    );
    await candidate.setValue("tour-b");
    const confirm = wrapper
      .findAll("button")
      .find((button) => button.text() === "Utilizar esta gira");
    await confirm?.trigger("click");
    expect(wrapper.text()).toContain("Confirmada");
    inspectToursMock
      .mockRejectedValueOnce(new Error("Sin conexión"))
      .mockImplementation(async ({ names }: { names: string[] }) => ({
        results: names.map((name, index) => ({ index, name, status: "new", candidates: [] })),
      }));
    await wrapper.get<HTMLSelectElement>('select[aria-label="Type, fila 3"]').setValue("tour");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Name (gira), fila 3"]')
      .setValue("Gira recuperable");
    await vi.advanceTimersByTimeAsync(450);
    await flushPromises();
    expect(wrapper.text()).toContain("No se pudo resolver la gira: Sin conexión");
    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Reintentar")
      ?.trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("Gira nueva; se preparará para la importación.");
    vi.useRealTimers();
  });

  it("does not apply a stale Tour response and does not resolve Tour for price edits", async () => {
    const wrapper = mountImportView();
    await flushPromises();
    const requests: Array<{
      names: string[];
      resolve: (value: { results: Array<Record<string, unknown>> }) => void;
    }> = [];
    inspectToursMock.mockImplementation(
      ({ names }: { names: string[] }) =>
        new Promise((resolve) => requests.push({ names, resolve }))
    );
    vi.useFakeTimers();
    await wrapper.get<HTMLSelectElement>('select[aria-label="Type, fila 1"]').setValue("tour");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Name (gira), fila 1"]')
      .setValue("Gira antigua");
    await vi.advanceTimersByTimeAsync(450);
    await flushPromises();
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Name (gira), fila 1"]')
      .setValue("Gira actual");
    await vi.advanceTimersByTimeAsync(450);
    await flushPromises();
    expect(requests.map(({ names }) => names)).toEqual([["Gira antigua"], ["Gira actual"]]);
    requests[0]?.resolve({
      results: [
        {
          index: 0,
          name: "Gira antigua",
          status: "existing",
          code: "TOUR_CONFIRMATION_REQUIRED",
          entity: { id: "old-id", name: "Gira antigua" },
          candidates: [],
        },
      ],
    });
    await flushPromises();
    requests[1]?.resolve({
      results: [{ index: 0, name: "Gira actual", status: "new", candidates: [] }],
    });
    await flushPromises();
    expect(wrapper.text()).toContain("Gira nueva; se preparará para la importación.");
    expect(wrapper.text()).not.toContain("Gira existente: Gira antigua");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Price, fila 1 (opcional)"]')
      .setValue("25 €");
    await vi.advanceTimersByTimeAsync(900);
    expect(inspectToursMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("selects Spain by its backend UUID and lists only available allowed countries in configured order", async () => {
    countriesMock.mockResolvedValueOnce([
      { id: "country-IT", isoCode: "IT", name: "Italia" },
      { id: "country-TR", isoCode: "TR", name: "Turquía" },
      { id: "country-ES", isoCode: "ES", name: "Spain localized" },
      { id: "country-PT", isoCode: "PT", name: "Portugal" },
      { id: "country-GR", isoCode: "GR", name: "Grecia" },
      { id: "country-GB", isoCode: "GB", name: "United Kingdom" },
      { id: "country-RU", isoCode: "RU", name: "Rusia" },
    ]);
    const wrapper = mountImportView();
    await flushPromises();
    const country = wrapper.get<HTMLSelectElement>("#event-import-country");

    expect(country.element.value).toBe("country-ES");
    expect(Array.from(country.element.options).map(({ text }) => text)).toEqual([
      "España",
      "Portugal",
      "Reino Unido",
      "Italia",
    ]);
    expect(country.element.options[0]?.value).toBe("country-ES");
    expect(wrapper.text()).not.toContain("Grecia");
    expect(wrapper.text()).not.toContain("Turquía");
    expect(wrapper.text()).not.toContain("Rusia");
  });

  it("keeps the user's country selection and all row text when country context changes", async () => {
    const wrapper = mountImportView();
    await flushPromises();
    await wrapper.get<HTMLInputElement>('input[aria-label="Event, fila 1"]').setValue("Festival");
    await wrapper.get<HTMLInputElement>('input[aria-label="Venue, fila 1"]').setValue("Sala Norte");
    await wrapper.get<HTMLInputElement>('input[aria-label="City, fila 1"]').setValue("Lisboa");
    await wrapper.get<HTMLInputElement>('input[aria-label="Province, fila 1"]').setValue("Lisboa");

    const country = wrapper.get<HTMLSelectElement>("#event-import-country");
    await country.setValue("country-PT");
    await flushPromises();

    expect(country.element.value).toBe("country-PT");
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Event, fila 1"]').element.value).toBe(
      "Festival"
    );
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Venue, fila 1"]').element.value).toBe(
      "Sala Norte"
    );
    expect(wrapper.get<HTMLInputElement>('input[aria-label="City, fila 1"]').element.value).toBe(
      "Lisboa"
    );
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Province, fila 1"]').element.value
    ).toBe("Lisboa");
  });

  it("shows an unavailable Spain configuration without selecting a fabricated country ID", async () => {
    countriesMock.mockResolvedValueOnce([{ id: "country-PT", isoCode: "PT", name: "Portugal" }]);
    const wrapper = mountImportView();
    await flushPromises();

    expect(wrapper.get<HTMLSelectElement>("#event-import-country").element.value).toBe("");
    expect(wrapper.text()).toContain("España (ES)");
    expect(wrapper.get<HTMLSelectElement>("#event-import-country").text()).toContain("Portugal");
  });

  it("shows loading without reporting the country catalog missing before it resolves", async () => {
    let finishCatalog: ((countries: typeof allowedCountries) => void) | undefined;
    countriesMock.mockReturnValueOnce(
      new Promise((resolve) => {
        finishCatalog = resolve;
      })
    );
    const wrapper = mountImportView();

    expect(wrapper.find('[role="status"]').text()).toContain("Cargando catálogo");
    expect(wrapper.text()).not.toContain("No están disponibles en el catálogo");
    finishCatalog?.(allowedCountries);
    await flushPromises();
    expect(wrapper.get<HTMLSelectElement>("#event-import-country").element.value).toBe(
      "country-ES"
    );
  });

  it("shows a recoverable catalog error and allows retry", async () => {
    countriesMock.mockRejectedValueOnce(new Error("catalog unavailable"));
    const wrapper = mountImportView();
    await flushPromises();

    expect(wrapper.find('[role="alert"]').text()).toContain("No se pudo cargar el catálogo");
    await wrapper.get("button").trigger("click");
    await flushPromises();

    expect(countriesMock).toHaveBeenCalledTimes(2);
    expect(wrapper.get<HTMLSelectElement>("#event-import-country").element.value).toBe(
      "country-ES"
    );
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it("changes Type independently per row and retains it while editing other cells", async () => {
    const wrapper = mountImportView();
    const firstType = wrapper.get<HTMLSelectElement>('select[aria-label="Type, fila 1"]');
    const secondType = wrapper.get<HTMLSelectElement>('select[aria-label="Type, fila 2"]');

    await firstType.setValue("festival");
    await wrapper.get<HTMLInputElement>('input[aria-label="Event, fila 1"]').setValue("Festival A");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Price, fila 1 (opcional)"]')
      .setValue("25€");

    expect(firstType.element.value).toBe("festival");
    expect(secondType.element.value).toBe("concert");
    expect(wrapper.get('select[aria-label="Type, fila 1"]').element.value).toBe("festival");
  });

  it("adjusts the total number of rows with the numeric control", async () => {
    const wrapper = mountImportView();
    const rowCount = wrapper.get<HTMLInputElement>('input[aria-label="Número de filas"]');

    expect(rowCount.element.value).toBe("5");
    await rowCount.setValue("3");
    expect(wrapper.findAll("tbody tr")).toHaveLength(3);
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Número de filas"]').element.value).toBe(
      "3"
    );

    await wrapper.get<HTMLInputElement>('input[aria-label="Número de filas"]').setValue("6");
    expect(wrapper.findAll("tbody tr")).toHaveLength(6);
    expect(wrapper.get<HTMLSelectElement>('select[aria-label="Type, fila 6"]').element.value).toBe(
      "concert"
    );

    await wrapper.get<HTMLInputElement>('input[aria-label="Número de filas"]').setValue("0");
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Número de filas"]').element.value).toBe(
      "0"
    );
    expect(wrapper.text()).toContain("No hay filas");
  });

  it("pastes valid Type values case-insensitively, warns on invalid values, and preserves rows and fields", async () => {
    const wrapper = mountImportView();
    const firstType = wrapper.get<HTMLSelectElement>('select[aria-label="Type, fila 1"]');
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Event, fila 1"]')
      .setValue("Evento previo");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Event, fila 2"]')
      .setValue("Otro evento");
    await wrapper.get<HTMLInputElement>('input[aria-label="City, fila 1"]').setValue("Madrid");
    await wrapper.get<HTMLSelectElement>('select[aria-label="Type, fila 3"]').setValue("festival");

    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", {
      value: { getData: () => "Concierto\nFestIval\nINVALID\nconcert\nFESTIVAL\nFestival" },
    });
    firstType.element.dispatchEvent(event);
    await nextTick();

    expect(wrapper.get<HTMLSelectElement>('select[aria-label="Type, fila 1"]').element.value).toBe(
      "concert"
    );
    expect(wrapper.get<HTMLSelectElement>('select[aria-label="Type, fila 2"]').element.value).toBe(
      "festival"
    );
    expect(wrapper.get<HTMLSelectElement>('select[aria-label="Type, fila 3"]').element.value).toBe(
      "festival"
    );
    expect(wrapper.get('select[aria-label="Type, fila 3"]').attributes("aria-invalid")).toBe(
      "true"
    );
    expect(wrapper.text()).toContain("Tipo inválido «INVALID»");
    expect(wrapper.get<HTMLSelectElement>('select[aria-label="Type, fila 4"]').element.value).toBe(
      "concert"
    );
    expect(wrapper.get<HTMLSelectElement>('select[aria-label="Type, fila 5"]').element.value).toBe(
      "festival"
    );
    expect(wrapper.get<HTMLSelectElement>('select[aria-label="Type, fila 6"]').element.value).toBe(
      "festival"
    );
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Event, fila 1"]').element.value).toBe(
      "Evento previo"
    );
    expect(wrapper.get<HTMLInputElement>('input[aria-label="City, fila 1"]').element.value).toBe(
      "Madrid"
    );
  });

  it("edits Price and Other Info independently as optional free text", async () => {
    const wrapper = mountImportView();
    const price = wrapper.get<HTMLInputElement>('input[aria-label="Price, fila 1 (opcional)"]');
    const otherInfo = wrapper.get<HTMLInputElement>(
      'input[aria-label="Other Info, fila 1 (opcional)"]'
    );

    expect(price.element.value).toBe("");
    expect(otherInfo.element.value).toBe("");
    await price.setValue("20€ anticipada / 25€ taquilla");
    await otherInfo.setValue("Apertura de puertas 19:30; entrada por la calle lateral");
    await price.setValue("");

    expect(price.element.value).toBe("");
    expect(otherInfo.element.value).toBe("Apertura de puertas 19:30; entrada por la calle lateral");
    expect(price.attributes("required")).toBeUndefined();
    expect(otherInfo.attributes("required")).toBeUndefined();
  });

  it("pastes Price and Other Info ranges across rows, retaining blank cells and other columns", async () => {
    const wrapper = mountImportView();
    const price = wrapper.get<HTMLInputElement>('input[aria-label="Price, fila 1 (opcional)"]');
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Price, fila 1 (opcional)"]')
      .setValue("old price");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Other Info, fila 1 (opcional)"]')
      .setValue("old info");
    await wrapper.get<HTMLInputElement>('input[aria-label="City, fila 2"]').setValue("Santander");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Province, fila 3"]')
      .setValue("Cantabria");

    await paste(price.element, "Desde 49,50€\tApertura 18:00\n\tSolo mayores de edad\nGratis\t");

    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Price, fila 1 (opcional)"]').element.value
    ).toBe("Desde 49,50€");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Other Info, fila 1 (opcional)"]').element
        .value
    ).toBe("Apertura 18:00");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Price, fila 2 (opcional)"]').element.value
    ).toBe("");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Other Info, fila 2 (opcional)"]').element
        .value
    ).toBe("Solo mayores de edad");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Price, fila 3 (opcional)"]').element.value
    ).toBe("Gratis");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Other Info, fila 3 (opcional)"]').element
        .value
    ).toBe("");
    expect(wrapper.get<HTMLInputElement>('input[aria-label="City, fila 2"]').element.value).toBe(
      "Santander"
    );
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Province, fila 3"]').element.value
    ).toBe("Cantabria");
  });

  it("pastes multiple Other Info rows without touching Price or later columns", async () => {
    const wrapper = mountImportView();
    const otherInfo = wrapper.get<HTMLInputElement>(
      'input[aria-label="Other Info, fila 5 (opcional)"]'
    );
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Price, fila 5 (opcional)"]')
      .setValue("35€");
    await wrapper.get<HTMLInputElement>('input[aria-label="City, fila 5"]').setValue("Bilbao");

    await paste(otherInfo.element, "Acceso por puerta norte\n\nAforo limitado\nÚltima fila");

    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Other Info, fila 5 (opcional)"]').element
        .value
    ).toBe("Acceso por puerta norte");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Other Info, fila 6 (opcional)"]').element
        .value
    ).toBe("");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Other Info, fila 7 (opcional)"]').element
        .value
    ).toBe("Aforo limitado");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Other Info, fila 8 (opcional)"]').element
        .value
    ).toBe("Última fila");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Price, fila 5 (opcional)"]').element.value
    ).toBe("35€");
    expect(wrapper.get<HTMLInputElement>('input[aria-label="City, fila 5"]').element.value).toBe(
      "Bilbao"
    );
  });

  it("edits and normalizes a date, allows an optional end date, and validates date order", async () => {
    const wrapper = mountImportView();
    const start = wrapper.get<HTMLInputElement>('input[aria-label="Start Date, fila 1"]');
    const end = wrapper.get<HTMLInputElement>('input[aria-label="End Date, fila 1 (opcional)"]');

    expect(end.element.value).toBe("");
    await start.setValue("3/2/2026");
    expect(start.element.value).toBe("03/02/2026");
    await end.setValue("02/02/2026");
    expect(wrapper.text()).toContain("End Date no puede ser anterior a Start Date.");
    await end.setValue("3/2/2026");
    expect(end.element.value).toBe("03/02/2026");
    expect(wrapper.text()).not.toContain("End Date no puede ser anterior a Start Date.");
    await end.setValue("");
    expect(end.element.value).toBe("");
  });

  it("keeps invalid date text editable and shows a cell error", async () => {
    const wrapper = mountImportView();
    const start = wrapper.get<HTMLInputElement>('input[aria-label="Start Date, fila 1"]');
    await start.setValue("29/02/2026");
    expect(start.element.value).toBe("29/02/2026");
    expect(start.attributes("aria-invalid")).toBe("true");
    expect(wrapper.text()).toContain("Usa una fecha válida en formato DD/MM/YYYY.");
  });

  it("pastes one date and a two-column multirow range, preserving blanks and other data", async () => {
    const wrapper = mountImportView();
    const start = wrapper.get<HTMLInputElement>('input[aria-label="Start Date, fila 1"]');
    await wrapper.get<HTMLInputElement>('input[aria-label="Event, fila 1"]').setValue("Fila uno");
    await wrapper.get<HTMLInputElement>('input[aria-label="Venue, fila 1"]').setValue("Sala uno");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Start Date, fila 4"]')
      .setValue("01/10/2026");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="End Date, fila 4 (opcional)"]')
      .setValue("02/10/2026");
    await paste(start.element, "3/2/2026");
    expect(start.element.value).toBe("03/02/2026");

    await paste(start.element, "3/2/2026\t\n12/6/2026\t14/6/2026\n25/9/2026\t26/9/2026");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Start Date, fila 1"]').element.value
    ).toBe("03/02/2026");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="End Date, fila 1 (opcional)"]').element.value
    ).toBe("");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Start Date, fila 2"]').element.value
    ).toBe("12/06/2026");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="End Date, fila 2 (opcional)"]').element.value
    ).toBe("14/06/2026");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Start Date, fila 3"]').element.value
    ).toBe("25/09/2026");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="End Date, fila 3 (opcional)"]').element.value
    ).toBe("26/09/2026");
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Event, fila 1"]').element.value).toBe(
      "Fila uno"
    );
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Venue, fila 1"]').element.value).toBe(
      "Sala uno"
    );
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Start Date, fila 4"]').element.value
    ).toBe("01/10/2026");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="End Date, fila 4 (opcional)"]').element.value
    ).toBe("02/10/2026");
  });

  it("adds rows when a pasted date range extends beyond the existing table", async () => {
    const wrapper = mountImportView();
    const startRow5 = wrapper.get<HTMLInputElement>('input[aria-label="Start Date, fila 5"]');
    await paste(startRow5.element, "3/2/2026\t4/2/2026\n5/2/2026\t6/2/2026");

    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Start Date, fila 6"]').element.value
    ).toBe("05/02/2026");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="End Date, fila 6 (opcional)"]').element.value
    ).toBe("06/02/2026");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Start Date, fila 5"]').element.value
    ).toBe("03/02/2026");
  });

  it("pastes a single column only into its starting date field and leaves later rows untouched", async () => {
    const wrapper = mountImportView();
    const endRow2 = wrapper.get<HTMLInputElement>(
      'input[aria-label="End Date, fila 2 (opcional)"]'
    );
    await paste(endRow2.element, "12/6/2026\n14/6/2026");
    expect(endRow2.element.value).toBe("12/06/2026");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Start Date, fila 2"]').element.value
    ).toBe("");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="End Date, fila 3 (opcional)"]').element.value
    ).toBe("14/06/2026");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Start Date, fila 4"]').element.value
    ).toBe("");
  });

  it("resolves Locality before Venue while keeping City, Province and entered Venue text", async () => {
    const wrapper = mountImportView();
    await flushPromises();
    vi.useFakeTimers();
    await wrapper.get<HTMLInputElement>('input[aria-label="City, fila 1"]').setValue("Barcelona");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Province, fila 1"]')
      .setValue("Barcelona");
    const venueInput = wrapper.get<HTMLInputElement>('input[aria-label="Venue, fila 1"]');
    await venueInput.setValue("  Sala Apolo  ");
    await venueInput.trigger("blur");
    await vi.advanceTimersByTimeAsync(1350);
    await flushPromises();

    expect(inspectLocalitiesMock).toHaveBeenCalledTimes(1);
    expect(resolveVenuesMock).toHaveBeenCalledWith(
      [{ name: "  Sala Apolo  ", localityId: "locality-1" }],
      expect.anything()
    );
    expect(searchVenueNamesMock).not.toHaveBeenCalled();
    expect(wrapper.find('button[aria-label="Editar   Sala Apolo  , Venue fila 1"]').exists()).toBe(
      true
    );
    expect(wrapper.get<HTMLInputElement>('input[aria-label="City, fila 1"]').element.value).toBe(
      "Barcelona"
    );
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Province, fila 1"]').element.value
    ).toBe("Barcelona");

    await wrapper.get<HTMLInputElement>('input[aria-label="City, fila 1"]').setValue("Girona");
    await wrapper.get<HTMLInputElement>('input[aria-label="Province, fila 1"]').setValue("Girona");
    expect(wrapper.get<HTMLInputElement>('input[aria-label="City, fila 1"]').element.value).toBe(
      "Girona"
    );
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Province, fila 1"]').element.value
    ).toBe("Girona");
    vi.useRealTimers();
  });

  it("edits Event and Lineup independently and allows Event to stay empty", async () => {
    const wrapper = mountImportView();
    const firstEvent = wrapper.get<HTMLInputElement>('input[aria-label="Event, fila 1"]');
    const firstLineup = wrapper.get<HTMLInputElement>(
      'input[aria-label="Añadir artistas a Lineup, fila 1"]'
    );

    await firstEvent.setValue("Resurrection Fest 2027");
    await firstLineup.setValue("Electric Callboy + Bury Tomorrow + Wargasm");
    await firstEvent.setValue("");

    expect(firstEvent.element.value).toBe("");
    expect(firstEvent.attributes("required")).toBeUndefined();
    expect(firstLineup.element.value).toBe("Electric Callboy + Bury Tomorrow + Wargasm");
  });

  it("adds blank rows and deletes one without losing other rows", async () => {
    const wrapper = mountImportView();
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Event, fila 1"]')
      .setValue("Gira XX Aniversario");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Añadir artistas a Lineup, fila 1"]')
      .setValue("Machine Head");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Price, fila 1 (opcional)"]')
      .setValue("35€");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Other Info, fila 1 (opcional)"]')
      .setValue("Anticipada online");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Event, fila 2"]')
      .setValue("Download Festival Madrid");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Añadir artistas a Lineup, fila 2"]')
      .setValue("Architects + Spiritbox");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Price, fila 2 (opcional)"]')
      .setValue("Gratis");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Other Info, fila 2 (opcional)"]')
      .setValue("Aforo limitado");
    await wrapper.get("button").trigger("click");

    expect(wrapper.get<HTMLInputElement>('input[aria-label="Event, fila 6"]').element.value).toBe(
      ""
    );
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Price, fila 6 (opcional)"]').element.value
    ).toBe("");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Añadir artistas a Lineup, fila 6"]').element
        .value
    ).toBe("");

    await wrapper.get("button[aria-label='Eliminar fila 1']").trigger("click");
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Event, fila 1"]').element.value).toBe(
      "Download Festival Madrid"
    );
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Añadir artistas a Lineup, fila 1"]').element
        .value
    ).toBe("Architects + Spiritbox");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Price, fila 1 (opcional)"]').element.value
    ).toBe("Gratis");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Other Info, fila 1 (opcional)"]').element
        .value
    ).toBe("Aforo limitado");
  });

  it("renders resolved artists as pills and leaves unknown artists editable", async () => {
    const wrapper = mountImportView();
    const lineupInput = wrapper.get<HTMLInputElement>(
      'input[aria-label="Añadir artistas a Lineup, fila 1"]'
    );
    await lineupInput.setValue("Architects + Spiritbox + Banda Desconocida");
    await lineupInput.trigger("blur");
    await flushPromises();

    expect(wrapper.find('button[aria-label="Editar Architects"]').exists()).toBe(true);
    expect(wrapper.find('button[aria-label="Editar Spiritbox"]').exists()).toBe(true);
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Artista 3 de Lineup, fila 1"]').element.value
    ).toBe("Banda Desconocida");
    expect(wrapper.text()).toContain("Architects");
    expect(wrapper.text()).toContain("Spiritbox");

    const addArtistInput = wrapper.get<HTMLInputElement>(
      'input[aria-label="Añadir artistas a Lineup, fila 1"]'
    );
    await addArtistInput.setValue("Loathe");
    await addArtistInput.trigger("blur");
    await flushPromises();
    expect(wrapper.find('button[aria-label="Editar Loathe"]').exists()).toBe(true);

    await wrapper.get('button[aria-label="Editar Architects"]').trigger("click");
    const editArtistInput = wrapper.get<HTMLInputElement>(
      'input[aria-label="Artista 1 de Lineup, fila 1"]'
    );
    await editArtistInput.setValue("Altered Band");
    await editArtistInput.trigger("blur");
    await flushPromises();
    expect(wrapper.find('button[aria-label="Editar Altered Band"]').exists()).toBe(true);

    await wrapper
      .get('button[aria-label="Eliminar Altered Band de Lineup, fila 1"]')
      .trigger("click");
    expect(wrapper.find('button[aria-label="Editar Altered Band"]').exists()).toBe(false);
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Artista 2 de Lineup, fila 1"]').element.value
    ).toBe("Banda Desconocida");
  });

  it("allows clearing cells and removing the last rows", async () => {
    const wrapper = mountImportView();
    const eventInput = wrapper.get<HTMLInputElement>('input[aria-label="Event, fila 1"]');
    const lineupInput = wrapper.get<HTMLInputElement>(
      'input[aria-label="Añadir artistas a Lineup, fila 1"]'
    );

    await eventInput.setValue("Texto temporal");
    await lineupInput.setValue("Artista temporal");
    await eventInput.setValue("");
    await lineupInput.setValue("");
    expect(eventInput.element.value).toBe("");
    expect(lineupInput.element.value).toBe("");

    for (let index = 0; index < 5; index += 1) {
      await wrapper.get("button[aria-label='Eliminar fila 1']").trigger("click");
    }
    expect(wrapper.findAll("tbody input")).toHaveLength(0);
    expect(wrapper.text()).toContain("No hay filas");
  });
});
