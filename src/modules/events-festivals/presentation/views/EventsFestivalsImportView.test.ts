// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EventsFestivalsImportView from "./EventsFestivalsImportView.vue";
import scrapedEvents from "../../application/__fixtures__/scraped-events-v1.json?raw";
import { SCRAPED_EVENT_JSON_MAX_BYTES } from "../../application/scrapedEventJson";
import EventImportTable from "../components/EventImportTable.vue";
import LineupCell from "../components/LineupCell.vue";
import type { ImportBatchResponse } from "../../api/eventImport";
import type { ImportSnapshot } from "../../application/eventImportPreparation";
import {
  localityResolutionFixtures,
  venueResolutionFixtures,
} from "../../api/__fixtures__/entityResolutionFixtures";

const {
  resolveArtistsBatchMock,
  searchVenueNamesMock,
  inspectLocalitiesMock,
  inspectToursMock,
  resolveVenuesMock,
  countriesMock,
  regionsMock,
  importEventBatchMock,
  apiPostMock,
  useRealImportBatchApi,
  confirmDiscardMock,
  sessionGetMock,
  sessionSaveMock,
  sessionDeleteMock,
} = vi.hoisted(() => ({
  resolveArtistsBatchMock: vi.fn(),
  searchVenueNamesMock: vi.fn(),
  inspectLocalitiesMock: vi.fn(),
  inspectToursMock: vi.fn(),
  resolveVenuesMock: vi.fn(),
  countriesMock: vi.fn(),
  regionsMock: vi.fn(),
  importEventBatchMock: vi.fn(),
  apiPostMock: vi.fn(),
  useRealImportBatchApi: { value: false },
  confirmDiscardMock: vi.fn(),
  sessionGetMock: vi.fn(),
  sessionSaveMock: vi.fn(),
  sessionDeleteMock: vi.fn(),
}));
vi.mock("@/services/swal/SwalService", () => ({ default: { confirm: confirmDiscardMock } }));
vi.mock("@/services/api/api", () => ({
  default: { get: vi.fn().mockResolvedValue({ data: {} }), post: apiPostMock },
}));
vi.mock("@/modules/identity/auth", () => ({
  useAuthStore: () => ({
    authStatus: "authenticated",
    userId: "123e4567-e89b-42d3-a456-426614174099",
  }),
}));
vi.mock("../../infrastructure/eventImportSessionStorage", () => ({
  deleteEventImportSession: sessionDeleteMock,
  EVENT_IMPORT_SESSION_FORMAT_VERSION: 1,
  EventImportSessionStorageError: class EventImportSessionStorageError extends Error {},
  getEventImportSession: sessionGetMock,
  saveEventImportSession: sessionSaveMock,
}));
vi.mock("../../api/eventImport", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../api/eventImport")>();
  return {
    ...original,
    importEventBatch: (snapshot: ImportSnapshot) =>
      useRealImportBatchApi.value
        ? original.importEventBatch(snapshot)
        : importEventBatchMock(snapshot),
  };
});
vi.mock("../../api/artistResolution", () => ({ resolveArtistsBatch: resolveArtistsBatchMock }));
vi.mock("../../api/entityResolution", () => ({
  inspectLocalitiesBatch: inspectLocalitiesMock,
  inspectToursBatch: inspectToursMock,
}));
vi.mock("@/modules/venues", () => ({
  resolveVenueBatch: resolveVenuesMock,
  getVenueImportCountries: countriesMock,
  getAdministrativeRegions: regionsMock,
  venueCatalogQueryKey: ["venues", "catalog"],
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

const mountedViews: Array<{ wrapper: ReturnType<typeof mount>; queryClient: QueryClient }> = [];

async function mountImportView(attachTo?: HTMLElement, startAtLoad = false) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = mount(EventsFestivalsImportView, {
    attachTo,
    global: { plugins: [[VueQueryPlugin, { queryClient }]] },
  });
  mountedViews.push({ wrapper, queryClient });
  await flushPromises();
  if (startAtLoad) {
    await selectImportMode(wrapper, "JSON de scraping");
  }
  return wrapper;
}

async function openImportStage(wrapper: ReturnType<typeof mount>) {
  if (!wrapper.find('nav[aria-label="Etapas de importación"]').exists()) return;
  const continueButton = wrapper
    .findAll("button")
    .find((button) => button.text().includes("Revisar confirmación de importación"));
  if (continueButton?.exists() && !continueButton.element.disabled) {
    await continueButton.trigger("click");
  } else {
    await navigateImportStageInView(wrapper, "Importar y resultados");
  }
  await nextTick();
}

async function selectImportMode(
  wrapper: ReturnType<typeof mount>,
  mode: "Manual" | "JSON de scraping"
) {
  await wrapper
    .findAll("button")
    .find((button) => button.text() === mode)!
    .trigger("click");
  await flushPromises();
  await nextTick();
}

async function navigateImportStageInView(wrapper: ReturnType<typeof mount>, label: string) {
  if (!wrapper.find('nav[aria-label="Etapas de importación"]').exists()) return;
  const step = wrapper
    .get('nav[aria-label="Etapas de importación"]')
    .findAll("button")
    .find((button) => button.text().includes(label));
  if (step?.exists() && !step.element.disabled) await step.trigger("click");
  await nextTick();
}

async function paste(input: HTMLInputElement, text: string) {
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", { value: { getData: () => text } });
  input.dispatchEvent(event);
  await nextTick();
}

async function discardRow(wrapper: ReturnType<typeof mount>, rowNumber: number) {
  await wrapper
    .get<HTMLInputElement>(`input[aria-label="Seleccionar fila ${rowNumber} para descartar"]`)
    .setValue(true);
  await wrapper.get('button[aria-label="Descartar seleccionadas"]').trigger("click");
  await flushPromises();
}

async function enterArtist(wrapper: ReturnType<typeof mount>, rowNumber: number) {
  const input = wrapper.get<HTMLInputElement>(
    `input[aria-label="Añadir artistas a Lineup (obligatorio), fila ${rowNumber}"]`
  );
  const ownsFakeTimers = !vi.isFakeTimers();
  if (ownsFakeTimers) vi.useFakeTimers();
  await paste(input.element, `Artista ${rowNumber}`);
  await vi.advanceTimersByTimeAsync(450);
  await flushPromises();
  if (ownsFakeTimers) vi.useRealTimers();
}

describe("EventsFestivalsImportView", () => {
  afterEach(() => {
    mountedViews.splice(0).forEach(({ wrapper, queryClient }) => {
      wrapper.unmount();
      queryClient.clear();
    });
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  beforeEach(() => {
    sessionGetMock.mockReset().mockResolvedValue(null);
    sessionSaveMock.mockReset().mockResolvedValue("123e4567-e89b-42d3-a456-426614174099");
    sessionDeleteMock.mockReset().mockResolvedValue(undefined);
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
              id: "123e4567-e89b-42d3-a456-426614174004",
              name: input.name,
              province: input.province ?? null,
              country: { id: input.countryId, name: "España" },
              administrativeRegion: {
                id: "123e4567-e89b-42d3-a456-426614174001",
                name: "Cataluña",
              },
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
          venue: { id: "123e4567-e89b-42d3-a456-426614174005", name: input.name },
          candidates: [{ id: "123e4567-e89b-42d3-a456-426614174005", name: input.name }],
        }))
      );
    countriesMock.mockReset().mockResolvedValue(allowedCountries);
    regionsMock.mockReset().mockResolvedValue([]);
    importEventBatchMock.mockReset();
    apiPostMock.mockReset();
    useRealImportBatchApi.value = false;
    confirmDiscardMock.mockReset().mockResolvedValue({ isConfirmed: true });
  });

  it("opens directly in the manual editor and scopes the four stages to JSON", async () => {
    const wrapper = await mountImportView();
    expect(wrapper.find("table").exists()).toBe(true);
    expect(wrapper.find('nav[aria-label="Etapas de importación"]').exists()).toBe(false);

    await selectImportMode(wrapper, "JSON de scraping");
    const steps = wrapper.get('nav[aria-label="Etapas de importación"]');
    expect(steps.find('[aria-current="step"]').text()).toContain("Cargar archivo");
    expect(wrapper.find('input[aria-label="Seleccionar archivo JSON de eventos"]').exists()).toBe(
      true
    );
    expect(wrapper.find("table").exists()).toBe(false);
    expect(
      steps.findAll("button").find((button) => button.text().includes("Resolver y analizar"))
        ?.element.disabled
    ).toBe(true);
    expect(
      steps
        .findAll("button")
        .find((button) => button.text().includes("Resolver y analizar"))
        ?.attributes("aria-description")
    ).toContain("Carga y valida un archivo JSON");

    await selectImportMode(wrapper, "Manual");
    expect(wrapper.find('nav[aria-label="Etapas de importación"]').exists()).toBe(false);
    expect(wrapper.find("table").exists()).toBe(true);
    expect(resolveArtistsBatchMock).not.toHaveBeenCalled();
    expect(inspectLocalitiesMock).not.toHaveBeenCalled();
    expect(resolveVenuesMock).not.toHaveBeenCalled();
    expect(inspectToursMock).not.toHaveBeenCalled();
    expect(importEventBatchMock).not.toHaveBeenCalled();

    expect(wrapper.find("table").exists()).toBe(true);
    expect(importEventBatchMock).not.toHaveBeenCalled();
  });

  it("keeps manual and JSON rows in separate workspaces without repeating resolution on mode switches", async () => {
    countriesMock.mockResolvedValueOnce(
      allowedCountries.map((country, index) => ({
        ...country,
        id:
          country.isoCode === "ES"
            ? "123e4567-e89b-42d3-a456-426614174000"
            : country.isoCode === "PT"
              ? "123e4567-e89b-42d3-a456-426614174001"
              : `123e4567-e89b-42d3-a456-${String(index + 2).padStart(12, "0")}`,
      }))
    );
    resolveArtistsBatchMock.mockImplementation(async (names: string[]) =>
      names.map((name, index) => ({
        index,
        name,
        status: "existing",
        artist: {
          id: `123e4567-e89b-42d3-a456-${String(index + 1).padStart(12, "0")}`,
          name,
        },
      }))
    );
    const wrapper = await mountImportView();
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Evento, fila 1"]')
      .setValue("Solo manual");
    await wrapper
      .get<HTMLSelectElement>("#event-import-country")
      .setValue("123e4567-e89b-42d3-a456-426614174001");
    confirmDiscardMock.mockResolvedValueOnce({ isConfirmed: false });
    await selectImportMode(wrapper, "JSON de scraping");
    expect(wrapper.find('nav[aria-label="Etapas de importación"]').exists()).toBe(false);
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Evento, fila 1"]').element.value).toBe(
      "Solo manual"
    );
    await selectImportMode(wrapper, "JSON de scraping");

    expect(confirmDiscardMock).toHaveBeenCalledWith(
      "Cambiar modo de importación",
      expect.stringContaining("se conservarán separados"),
      "Cambiar de modo",
      "Seguir aquí"
    );
    expect(wrapper.find("table").exists()).toBe(false);
    await wrapper
      .get<HTMLSelectElement>("#event-import-country")
      .setValue("123e4567-e89b-42d3-a456-426614174000");
    expect(wrapper.find('input[aria-label="Seleccionar archivo JSON de eventos"]').exists()).toBe(
      true
    );

    const file = new File([scrapedEvents], "events.json", { type: "application/json" });
    const fileInput = wrapper.get<HTMLInputElement>(
      'input[aria-label="Seleccionar archivo JSON de eventos"]'
    );
    Object.defineProperty(fileInput.element, "files", { configurable: true, value: [file] });
    await fileInput.trigger("change");
    await flushPromises();
    vi.useFakeTimers();
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Analizar y resolver eventos"))!
      .trigger("click");
    await vi.advanceTimersByTimeAsync(1350);
    await flushPromises();
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Todos"))!
      .trigger("click");
    const resolverCalls = [
      resolveArtistsBatchMock.mock.calls.length,
      inspectLocalitiesMock.mock.calls.length,
      resolveVenuesMock.mock.calls.length,
      inspectToursMock.mock.calls.length,
    ];
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Evento, fila 1"]').element.value
    ).not.toBe("Solo manual");

    await selectImportMode(wrapper, "Manual");
    expect(wrapper.find('nav[aria-label="Etapas de importación"]').exists()).toBe(false);
    expect(wrapper.get<HTMLSelectElement>("#event-import-country").element.value).toBe(
      "123e4567-e89b-42d3-a456-426614174001"
    );
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Evento, fila 1"]').element.value).toBe(
      "Solo manual"
    );
    expect(wrapper.text()).not.toContain("Festival de verano");
    expect([
      resolveArtistsBatchMock.mock.calls.length,
      inspectLocalitiesMock.mock.calls.length,
      resolveVenuesMock.mock.calls.length,
      inspectToursMock.mock.calls.length,
    ]).toEqual(resolverCalls);

    await selectImportMode(wrapper, "JSON de scraping");
    expect(wrapper.get<HTMLSelectElement>("#event-import-country").element.value).toBe(
      "123e4567-e89b-42d3-a456-426614174000"
    );
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Evento, fila 2"]').element.value).toBe(
      "Festival de verano"
    );
    expect([
      resolveArtistsBatchMock.mock.calls.length,
      inspectLocalitiesMock.mock.calls.length,
      resolveVenuesMock.mock.calls.length,
      inspectToursMock.mock.calls.length,
    ]).toEqual(resolverCalls);
    expect(importEventBatchMock).not.toHaveBeenCalled();
    const savedRecord = sessionSaveMock.mock.calls.at(-1)?.[0] as
      { payload?: { activeMode?: string; modeWorkspaces?: Record<string, unknown> } } | undefined;
    expect(savedRecord?.payload?.modeWorkspaces?.manual).toBeDefined();
    expect(savedRecord?.payload?.activeMode).toBe("json");
    expect(
      (
        savedRecord?.payload?.modeWorkspaces?.manual as {
          state?: { rows?: Array<{ event: string }> };
        }
      ).state?.rows?.[0]?.event
    ).toBe("Solo manual");
    wrapper.unmount();
    vi.useRealTimers();

    countriesMock.mockResolvedValueOnce(
      allowedCountries.map((country, index) => ({
        ...country,
        id:
          country.isoCode === "ES"
            ? "123e4567-e89b-42d3-a456-426614174000"
            : country.isoCode === "PT"
              ? "123e4567-e89b-42d3-a456-426614174001"
              : `123e4567-e89b-42d3-a456-${String(index + 2).padStart(12, "0")}`,
      }))
    );
    sessionGetMock.mockResolvedValueOnce(savedRecord);
    const resumed = await mountImportView();
    expect(resumed.text()).toContain("Tienes una sesión incompleta");
    vi.useFakeTimers();
    await resumed
      .findAll("button")
      .find((button) => button.text().includes("Recuperar sesión"))!
      .trigger("click");
    await vi.advanceTimersByTimeAsync(1350);
    await flushPromises();
    await resumed
      .findAll("button")
      .find((button) => button.text().includes("Todos"))!
      .trigger("click");
    expect(
      resumed.get('nav[aria-label="Etapas de importación"] [aria-current="step"]').text()
    ).toContain("Revisar eventos");
    await selectImportMode(resumed, "Manual");
    expect(resumed.get<HTMLInputElement>('input[aria-label="Evento, fila 1"]').element.value).toBe(
      "Solo manual"
    );
    resumed.unmount();
    vi.useRealTimers();
  }, 30_000);

  it("keeps a valid JSON file on the load stage when its country cannot be resolved", async () => {
    countriesMock.mockResolvedValueOnce(allowedCountries.filter(({ isoCode }) => isoCode !== "ES"));
    const wrapper = await mountImportView(undefined, true);
    const file = new File([scrapedEvents], "events.json", { type: "application/json" });
    const fileInput = wrapper.get<HTMLInputElement>(
      'input[aria-label="Seleccionar archivo JSON de eventos"]'
    );
    Object.defineProperty(fileInput.element, "files", { configurable: true, value: [file] });
    await fileInput.trigger("change");
    await flushPromises();

    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Analizar y resolver eventos"))!
      .trigger("click");

    expect(
      wrapper.get('nav[aria-label="Etapas de importación"] [aria-current="step"]').text()
    ).toContain("Cargar archivo");
    expect(wrapper.get('[role="alert"]').text()).toContain("no coincide con el catálogo");
    expect(resolveArtistsBatchMock).not.toHaveBeenCalled();
    expect(inspectLocalitiesMock).not.toHaveBeenCalled();
    expect(importEventBatchMock).not.toHaveBeenCalled();
  });

  it("summarizes file metadata and event types for a valid JSON without entering the row preview", async () => {
    const wrapper = await mountImportView(undefined, true);
    const file = new File([scrapedEvents], "conciertos-y-festivales.json", {
      type: "application/json",
    });
    const fileInput = wrapper.get<HTMLInputElement>(
      'input[aria-label="Seleccionar archivo JSON de eventos"]'
    );
    Object.defineProperty(fileInput.element, "files", { configurable: true, value: [file] });
    await fileInput.trigger("change");
    await flushPromises();

    const summary = wrapper.get('[aria-label="Resumen del archivo JSON"]');
    expect(summary.text()).toContain("conciertos-y-festivales.json");
    expect(summary.text()).toContain("JSON válido");
    expect(summary.text()).toContain("6 eventos");
    expect(summary.text()).toContain("5 conciertos");
    expect(summary.text()).toContain("1 festivales");
    expect(summary.text()).toContain("País del archivo: ES");
    expect(summary.text()).toContain("País seleccionado: España");
    expect(wrapper.find("details[open]").exists()).toBe(false);
    wrapper.unmount();
  });

  it("keeps an invalid selected file visible with a recoverable validation message", async () => {
    const wrapper = await mountImportView(undefined, true);
    const file = new File(["{"], "rota.json", { type: "application/json" });
    const fileInput = wrapper.get<HTMLInputElement>(
      'input[aria-label="Seleccionar archivo JSON de eventos"]'
    );
    Object.defineProperty(fileInput.element, "files", { configurable: true, value: [file] });
    await fileInput.trigger("change");
    await flushPromises();

    const summary = wrapper.get('[aria-label="Resumen del archivo JSON"]');
    expect(summary.text()).toContain("rota.json");
    expect(summary.text()).toContain("JSON no válido");
    expect(summary.text()).toContain("El archivo no contiene un JSON válido");
    expect(
      wrapper.get('input[aria-label="Seleccionar archivo JSON de eventos"]').element.disabled
    ).toBe(false);
    wrapper.unmount();
  });

  it("summarizes a 600-event file without rendering six hundred preview rows", async () => {
    const largeJson = JSON.stringify({
      format: "riffvalley.events-import",
      version: 1,
      source: { name: "fixture" },
      country: "ES",
      events: Array.from({ length: 600 }, (_, index) => ({
        type: index % 20 === 0 ? "festival" : "concert",
        title: `Evento ${index + 1}`,
        startDate: "2027-06-12",
        artists: [`Artista ${index + 1}`],
        locality: "Santander",
      })),
    });
    const wrapper = await mountImportView(undefined, true);
    const file = new File([largeJson], "eventos-600.json", { type: "application/json" });
    const fileInput = wrapper.get<HTMLInputElement>(
      'input[aria-label="Seleccionar archivo JSON de eventos"]'
    );
    Object.defineProperty(fileInput.element, "files", { configurable: true, value: [file] });
    await fileInput.trigger("change");
    await flushPromises();

    const summary = wrapper.get('[aria-label="Resumen del archivo JSON"]');
    expect(summary.text()).toContain("600 eventos");
    expect(summary.text()).toContain("570 conciertos");
    expect(summary.text()).toContain("30 festivales");
    expect(wrapper.findAll('[aria-label="Previsualización de eventos JSON"] li')).toHaveLength(5);
    wrapper.unmount();
  }, 30_000);

  it("keeps parsed rows and resolved references while navigating back and forward without repeating lookups", async () => {
    countriesMock.mockResolvedValueOnce(
      allowedCountries.map((country) =>
        country.isoCode === "ES"
          ? { ...country, id: "123e4567-e89b-42d3-a456-426614174000" }
          : country
      )
    );
    const wrapper = await mountImportView(undefined, true);
    const file = new File([scrapedEvents], "events.json", { type: "application/json" });
    const fileInput = wrapper.get<HTMLInputElement>(
      'input[aria-label="Seleccionar archivo JSON de eventos"]'
    );
    Object.defineProperty(fileInput.element, "files", { configurable: true, value: [file] });
    await fileInput.trigger("change");
    await flushPromises();

    vi.useFakeTimers();
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Analizar y resolver eventos"))!
      .trigger("click");
    await vi.advanceTimersByTimeAsync(1350);
    await flushPromises();
    expect(
      wrapper
        .findAll("button")
        .find((button) => button.text().includes("Inválidos"))
        ?.attributes("aria-pressed")
    ).toBe("true");
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Todos"))!
      .trigger("click");
    expect(
      wrapper.get('nav[aria-label="Etapas de importación"] [aria-current="step"]').text()
    ).toContain("Revisar eventos");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Evento, fila 1"]')
      .setValue("Título editado");
    const resolverCalls = [
      resolveArtistsBatchMock.mock.calls.length,
      inspectLocalitiesMock.mock.calls.length,
      resolveVenuesMock.mock.calls.length,
      inspectToursMock.mock.calls.length,
    ];

    await navigateImportStageInView(wrapper, "Cargar archivo");
    expect(wrapper.get('ul[aria-label="Previsualización de eventos JSON"]').exists()).toBe(true);
    await navigateImportStageInView(wrapper, "Resolver y analizar");
    expect(wrapper.text()).toContain("Análisis completado");
    expect(wrapper.text()).toContain("Preparación y validación");
    expect(wrapper.text()).toContain("Completada");
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Revisar eventos"))!
      .trigger("click");
    await nextTick();

    expect(wrapper.get<HTMLInputElement>('input[aria-label="Evento, fila 1"]').element.value).toBe(
      "Título editado"
    );
    expect(wrapper.text()).toContain("Localidad seleccionada");
    expect([
      resolveArtistsBatchMock.mock.calls.length,
      inspectLocalitiesMock.mock.calls.length,
      resolveVenuesMock.mock.calls.length,
      inspectToursMock.mock.calls.length,
    ]).toEqual(resolverCalls);
    expect(importEventBatchMock).not.toHaveBeenCalled();
  });

  it("renders an editor containing 600 draft rows", async () => {
    const wrapper = await mountImportView();
    await flushPromises();
    await wrapper.get<HTMLInputElement>('input[aria-label="Número de filas"]').setValue("600");
    await nextTick();

    expect(wrapper.findAll("tbody tr[id^='event-import-row-']")).toHaveLength(600);
    wrapper.unmount();
  }, 30_000);

  it("renders the requested editable columns in order", async () => {
    const wrapper = await mountImportView();
    await flushPromises();
    const headers = wrapper.findAll("th[scope='col']").map((header) => header.text());

    expect(wrapper.get("h1").text()).toBe("Importador de conciertos, festivales y giras");
    expect(headers.slice(2, 12)).toEqual([
      "Tipo",
      "Nombre del evento",
      "Artistas / Lineup *obligatorio",
      "Fecha de inicio",
      "Fecha de fin (opcional)",
      "Ciudad",
      "Provincia (opcional)",
      "Recinto",
      "Precio (opcional)",
      "Otra información (opcional)",
    ]);
    expect(headers).not.toContain("Artista / Evento");
    expect(headers).not.toContain("Festival Lineup");
    expect(wrapper.findAll('tbody input:not([type="checkbox"])')).toHaveLength(45);
    expect(wrapper.findAll("tbody select")).toHaveLength(5);
    expect(wrapper.get<HTMLSelectElement>('select[aria-label="Tipo, fila 1"]').element.value).toBe(
      "concert"
    );
    expect(wrapper.get('select[aria-label="Tipo, fila 1"]').text()).toContain("Concierto");
    expect(wrapper.get('select[aria-label="Tipo, fila 1"]').text()).toContain("Festival");
    expect(wrapper.get('select[aria-label="Tipo, fila 1"]').text()).toContain("Tour");
  });

  it("groups global actions, exposes disabled states, and omits per-row trash controls", async () => {
    countriesMock.mockResolvedValueOnce(
      allowedCountries.map((country) =>
        country.isoCode === "ES"
          ? { ...country, id: "123e4567-e89b-42d3-a456-426614174000" }
          : country
      )
    );
    const wrapper = await mountImportView();
    await flushPromises();
    const actions = wrapper.get('[role="group"][aria-label="Acciones de revisión"]');
    const continueButton = actions.get("button");
    const discardButton = actions.get('button[aria-label="Descartar seleccionadas"]');

    expect(continueButton.element.disabled).toBe(true);
    expect(wrapper.find('button[aria-label="Importar filas listas"]').exists()).toBe(true);
    expect(wrapper.get('button[aria-label="Importar filas listas"]').element.disabled).toBe(true);
    expect(discardButton.element.disabled).toBe(true);
    expect(wrapper.find('button[aria-label^="Descartar fila "]').exists()).toBe(false);
    expect(wrapper.findAll("thead th[scope='col']")).toHaveLength(12);
    expect(wrapper.get('[role="status"][aria-live="polite"]').text()).toMatch(
      /Guardado|Cambios pendientes|Guardando…/u
    );

    const unlabeledControls = wrapper.findAll("input, select").filter((control) => {
      if (control.attributes("aria-label") || control.attributes("aria-labelledby")) return false;
      const id = control.attributes("id");
      return !id || !wrapper.find(`label[for="${id}"]`).exists();
    });
    expect(unlabeledControls).toHaveLength(0);
    const accessibleLabels = wrapper
      .findAll("[aria-label]")
      .map((control) => control.attributes("aria-label"))
      .join(" ");
    expect(accessibleLabels).not.toMatch(/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}/iu);

    vi.useFakeTimers();
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Fecha de inicio, fila 1"]')
      .setValue("15/05/2027");
    await wrapper.get<HTMLInputElement>('input[aria-label="Ciudad, fila 1"]').setValue("Madrid");
    await vi.advanceTimersByTimeAsync(1350);
    await flushPromises();
    expect(continueButton.element.disabled).toBe(true);
    expect(wrapper.text()).toContain("faltan artistas");
    await wrapper.get('input[aria-label="Seleccionar fila 1 para descartar"]').setValue(true);
    expect(discardButton.element.disabled).toBe(false);
  });

  it("places a concise row status in an associated subrow and hides validation for empty rows", async () => {
    const wrapper = await mountImportView();
    await flushPromises();

    expect(wrapper.findAll("tbody tr[id^='event-import-status-']")).toHaveLength(0);
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Fecha de inicio, fila 1"]')
      .setValue("fecha inválida");
    await flushPromises();

    const row = wrapper.get("#event-import-row-event-row-1");
    const statusId = row.attributes("aria-describedby");
    expect(statusId).toBe("event-import-status-event-row-1");
    const statusRow = wrapper.get(`#${statusId}`);
    expect(statusRow.text()).toContain("Pendiente");
    expect(statusRow.find("td").attributes("colspan")).toBe("12");
    expect(row.findAll("td")[2]?.text()).not.toContain("Pendiente");
    expect(statusRow.find("details").exists()).toBe(true);
  });

  it("removes a created row after correlating the backend result to its sent snapshot", async () => {
    countriesMock.mockResolvedValueOnce(
      allowedCountries.map((country) =>
        country.isoCode === "ES"
          ? { ...country, id: "123e4567-e89b-42d3-a456-426614174000" }
          : country
      )
    );
    const wrapper = await mountImportView();
    await flushPromises();
    vi.useFakeTimers();
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Fecha de inicio, fila 1"]')
      .setValue("15/05/2027");
    await wrapper.get<HTMLInputElement>('input[aria-label="Ciudad, fila 1"]').setValue("Madrid");
    await enterArtist(wrapper, 1);
    await vi.advanceTimersByTimeAsync(1350);
    await flushPromises();
    importEventBatchMock.mockImplementationOnce(async (snapshot) => ({
      batchId: snapshot.batchId,
      results: snapshot.rows.map((row) => ({
        operationRowId: row.operationRowId,
        rowKey: row.rowKey,
        revision: row.revision,
        result: { rowId: row.operationRowId, status: "created", eventId: "event-created-1" },
      })),
    }));

    await openImportStage(wrapper);
    const importButton = wrapper
      .findAll("button")
      .find((button) => button.text().includes("Importar filas listas"));
    expect(importButton?.element.disabled, wrapper.text()).toBe(false);
    await importButton?.trigger("click");
    await flushPromises();

    expect(importEventBatchMock).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain("Importación finalizada · 1 evento importado");
    expect(wrapper.find("table").exists()).toBe(true);
    await navigateImportStageInView(wrapper, "Revisar eventos");
    expect(wrapper.findAll("tbody tr"), wrapper.text()).toHaveLength(4);
    await navigateImportStageInView(wrapper, "Importar y resultados");
    expect(wrapper.text()).toContain("Importación finalizada · 1 evento importado");
    expect(importEventBatchMock).toHaveBeenCalledTimes(1);
    expect(
      wrapper
        .findAll(
          '[aria-label="Confirmación, progreso y resultados de importación"] [role="status"]'
        )
        .some((status) => status.text().includes("Importación finalizada"))
    ).toBe(true);
    expect(wrapper.text()).not.toContain("0 conflictos");
    expect(wrapper.text()).not.toContain("0 filas inválidas");
    wrapper.unmount();
    vi.useRealTimers();
  });

  it("omits unchanged events from pending rows and exposes their result detail separately", async () => {
    countriesMock.mockResolvedValueOnce(
      allowedCountries.map((country) =>
        country.isoCode === "ES"
          ? { ...country, id: "123e4567-e89b-42d3-a456-426614174000" }
          : country
      )
    );
    const wrapper = await mountImportView();
    await flushPromises();
    vi.useFakeTimers();
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Fecha de inicio, fila 1"]')
      .setValue("15/05/2027");
    await wrapper.get<HTMLInputElement>('input[aria-label="Ciudad, fila 1"]').setValue("Madrid");
    await enterArtist(wrapper, 1);
    await vi.advanceTimersByTimeAsync(1350);
    await flushPromises();
    importEventBatchMock.mockImplementationOnce(async (snapshot) => ({
      batchId: snapshot.batchId,
      results: snapshot.rows.map((row) => ({
        operationRowId: row.operationRowId,
        rowKey: row.rowKey,
        revision: row.revision,
        result: { rowId: row.operationRowId, status: "unchanged", eventId: "existing-event" },
      })),
    }));

    await openImportStage(wrapper);

    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Importar filas listas"))!
      .trigger("click");
    await flushPromises();

    expect(importEventBatchMock).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain("Importación finalizada · 1 evento omitido");
    expect(wrapper.text()).toContain("Ver eventos omitidos (1)");
    expect(wrapper.text()).not.toContain("conflicto");
    expect(wrapper.text()).not.toContain("evento importado");
    expect(wrapper.find("details").text()).toContain("Madrid");
    await navigateImportStageInView(wrapper, "Revisar eventos");
    expect(wrapper.findAll("tbody tr")).toHaveLength(4);
    wrapper.unmount();
    vi.useRealTimers();
  });

  it("retries a known failed row with the same idempotency keys", async () => {
    countriesMock.mockResolvedValueOnce(
      allowedCountries.map((country) =>
        country.isoCode === "ES"
          ? { ...country, id: "123e4567-e89b-42d3-a456-426614174000" }
          : country
      )
    );
    const wrapper = await mountImportView();
    await flushPromises();
    vi.useFakeTimers();
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Fecha de inicio, fila 1"]')
      .setValue("15/05/2027");
    await wrapper.get<HTMLInputElement>('input[aria-label="Ciudad, fila 1"]').setValue("Madrid");
    await enterArtist(wrapper, 1);
    await vi.advanceTimersByTimeAsync(1350);
    await flushPromises();
    importEventBatchMock
      .mockImplementationOnce(async (snapshot) => ({
        batchId: snapshot.batchId,
        results: snapshot.rows.map((row) => ({
          operationRowId: row.operationRowId,
          rowKey: row.rowKey,
          revision: row.revision,
          result: { rowId: row.operationRowId, status: "failed", code: "temporary" },
        })),
      }))
      .mockImplementationOnce(async (snapshot) => ({
        batchId: snapshot.batchId,
        results: snapshot.rows.map((row) => ({
          operationRowId: row.operationRowId,
          rowKey: row.rowKey,
          revision: row.revision,
          result: { rowId: row.operationRowId, status: "created", eventId: "event-retried" },
        })),
      }));

    const importButton = () =>
      wrapper.findAll("button").find((button) => button.text().includes("Importar filas listas"))!;
    await openImportStage(wrapper);
    await importButton().trigger("click");
    await flushPromises();
    const failedSnapshot = importEventBatchMock.mock.calls[0]?.[0];
    await navigateImportStageInView(wrapper, "Revisar eventos");
    await openImportStage(wrapper);
    await importButton().trigger("click");
    await flushPromises();

    expect(importEventBatchMock).toHaveBeenCalledTimes(2);
    expect(importEventBatchMock.mock.calls[1]?.[0].batchId).toBe(failedSnapshot?.batchId);
    expect(importEventBatchMock.mock.calls[1]?.[0].rows[0]?.operationRowId).toBe(
      failedSnapshot?.rows[0]?.operationRowId
    );
    expect(wrapper.text()).toContain("1 evento importado");
    await navigateImportStageInView(wrapper, "Revisar eventos");
    expect(wrapper.findAll("tbody tr")).toHaveLength(4);
    wrapper.unmount();
    vi.useRealTimers();
  });

  it("stops a multi-batch import after the active HTTP response", async () => {
    countriesMock.mockResolvedValueOnce(
      allowedCountries.map((country) =>
        country.isoCode === "ES"
          ? { ...country, id: "123e4567-e89b-42d3-a456-426614174000" }
          : country
      )
    );
    const wrapper = await mountImportView();
    await flushPromises();
    vi.useFakeTimers();
    await wrapper.get<HTMLInputElement>('input[aria-label="Número de filas"]').setValue("51");
    await paste(
      wrapper.get<HTMLInputElement>('input[aria-label="Fecha de inicio, fila 1"]').element,
      Array.from({ length: 51 }, () => "15/05/2027").join("\n")
    );
    wrapper.findAll<HTMLInputElement>('input[aria-label^="Ciudad, fila "]').forEach((input) => {
      input.element.value = "Madrid";
      input.element.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await nextTick();
    await paste(
      wrapper.get<HTMLInputElement>(
        'input[aria-label="Añadir artistas a Lineup (obligatorio), fila 1"]'
      ).element,
      Array.from({ length: 51 }, (_, index) => `Artista ${index + 1}`).join("\n")
    );
    await vi.advanceTimersByTimeAsync(1350);
    await flushPromises();

    let resolveBatch!: (response: ImportBatchResponse) => void;
    let requestedSnapshot: ImportSnapshot | undefined;
    importEventBatchMock.mockImplementationOnce((snapshot) => {
      requestedSnapshot = snapshot;
      return new Promise((resolve) => {
        resolveBatch = resolve;
      });
    });
    await openImportStage(wrapper);
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Importar filas listas"))!
      .trigger("click");
    await flushPromises();
    expect(importEventBatchMock).toHaveBeenCalledTimes(1);
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Detener después del lote actual"))!
      .trigger("click");
    expect(wrapper.text()).toContain("La importación se detendrá");

    resolveBatch({
      batchId: requestedSnapshot!.batchId,
      results: requestedSnapshot!.rows.map((row) => ({
        operationRowId: row.operationRowId,
        rowKey: row.rowKey,
        revision: row.revision,
        result: { rowId: row.operationRowId, status: "created", eventId: "created-event" },
      })),
    });
    await flushPromises();

    expect(importEventBatchMock).toHaveBeenCalledTimes(1);
    await navigateImportStageInView(wrapper, "Revisar eventos");
    expect(wrapper.find('input[aria-label="Evento, fila 1"]').exists()).toBe(true);
    wrapper.unmount();
    vi.useRealTimers();
  }, 30_000);

  it("stops later batches when the backend marks the remainder as an infrastructure failure", async () => {
    countriesMock.mockResolvedValueOnce(
      allowedCountries.map((country) =>
        country.isoCode === "ES"
          ? { ...country, id: "123e4567-e89b-42d3-a456-426614174000" }
          : country
      )
    );
    const wrapper = await mountImportView();
    await flushPromises();
    vi.useFakeTimers();
    await wrapper.get<HTMLInputElement>('input[aria-label="Número de filas"]').setValue("51");
    await paste(
      wrapper.get<HTMLInputElement>('input[aria-label="Fecha de inicio, fila 1"]').element,
      Array.from({ length: 51 }, () => "15/05/2027").join("\n")
    );
    wrapper.findAll<HTMLInputElement>('input[aria-label^="Ciudad, fila "]').forEach((input) => {
      input.element.value = "Madrid";
      input.element.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await nextTick();
    await paste(
      wrapper.get<HTMLInputElement>(
        'input[aria-label="Añadir artistas a Lineup (obligatorio), fila 1"]'
      ).element,
      Array.from({ length: 51 }, () => "Artista compartida").join("\n")
    );
    await vi.advanceTimersByTimeAsync(1350);
    await flushPromises();
    importEventBatchMock.mockImplementationOnce(async (snapshot) => ({
      batchId: snapshot.batchId,
      results: snapshot.rows.map((row, index) => ({
        operationRowId: row.operationRowId,
        rowKey: row.rowKey,
        revision: row.revision,
        result: {
          rowId: row.operationRowId,
          status: "failed",
          code: index === 0 ? "IMPORT_ROW_FAILED" : "IMPORT_PREFLIGHT_FAILED",
          message:
            index === 0 ? "Infrastructure failure" : "Batch stopped after infrastructure failure",
        },
      })),
    }));

    await openImportStage(wrapper);
    await wrapper.get('button[aria-label="Importar filas listas"]').trigger("click");
    await flushPromises();

    expect(importEventBatchMock).toHaveBeenCalledTimes(1);
    expect(importEventBatchMock.mock.calls[0]?.[0].rows).toHaveLength(50);
    expect(wrapper.text()).toContain("Importación finalizada · 50 filas fallidas");
    await navigateImportStageInView(wrapper, "Revisar eventos");
    expect(wrapper.get('input[aria-label="Evento, fila 1"]').exists()).toBe(true);
    expect(wrapper.get('input[aria-label="Evento, fila 51"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain("IMPORT_PREFLIGHT_FAILED");
    wrapper.unmount();
    vi.useRealTimers();
  }, 30_000);

  it("pastes 51 concert rows and automatically sends the next batch after the first response", async () => {
    countriesMock.mockResolvedValueOnce(
      allowedCountries.map((country) =>
        country.isoCode === "ES"
          ? { ...country, id: "123e4567-e89b-42d3-a456-426614174000" }
          : country
      )
    );
    const wrapper = await mountImportView();
    await flushPromises();
    vi.useFakeTimers();

    await wrapper.get<HTMLInputElement>('input[aria-label="Número de filas"]').setValue("51");
    await paste(
      wrapper.get<HTMLInputElement>('input[aria-label="Fecha de inicio, fila 1"]').element,
      Array.from({ length: 51 }, () => "15/05/2027").join("\n")
    );
    wrapper.findAll<HTMLInputElement>('input[aria-label^="Ciudad, fila "]').forEach((input) => {
      input.element.value = "Madrid";
      input.element.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await nextTick();
    await paste(
      wrapper.get<HTMLInputElement>(
        'input[aria-label="Añadir artistas a Lineup (obligatorio), fila 1"]'
      ).element,
      Array.from({ length: 51 }, (_, index) => `Artista ${index + 1}`).join("\n")
    );
    await vi.advanceTimersByTimeAsync(1350);
    await flushPromises();

    expect(resolveArtistsBatchMock).toHaveBeenCalledWith(
      Array.from({ length: 51 }, (_, index) => `Artista ${index + 1}`),
      expect.anything()
    );
    expect(wrapper.text()).toContain("máximo de 50 filas por operación");
    importEventBatchMock
      .mockImplementationOnce(async (snapshot) => ({
        batchId: snapshot.batchId,
        results: snapshot.rows.map((row, index) => ({
          operationRowId: row.operationRowId,
          rowKey: row.rowKey,
          revision: row.revision,
          result:
            index < 48
              ? { rowId: row.operationRowId, status: "created", eventId: `event-${index}` }
              : index === 48
                ? { rowId: row.operationRowId, status: "conflict", code: "CONCERT_DUPLICATE" }
                : { rowId: row.operationRowId, status: "failed", code: "IMPORT_ROW_FAILED" },
        })),
      }))
      .mockImplementationOnce(async (snapshot) => ({
        batchId: snapshot.batchId,
        results: snapshot.rows.map((row) => ({
          operationRowId: row.operationRowId,
          rowKey: row.rowKey,
          revision: row.revision,
          result: { rowId: row.operationRowId, status: "created", eventId: "event-51" },
        })),
      }))
      .mockImplementationOnce(async (snapshot) => ({
        batchId: snapshot.batchId,
        results: snapshot.rows.map((row) => ({
          operationRowId: row.operationRowId,
          rowKey: row.rowKey,
          revision: row.revision,
          result: {
            rowId: row.operationRowId,
            status: "failed",
            code: "IMPORT_ROW_FAILED",
            message: "Retry available",
          },
        })),
      }));

    await openImportStage(wrapper);

    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Importar filas listas"))!
      .trigger("click");
    await flushPromises();

    expect(importEventBatchMock).toHaveBeenCalledTimes(2);
    expect(importEventBatchMock.mock.calls[0]?.[0].rows).toHaveLength(50);
    expect(importEventBatchMock.mock.calls[1]?.[0].rows).toHaveLength(1);
    expect(wrapper.text()).toContain("Importación finalizada · 49 eventos importados");
    expect(wrapper.text()).toContain("1 conflicto");
    expect(wrapper.text()).toContain("1 fila fallida");
    await navigateImportStageInView(wrapper, "Revisar eventos");
    expect(wrapper.find('input[aria-label="Evento, fila 1"]').exists()).toBe(true);
    expect(
      wrapper.find('input[aria-label="Añadir artistas a Lineup (obligatorio), fila 2"]').exists()
    ).toBe(true);
    expect(wrapper.text()).not.toContain("Artista 51");
    const originalFirstBatch = importEventBatchMock.mock.calls[0]?.[0];
    await openImportStage(wrapper);
    await wrapper.get('button[aria-label="Importar filas listas"]').trigger("click");
    await flushPromises();
    const partialRetry = importEventBatchMock.mock.calls[2]?.[0];
    expect(partialRetry?.rows).toHaveLength(2);
    expect(partialRetry?.batchId).not.toBe(originalFirstBatch?.batchId);
    expect(partialRetry?.rows.map(({ operationRowId }) => operationRowId)).toEqual(
      originalFirstBatch?.rows.slice(48).map(({ operationRowId }) => operationRowId)
    );
    expect(
      partialRetry?.rows.some(({ operationRowId }) =>
        originalFirstBatch?.rows.slice(0, 48).some((row) => row.operationRowId === operationRowId)
      )
    ).toBe(false);
    wrapper.unmount();
    vi.useRealTimers();
  }, 30_000);

  it("records repeatable 50-row importer interaction timings without time thresholds", async () => {
    countriesMock.mockResolvedValueOnce(
      allowedCountries.map((country, index) => ({
        ...country,
        id: `123e4567-e89b-42d3-a456-4266141740${String(index).padStart(2, "0")}`,
      }))
    );
    const measurements: Record<string, number> = {};
    const tableRender = vi.spyOn(EventImportTable, "render");
    const lineupRender = vi.spyOn(LineupCell, "render");
    const elapsed = async (name: string, action: () => Promise<void>) => {
      const startedAt = performance.now();
      await action();
      measurements[name] = Number((performance.now() - startedAt).toFixed(1));
    };

    const mountStartedAt = performance.now();
    const wrapper = await mountImportView();
    await flushPromises();
    measurements.mountInitialFive = Number((performance.now() - mountStartedAt).toFixed(1));
    await wrapper
      .get<HTMLSelectElement>("#event-import-country")
      .setValue("123e4567-e89b-42d3-a456-426614174000");

    await elapsed("expandToFiftyRows", async () => {
      await wrapper.get<HTMLInputElement>('input[aria-label="Número de filas"]').setValue("50");
      await nextTick();
    });
    await elapsed("pasteFiftyConcertDates", async () => {
      await paste(
        wrapper.get<HTMLInputElement>('input[aria-label="Fecha de inicio, fila 1"]').element,
        Array.from({ length: 50 }, () => "15/05/2027").join("\n")
      );
    });
    vi.useFakeTimers();
    await elapsed("editFiftyCities", async () => {
      wrapper.findAll<HTMLInputElement>('input[aria-label^="Ciudad, fila "]').forEach((input) => {
        input.element.value = "Madrid";
        input.element.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await nextTick();
    });

    await elapsed("resolveFiftyLocalities", async () => {
      await vi.advanceTimersByTimeAsync(450);
      await flushPromises();
    });
    await elapsed("changeCountryAndReresolveFiftyLocalities", async () => {
      await wrapper
        .get<HTMLSelectElement>("#event-import-country")
        .setValue("123e4567-e89b-42d3-a456-426614174001");
      await vi.advanceTimersByTimeAsync(450);
      await flushPromises();
    });
    await elapsed("pasteFiftyLineupsThreeArtistsEach", async () => {
      await paste(
        wrapper.get<HTMLInputElement>(
          'input[aria-label="Añadir artistas a Lineup (obligatorio), fila 1"]'
        ).element,
        Array.from(
          { length: 50 },
          (_, index) => `Artista A${index} + Artista B${index} + Artista C${index}`
        ).join("\n")
      );
      await vi.advanceTimersByTimeAsync(450);
      await flushPromises();
      await nextTick();
    });
    await elapsed("editOneConfirmedArtist", async () => {
      await wrapper.get('button[aria-label="Editar Artista A0"]').trigger("click");
      const artistInput = wrapper.get<HTMLInputElement>(
        'input[aria-label="Artista 1 de Lineup, fila 1"]'
      );
      await artistInput.setValue("Artista A0 editado");
      await artistInput.trigger("blur");
      await flushPromises();
    });
    await elapsed("editReactivePrice", async () => {
      await wrapper
        .get<HTMLInputElement>('input[aria-label="Precio, fila 1 (opcional)"]')
        .setValue("45 €");
    });
    const lineupRendersBeforePriceEdit = lineupRender.mock.calls.length;
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Precio, fila 1 (opcional)"]')
      .setValue("46 €");
    await nextTick();
    measurements.lineupCellRendersAfterUnrelatedPriceEdit =
      lineupRender.mock.calls.length - lineupRendersBeforePriceEdit;
    await elapsed("repeatTwentyReactiveEdits", async () => {
      const price = wrapper.get<HTMLInputElement>('input[aria-label="Precio, fila 1 (opcional)"]');
      const rendersBefore = tableRender.mock.calls.length;
      for (let edit = 0; edit < 20; edit += 1) {
        price.element.value = `${edit} €`;
        price.element.dispatchEvent(new Event("input", { bubbles: true }));
        await nextTick();
      }
      measurements.tableRendersForTwentyPriceEdits = tableRender.mock.calls.length - rendersBefore;
    });

    sessionSaveMock.mockImplementation(async (payload: unknown) => {
      structuredClone(payload);
      return "123e4567-e89b-42d3-a456-426614174099";
    });
    await elapsed("autosaveIndexedDbPayloadWithStructuredClone", async () => {
      await nextTick();
      await vi.advanceTimersByTimeAsync(30_000);
      await flushPromises();
    });
    expect(sessionSaveMock).toHaveBeenCalled();

    importEventBatchMock.mockImplementationOnce(async (snapshot) => ({
      batchId: snapshot.batchId,
      results: snapshot.rows.map((row, index) => ({
        operationRowId: row.operationRowId,
        rowKey: row.rowKey,
        revision: row.revision,
        result:
          index === 0
            ? { rowId: row.operationRowId, status: "conflict", code: "CONCERT_DUPLICATE" }
            : { rowId: row.operationRowId, status: "created", eventId: `event-${index}` },
      })),
    }));
    await elapsed("prepareSnapshotSaveAndImportFiftyRows", async () => {
      await openImportStage(wrapper);
      await wrapper.get('button[aria-label="Importar filas listas"]').trigger("click");
      await flushPromises();
    });
    vi.useRealTimers();

    await navigateImportStageInView(wrapper, "Revisar eventos");
    expect(wrapper.findAll('tbody > tr[id^="event-import-row-"]')).toHaveLength(1);
    expect(resolveArtistsBatchMock).toHaveBeenCalledTimes(3);
    expect(resolveArtistsBatchMock.mock.calls.map(([names]) => names.length)).toEqual([100, 50, 1]);
    console.info(
      "EVENT_IMPORT_LOCALITY_BATCHES",
      JSON.stringify(inspectLocalitiesMock.mock.calls.map(([request]) => request))
    );
    expect(inspectLocalitiesMock).toHaveBeenCalledTimes(2);
    expect(importEventBatchMock).toHaveBeenCalledTimes(1);
    expect(importEventBatchMock.mock.calls[0]?.[0].rows).toHaveLength(50);
    console.info("EVENT_IMPORT_PERFORMANCE_BASELINE", JSON.stringify(measurements));
  }, 30_000);

  it("cleans pending artist, locality, and autosave timers when the editor unmounts", async () => {
    countriesMock.mockResolvedValueOnce(
      allowedCountries.map((country, index) => ({
        ...country,
        id: `123e4567-e89b-42d3-a456-4266141740${String(index).padStart(2, "0")}`,
      }))
    );
    vi.useFakeTimers();
    const wrapper = await mountImportView();
    await flushPromises();
    await wrapper.get<HTMLInputElement>('input[aria-label="Ciudad, fila 1"]').setValue("Madrid");
    const lineup = wrapper.get<HTMLInputElement>(
      'input[aria-label="Añadir artistas a Lineup (obligatorio), fila 1"]'
    );
    await lineup.setValue("Pendiente al cerrar");
    await lineup.trigger("keydown.enter");
    await nextTick();

    wrapper.unmount();
    await vi.advanceTimersByTimeAsync(30_000);
    await flushPromises();

    expect(resolveArtistsBatchMock).not.toHaveBeenCalled();
    expect(inspectLocalitiesMock).not.toHaveBeenCalled();
    expect(sessionSaveMock).not.toHaveBeenCalled();
  });

  it("sends existing and new concert artists with their respective contract identities", async () => {
    countriesMock.mockResolvedValueOnce(
      allowedCountries.map((country) =>
        country.isoCode === "ES"
          ? { ...country, id: "123e4567-e89b-42d3-a456-426614174000" }
          : country
      )
    );
    const wrapper = await mountImportView();
    await flushPromises();
    vi.useFakeTimers();
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Fecha de inicio, fila 1"]')
      .setValue("15/05/2027");
    await wrapper.get<HTMLInputElement>('input[aria-label="Ciudad, fila 1"]').setValue("Madrid");
    await paste(
      wrapper.get<HTMLInputElement>(
        'input[aria-label="Añadir artistas a Lineup (obligatorio), fila 1"]'
      ).element,
      "Architects + Banda Desconocida"
    );
    await vi.advanceTimersByTimeAsync(1350);
    await flushPromises();
    importEventBatchMock.mockImplementationOnce(async (snapshot) => ({
      batchId: snapshot.batchId,
      results: snapshot.rows.map((row) => ({
        operationRowId: row.operationRowId,
        rowKey: row.rowKey,
        revision: row.revision,
        result: { rowId: row.operationRowId, status: "created", eventId: "event-created" },
      })),
    }));

    await openImportStage(wrapper);

    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Importar filas listas"))!
      .trigger("click");
    await flushPromises();

    expect(importEventBatchMock.mock.calls[0]?.[0].payload.rows[0]?.lineup).toEqual([
      { name: "Architects", artistId: "id-Architects" },
      { name: "Banda Desconocida" },
    ]);
    wrapper.unmount();
    vi.useRealTimers();
  });

  it("keeps dates and lineups independent for two concert entries on one Tour", async () => {
    countriesMock.mockResolvedValueOnce(
      allowedCountries.map((country) =>
        country.isoCode === "ES"
          ? { ...country, id: "123e4567-e89b-42d3-a456-426614174000" }
          : country
      )
    );
    const wrapper = await mountImportView();
    await flushPromises();
    vi.useFakeTimers();
    for (const rowNumber of [1, 2]) {
      await wrapper
        .get<HTMLSelectElement>(`select[aria-label="Tipo, fila ${rowNumber}"]`)
        .setValue("tour");
      await wrapper
        .get<HTMLInputElement>(`input[aria-label="Nombre de gira, fila ${rowNumber}"]`)
        .setValue("Gira europea");
      await wrapper
        .get<HTMLInputElement>(`input[aria-label="Fecha de inicio, fila ${rowNumber}"]`)
        .setValue(rowNumber === 1 ? "15/05/2027" : "16/05/2027");
      await wrapper
        .get<HTMLInputElement>(`input[aria-label="Ciudad, fila ${rowNumber}"]`)
        .setValue("Madrid");
      await paste(
        wrapper.get<HTMLInputElement>(
          `input[aria-label="Añadir artistas a Lineup (obligatorio), fila ${rowNumber}"]`
        ).element,
        rowNumber === 1 ? "Architects" : "Spiritbox"
      );
    }
    await vi.advanceTimersByTimeAsync(1350);
    await flushPromises();
    importEventBatchMock.mockImplementationOnce(async (snapshot) => ({
      batchId: snapshot.batchId,
      results: snapshot.rows.map((row) => ({
        operationRowId: row.operationRowId,
        rowKey: row.rowKey,
        revision: row.revision,
        result: { rowId: row.operationRowId, status: "created", eventId: `event-${row.rowKey}` },
      })),
    }));

    await openImportStage(wrapper);

    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Importar filas listas"))!
      .trigger("click");
    await flushPromises();

    expect(importEventBatchMock.mock.calls[0]?.[0].payload.rows).toMatchObject([
      {
        type: "tour",
        name: "Gira europea",
        startDate: "2027-05-15",
        lineup: [{ name: "Architects", artistId: "id-Architects" }],
      },
      {
        type: "tour",
        name: "Gira europea",
        startDate: "2027-05-16",
        lineup: [{ name: "Spiritbox", artistId: "id-Spiritbox" }],
      },
    ]);
    wrapper.unmount();
    vi.useRealTimers();
  });

  it("requires explicit locality and venue UUID choices when both lookups are ambiguous", async () => {
    const localityCandidates = localityResolutionFixtures[2]!.candidates;
    const venueFixture = venueResolutionFixtures[2]!;
    countriesMock.mockResolvedValueOnce(
      allowedCountries.map((country) =>
        country.isoCode === "ES"
          ? { ...country, id: "00000000-0000-4000-8000-000000000001" }
          : country
      )
    );
    inspectLocalitiesMock.mockImplementationOnce(async ({ localities }) => ({
      results: localities.map((input, index) => ({
        index,
        input,
        status: "ambiguous",
        code: "LOCALITY_AMBIGUOUS",
        candidates: localityCandidates,
      })),
    }));
    resolveVenuesMock.mockImplementationOnce(async (inputs) =>
      inputs.map((input, index) => ({
        index,
        ...input,
        ...venueFixture,
        localityId: input.localityId,
        name: input.name,
      }))
    );
    const wrapper = await mountImportView();
    await flushPromises();
    vi.useFakeTimers();
    await wrapper.get<HTMLInputElement>('input[aria-label="Ciudad, fila 1"]').setValue("Santiago");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Provincia, fila 1"]')
      .setValue("Pontevedra");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Recinto, fila 1"]')
      .setValue("Duplicate venue records");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Fecha de inicio, fila 1"]')
      .setValue("15/05/2027");
    await enterArtist(wrapper, 1);
    await vi.advanceTimersByTimeAsync(1350);
    await flushPromises();

    const localitySelect = wrapper.get<HTMLSelectElement>(
      'select[aria-label="Candidatas de localidad, fila 1"]'
    );
    expect(localitySelect.element.value).toBe("");
    await localitySelect.setValue(localityCandidates[1]!.id);
    await vi.advanceTimersByTimeAsync(900);
    await flushPromises();
    const venueSelect = wrapper.get<HTMLSelectElement>(
      'select[aria-label="Candidatos de recinto, fila 1"]'
    );
    expect(venueSelect.element.value).toBe("");
    await venueSelect.setValue(venueFixture.candidates[1]!.id);
    await flushPromises();

    importEventBatchMock.mockImplementationOnce(async (snapshot) => ({
      batchId: snapshot.batchId,
      results: snapshot.rows.map((row) => ({
        operationRowId: row.operationRowId,
        rowKey: row.rowKey,
        revision: row.revision,
        result: { rowId: row.operationRowId, status: "failed" },
      })),
    }));
    await openImportStage(wrapper);
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Importar filas listas"))!
      .trigger("click");
    await flushPromises();

    expect(resolveVenuesMock.mock.calls[0]?.[0]).toEqual([
      { name: "Duplicate venue records", localityId: localityCandidates[1]!.id },
    ]);
    expect(importEventBatchMock.mock.calls[0]?.[0].payload.rows[0]).toMatchObject({
      localityId: localityCandidates[1]!.id,
      venueId: venueFixture.candidates[1]!.id,
    });
    wrapper.unmount();
    vi.useRealTimers();
  });

  it("keeps a discarded in-flight row removed and records its later created result", async () => {
    countriesMock.mockResolvedValueOnce(
      allowedCountries.map((country) =>
        country.isoCode === "ES"
          ? { ...country, id: "123e4567-e89b-42d3-a456-426614174000" }
          : country
      )
    );
    const wrapper = await mountImportView();
    await flushPromises();
    vi.useFakeTimers();
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Fecha de inicio, fila 1"]')
      .setValue("15/05/2027");
    await wrapper.get<HTMLInputElement>('input[aria-label="Ciudad, fila 1"]').setValue("Madrid");
    await enterArtist(wrapper, 1);
    await vi.advanceTimersByTimeAsync(1350);
    await flushPromises();
    let finishImport!: (response: unknown) => void;
    importEventBatchMock.mockImplementationOnce(
      (snapshot) =>
        new Promise((resolve) => {
          finishImport = resolve;
          expect(snapshot.rows).toHaveLength(1);
        })
    );
    await openImportStage(wrapper);
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Importar filas listas"))!
      .trigger("click");
    await nextTick();
    expect(wrapper.find('nav[aria-label="Etapas de importación"]').exists()).toBe(false);
    expect(
      wrapper.findAll("button").find((button) => button.text().includes("JSON de scraping"))
        ?.element.disabled
    ).toBe(true);
    await discardRow(wrapper, 1);
    await flushPromises();
    expect(wrapper.findAll("tbody tr")).toHaveLength(4);
    expect(importEventBatchMock).toHaveBeenCalledTimes(1);

    const snapshot = importEventBatchMock.mock.calls[0]?.[0];
    finishImport({
      batchId: snapshot.batchId,
      results: snapshot.rows.map((row) => ({
        operationRowId: row.operationRowId,
        rowKey: row.rowKey,
        revision: row.revision,
        result: {
          rowId: row.operationRowId,
          status: "created",
          eventId: "event-created-after-discard",
        },
      })),
    });
    await flushPromises();
    expect(wrapper.findAll("tbody tr")).toHaveLength(4);
    expect(wrapper.text()).not.toContain("event-created-after-discard");
    await navigateImportStageInView(wrapper, "Importar y resultados");
    expect(wrapper.text()).toContain(
      "Se creó un evento a partir de una fila que ya no está en el borrador."
    );
    wrapper.unmount();
    vi.useRealTimers();
  });

  it("summarizes partial imports and navigates between conflicting rows by stable identity", async () => {
    countriesMock.mockResolvedValueOnce(
      allowedCountries.map((country) =>
        country.isoCode === "ES"
          ? { ...country, id: "123e4567-e89b-42d3-a456-426614174000" }
          : country
      )
    );
    const wrapper = await mountImportView(document.body);
    await flushPromises();
    vi.useFakeTimers();
    for (const rowNumber of [1, 2, 3]) {
      await wrapper
        .get<HTMLInputElement>(`input[aria-label="Fecha de inicio, fila ${rowNumber}"]`)
        .setValue("15/05/2027");
      await wrapper
        .get<HTMLInputElement>(`input[aria-label="Ciudad, fila ${rowNumber}"]`)
        .setValue(rowNumber === 1 ? "Madrid" : "Barcelona");
      await enterArtist(wrapper, rowNumber);
    }
    await vi.advanceTimersByTimeAsync(1350);
    await flushPromises();
    importEventBatchMock.mockImplementationOnce(async (snapshot) => ({
      batchId: snapshot.batchId,
      results: [...snapshot.rows].reverse().map((row) => {
        if (row.rowKey === "event-row-3")
          return {
            operationRowId: row.operationRowId,
            rowKey: row.rowKey,
            revision: row.revision,
            result: { rowId: row.operationRowId, status: "created", eventId: "created-third" },
          };
        const other = snapshot.rows.find((candidate) => candidate.rowKey !== row.rowKey)!;
        return {
          operationRowId: row.operationRowId,
          rowKey: row.rowKey,
          revision: row.revision,
          result: {
            rowId: row.operationRowId,
            status: "conflict",
            conflicts: [
              {
                rowId: row.operationRowId,
                kind: "participation",
                code: "CONCERT_ARTIST_DATE_LOCALITY_CONFLICT",
                severity: "blocking",
                message: "Artista y fecha incompatibles entre filas.",
                relatedRowIds: [other.operationRowId],
                existingEventIds: [],
                matchingArtists: [{ artistId: null, name: "Artista recibido" }],
                addableArtists: [],
                candidateEventIds: [],
              },
            ],
          },
        };
      }),
    }));

    await openImportStage(wrapper);

    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Importar filas listas"))
      ?.trigger("click");
    await flushPromises();

    await navigateImportStageInView(wrapper, "Revisar eventos");
    const conflictButton = wrapper.get<HTMLButtonElement>(
      'button[aria-label="Revisar conflicto de la fila 1"]'
    );
    const secondConflictButton = wrapper.get<HTMLButtonElement>(
      'button[aria-label="Revisar conflicto de la fila 2"]'
    );
    expect(conflictButton.text()).toBe("Revisar");
    expect(conflictButton.element.closest("th")).toBeNull();
    expect(wrapper.get('select[aria-label="Tipo, fila 1"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("Este concierto entra en conflicto con la fila 2");
    expect(wrapper.text()).not.toContain("Más información");
    expect(wrapper.text()).not.toContain("Fila 1: Hay un conflicto que revisar");
    expect(wrapper.findAll('button[aria-label^="Revisar conflicto de la fila 1"]').length).toBe(1);
    expect(conflictButton.attributes("aria-expanded")).toBe("false");
    expect(conflictButton.attributes("aria-controls")).toBe("event-import-conflicts-event-row-1");
    const panel = wrapper.get("#event-import-conflicts-event-row-1");
    const reviewButtonNode = conflictButton.element;
    expect(panel.attributes("hidden")).toBeDefined();
    expect(secondConflictButton.attributes("aria-expanded")).toBe("false");
    conflictButton.element.focus();
    await conflictButton.trigger("click");
    expect(conflictButton.attributes("aria-expanded")).toBe("true");
    expect(panel.attributes("hidden")).toBeUndefined();
    expect(conflictButton.element).toBe(reviewButtonNode);
    expect(secondConflictButton.attributes("aria-expanded")).toBe("false");
    expect(wrapper.text()).not.toContain("Hay un posible conflicto de participación.");
    expect(wrapper.text()).not.toContain("Este artista ya participa");
    expect(wrapper.text()).not.toContain("CONCERT_ARTIST_DATE_LOCALITY_CONFLICT");
    expect(wrapper.text()).not.toContain("Revisar ampliación de lineup");
    await conflictButton.trigger("click");
    expect(conflictButton.attributes("aria-expanded")).toBe("false");
    expect(panel.attributes("hidden")).toBeDefined();
    expect(conflictButton.element).toBe(reviewButtonNode);
    await conflictButton.trigger("click");
    const relatedRow = wrapper.get<HTMLButtonElement>('button[aria-label="Ir a la fila 2"]');
    expect(relatedRow.element.closest("td")?.getAttribute("colspan")).toBe("12");
    await relatedRow.trigger("click");
    expect(document.activeElement?.closest("tr")?.id).toBe("event-import-row-event-row-2");

    await wrapper
      .get<HTMLInputElement>('input[aria-label="Fecha de inicio, fila 1"]')
      .setValue("16/05/2027");
    await nextTick();
    expect(wrapper.text()).toContain(
      "Conflicto anterior — La fila cambió desde la última importación."
    );
    expect(wrapper.text()).not.toContain("Revisar ampliación de lineup");
    const typeSelector = wrapper.get<HTMLSelectElement>('select[aria-label="Tipo, fila 1"]');
    await typeSelector.setValue("festival");
    expect(typeSelector.element.value).toBe("festival");
    await navigateImportStageInView(wrapper, "Importar y resultados");
    expect(wrapper.text()).toContain("Importación finalizada · 1 evento importado · 2 conflictos");
    wrapper.unmount();
    vi.useRealTimers();
  });

  it("allows correcting a conflicted row and prepares a new operation from its current revision", async () => {
    countriesMock.mockResolvedValueOnce(
      allowedCountries.map((country) =>
        country.isoCode === "ES"
          ? { ...country, id: "123e4567-e89b-42d3-a456-426614174000" }
          : country
      )
    );
    const wrapper = await mountImportView();
    await flushPromises();
    vi.useFakeTimers();
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Fecha de inicio, fila 1"]')
      .setValue("15/05/2027");
    await wrapper.get<HTMLInputElement>('input[aria-label="Ciudad, fila 1"]').setValue("Madrid");
    await enterArtist(wrapper, 1);
    await vi.advanceTimersByTimeAsync(1350);
    await flushPromises();
    importEventBatchMock.mockImplementationOnce(async (snapshot) => ({
      batchId: snapshot.batchId,
      results: snapshot.rows.map((row) => ({
        operationRowId: row.operationRowId,
        rowKey: row.rowKey,
        revision: row.revision,
        result: { rowId: row.operationRowId, status: "conflict", code: "CONCERT_DUPLICATE" },
      })),
    }));
    await openImportStage(wrapper);
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Importar filas listas"))!
      .trigger("click");
    await flushPromises();

    const previous = importEventBatchMock.mock.calls[0]?.[0];
    expect(wrapper.text()).toContain("1 conflicto");
    await navigateImportStageInView(wrapper, "Revisar eventos");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Fecha de inicio, fila 1"]')
      .setValue("16/05/2027");
    await vi.advanceTimersByTimeAsync(900);
    await flushPromises();
    importEventBatchMock.mockImplementationOnce(async (snapshot) => ({
      batchId: snapshot.batchId,
      results: snapshot.rows.map((row) => ({
        operationRowId: row.operationRowId,
        rowKey: row.rowKey,
        revision: row.revision,
        result: { rowId: row.operationRowId, status: "created", eventId: "event-corrected" },
      })),
    }));
    await openImportStage(wrapper);
    const retryButton = wrapper
      .findAll("button")
      .find((button) => button.text().includes("Importar filas listas"));
    expect(retryButton?.element.disabled).toBe(false);
    await retryButton?.trigger("click");
    await flushPromises();

    const corrected = importEventBatchMock.mock.calls[1]?.[0];
    expect(corrected?.payload.rows[0]?.startDate).toBe("2027-05-16");
    expect(corrected?.rows[0]?.operationRowId).not.toBe(previous?.rows[0]?.operationRowId);
    expect(corrected?.batchId).not.toBe(previous?.batchId);
    await navigateImportStageInView(wrapper, "Revisar eventos");
    expect(wrapper.findAll("tbody tr")).toHaveLength(4);
    wrapper.unmount();
    vi.useRealTimers();
  });

  it("keeps concert and festival conflicts available for review", async () => {
    countriesMock.mockResolvedValueOnce(
      allowedCountries.map((country) =>
        country.isoCode === "ES"
          ? { ...country, id: "123e4567-e89b-42d3-a456-426614174000" }
          : country
      )
    );
    const wrapper = await mountImportView();
    await flushPromises();
    vi.useFakeTimers();
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Fecha de inicio, fila 1"]')
      .setValue("15/05/2027");
    await wrapper.get<HTMLInputElement>('input[aria-label="Ciudad, fila 1"]').setValue("Madrid");
    await enterArtist(wrapper, 1);
    await wrapper.get<HTMLSelectElement>('select[aria-label="Tipo, fila 2"]').setValue("festival");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Evento, fila 2"]')
      .setValue("Festival test");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Fecha de inicio, fila 2"]')
      .setValue("16/05/2027");
    await wrapper.get<HTMLInputElement>('input[aria-label="Ciudad, fila 2"]').setValue("Barcelona");
    await enterArtist(wrapper, 2);
    await vi.advanceTimersByTimeAsync(450);
    await flushPromises();
    importEventBatchMock.mockImplementationOnce(async (snapshot) => ({
      batchId: snapshot.batchId,
      results: snapshot.rows.map((row) => ({
        operationRowId: row.operationRowId,
        rowKey: row.rowKey,
        revision: row.revision,
        result: {
          rowId: row.operationRowId,
          status: "conflict",
          conflicts: [
            row.rowKey === "event-row-1"
              ? {
                  rowId: row.operationRowId,
                  kind: "participation",
                  code: "CONCERT_ARTIST_DATE_LOCALITY_CONFLICT",
                  severity: "blocking",
                  message: "Internal conflict message",
                  relatedRowIds: [],
                  existingEventIds: ["existing-concert-id"],
                  matchingArtists: [{ artistId: "existing-artist-id", name: "Artista 1" }],
                  addableArtists: [],
                  candidateEventIds: [],
                }
              : {
                  rowId: row.operationRowId,
                  kind: "duplicate",
                  code: "FESTIVAL_DUPLICATE",
                  severity: "blocking",
                  message: "Internal festival conflict message",
                  relatedRowIds: [],
                  existingEventIds: [],
                  matchingArtists: [],
                  addableArtists: [],
                  candidateEventIds: [],
                },
          ],
        },
      })),
    }));

    await openImportStage(wrapper);

    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Importar filas listas"))
      ?.trigger("click");
    await flushPromises();

    await navigateImportStageInView(wrapper, "Revisar eventos");

    expect(wrapper.get<HTMLSelectElement>('select[aria-label="Tipo, fila 1"]').element.value).toBe(
      "concert"
    );
    expect(wrapper.get<HTMLSelectElement>('select[aria-label="Tipo, fila 2"]').element.value).toBe(
      "festival"
    );
    expect(wrapper.find('input[aria-label="Evento, fila 1"]').exists()).toBe(true);
    expect(wrapper.find('input[aria-label="Evento, fila 2"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain("Internal conflict message");
    expect(wrapper.text()).not.toContain("Internal festival conflict message");
    wrapper.unmount();
    vi.useRealTimers();
  });

  it("keeps and locks an edited draft when its earlier snapshot is created", async () => {
    countriesMock.mockResolvedValueOnce(
      allowedCountries.map((country) =>
        country.isoCode === "ES"
          ? { ...country, id: "123e4567-e89b-42d3-a456-426614174000" }
          : country
      )
    );
    const wrapper = await mountImportView();
    await flushPromises();
    vi.useFakeTimers();
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Fecha de inicio, fila 1"]')
      .setValue("15/05/2027");
    await wrapper.get<HTMLInputElement>('input[aria-label="Ciudad, fila 1"]').setValue("Madrid");
    await enterArtist(wrapper, 1);
    await vi.advanceTimersByTimeAsync(1350);
    await flushPromises();

    let finishImport!: (response: unknown) => void;
    importEventBatchMock.mockImplementationOnce(
      (snapshot) =>
        new Promise((resolve) => {
          finishImport = resolve;
          expect(snapshot.rows).toHaveLength(1);
        })
    );
    await openImportStage(wrapper);
    const importButton = wrapper
      .findAll("button")
      .find((button) => button.text().includes("Importar filas listas"));
    await importButton?.trigger("click");
    await flushPromises();
    await nextTick();
    await navigateImportStageInView(wrapper, "Revisar eventos");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Precio, fila 1 (opcional)"]')
      .setValue("50 €");
    const snapshot = importEventBatchMock.mock.calls[0]?.[0];
    finishImport({
      batchId: snapshot.batchId,
      results: snapshot.rows.map((row) => ({
        operationRowId: row.operationRowId,
        rowKey: row.rowKey,
        revision: row.revision,
        result: { rowId: row.operationRowId, status: "created", eventId: "event-original-45" },
      })),
    });
    await flushPromises();

    expect(wrapper.findAll('tbody tr[id^="event-import-row-"]')).toHaveLength(5);
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Precio, fila 1 (opcional)"]').element.value
    ).toBe("50 €");
    expect(wrapper.text()).not.toContain("event-original-45");
    expect(wrapper.text()).toContain(
      "Este evento ya se creó. Revisa el borrador actual antes de continuar."
    );
    expect(wrapper.text()).toContain("0 filas listas");
    await discardRow(wrapper, 1);
    await flushPromises();
    expect(confirmDiscardMock).toHaveBeenLastCalledWith(
      "¿Descartar esta fila?",
      expect.stringContaining("El evento creado seguirá existiendo"),
      "Descartar borrador",
      "Cancelar"
    );
    expect(wrapper.text()).not.toContain("event-original-45");
    expect(importEventBatchMock).toHaveBeenCalledTimes(1);
    wrapper.unmount();
    vi.useRealTimers();
  });

  it("pastes Tour as a type and preserves Name while changing types", async () => {
    const wrapper = await mountImportView();
    await flushPromises();
    const type = wrapper.get<HTMLSelectElement>('select[aria-label="Tipo, fila 1"]');
    await type.setValue("tour");
    const name = wrapper.get<HTMLInputElement>('input[aria-label="Nombre de gira, fila 1"]');
    await name.setValue("Septicflesh European Tour 2027");
    await type.setValue("festival");
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Evento, fila 1"]').element.value).toBe(
      "Septicflesh European Tour 2027"
    );
    await paste(type.element, "tour\nconcert");
    expect(wrapper.get<HTMLSelectElement>('select[aria-label="Tipo, fila 1"]').element.value).toBe(
      "tour"
    );
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Nombre de gira, fila 1"]').element.value
    ).toBe("Septicflesh European Tour 2027");
  });

  it("shares a tour lookup and its explicit confirmation across equivalent rows", async () => {
    const wrapper = await mountImportView();
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
        .get<HTMLSelectElement>(`select[aria-label="Tipo, fila ${rowNumber}"]`)
        .setValue("tour");
      await wrapper
        .get<HTMLInputElement>(`input[aria-label="Nombre de gira, fila ${rowNumber}"]`)
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
    expect(wrapper.text()).toContain("Gira existente");
    const confirmButtons = wrapper
      .findAll("button")
      .filter((button) => button.text() === "Utilizar esta gira");
    await confirmButtons[0]?.trigger("click");
    await nextTick();
    expect(wrapper.findAll("p").filter((item) => item.text() === "Gira confirmada")).toHaveLength(
      2
    );

    await wrapper
      .get<HTMLInputElement>('input[aria-label="Nombre de gira, fila 1"]')
      .setValue("Otra gira 2027");
    await nextTick();
    expect(wrapper.findAll("p").filter((item) => item.text() === "Gira confirmada")).toHaveLength(
      1
    );
    vi.useRealTimers();
  });

  it("keeps ambiguous candidates selectable and makes technical errors retryable", async () => {
    const wrapper = await mountImportView();
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
        .get<HTMLSelectElement>(`select[aria-label="Tipo, fila ${rowNumber}"]`)
        .setValue("tour");
      await wrapper
        .get<HTMLInputElement>(`input[aria-label="Nombre de gira, fila ${rowNumber}"]`)
        .setValue(value);
    }
    await vi.advanceTimersByTimeAsync(450);
    await flushPromises();
    expect(wrapper.text()).toContain("Seleccionar gira");
    expect(wrapper.text()).toContain("Nombre de gira no válido.");
    const candidate = wrapper.get<HTMLSelectElement>(
      'select[aria-label="Candidata de gira, fila 1"]'
    );
    await candidate.setValue("tour-b");
    const confirm = wrapper
      .findAll("button")
      .find((button) => button.text() === "Utilizar esta gira");
    await confirm?.trigger("click");
    expect(wrapper.text()).toContain("Gira confirmada");
    inspectToursMock
      .mockRejectedValueOnce(new Error("Sin conexión"))
      .mockImplementation(async ({ names }: { names: string[] }) => ({
        results: names.map((name, index) => ({ index, name, status: "new", candidates: [] })),
      }));
    await wrapper.get<HTMLSelectElement>('select[aria-label="Tipo, fila 3"]').setValue("tour");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Nombre de gira, fila 3"]')
      .setValue("Gira recuperable");
    await vi.advanceTimersByTimeAsync(450);
    await flushPromises();
    expect(wrapper.text()).toContain("Error al buscar la gira.");
    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Reintentar")
      ?.trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("Gira nueva");
    vi.useRealTimers();
  });

  it("does not apply a stale Tour response and does not resolve Tour for price edits", async () => {
    const wrapper = await mountImportView();
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
    await wrapper.get<HTMLSelectElement>('select[aria-label="Tipo, fila 1"]').setValue("tour");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Nombre de gira, fila 1"]')
      .setValue("Gira antigua");
    await vi.advanceTimersByTimeAsync(450);
    await flushPromises();
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Nombre de gira, fila 1"]')
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
    expect(wrapper.text()).toContain("Gira nueva");
    expect(wrapper.text()).not.toContain("Gira existente");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Precio, fila 1 (opcional)"]')
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
    const wrapper = await mountImportView();
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
    const wrapper = await mountImportView();
    await flushPromises();
    await wrapper.get<HTMLInputElement>('input[aria-label="Evento, fila 1"]').setValue("Festival");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Recinto, fila 1"]')
      .setValue("Sala Norte");
    await wrapper.get<HTMLInputElement>('input[aria-label="Ciudad, fila 1"]').setValue("Lisboa");
    await wrapper.get<HTMLInputElement>('input[aria-label="Provincia, fila 1"]').setValue("Lisboa");

    const country = wrapper.get<HTMLSelectElement>("#event-import-country");
    await country.setValue("country-PT");
    await flushPromises();

    expect(country.element.value).toBe("country-PT");
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Evento, fila 1"]').element.value).toBe(
      "Festival"
    );
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Recinto, fila 1"]').element.value).toBe(
      "Sala Norte"
    );
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Ciudad, fila 1"]').element.value).toBe(
      "Lisboa"
    );
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Provincia, fila 1"]').element.value
    ).toBe("Lisboa");
  });

  it("shows an unavailable Spain configuration without selecting a fabricated country ID", async () => {
    countriesMock.mockResolvedValueOnce([{ id: "country-PT", isoCode: "PT", name: "Portugal" }]);
    const wrapper = await mountImportView();
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
    const wrapper = await mountImportView();

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
    const wrapper = await mountImportView();
    await flushPromises();

    expect(wrapper.find('[role="alert"]').text()).toContain("No se pudo cargar el catálogo");
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Reintentar"))!
      .trigger("click");
    await flushPromises();

    expect(countriesMock).toHaveBeenCalledTimes(2);
    expect(wrapper.get<HTMLSelectElement>("#event-import-country").element.value).toBe(
      "country-ES"
    );
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it("changes Tipo independently per row and retains it while editing other cells", async () => {
    const wrapper = await mountImportView();
    const firstTipo = wrapper.get<HTMLSelectElement>('select[aria-label="Tipo, fila 1"]');
    const secondTipo = wrapper.get<HTMLSelectElement>('select[aria-label="Tipo, fila 2"]');

    await firstTipo.setValue("festival");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Evento, fila 1"]')
      .setValue("Festival A");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Precio, fila 1 (opcional)"]')
      .setValue("25€");

    expect(firstTipo.element.value).toBe("festival");
    expect(secondTipo.element.value).toBe("concert");
    expect(wrapper.get('select[aria-label="Tipo, fila 1"]').element.value).toBe("festival");
  });

  it("adjusts the total number of rows with the numeric control", async () => {
    const wrapper = await mountImportView();
    const rowCount = wrapper.get<HTMLInputElement>('input[aria-label="Número de filas"]');

    expect(rowCount.element.value).toBe("5");
    await rowCount.setValue("3");
    expect(wrapper.findAll("tbody tr")).toHaveLength(3);
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Número de filas"]').element.value).toBe(
      "3"
    );

    await wrapper.get<HTMLInputElement>('input[aria-label="Número de filas"]').setValue("6");
    expect(wrapper.findAll("tbody tr")).toHaveLength(6);
    expect(wrapper.get<HTMLSelectElement>('select[aria-label="Tipo, fila 6"]').element.value).toBe(
      "concert"
    );

    await wrapper.get<HTMLInputElement>('input[aria-label="Número de filas"]').setValue("0");
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Número de filas"]').element.value).toBe(
      "0"
    );
    expect(wrapper.text()).toContain("No hay filas");
  });

  it("pastes valid Tipo values case-insensitively, warns on invalid values, and preserves rows and fields", async () => {
    const wrapper = await mountImportView();
    const firstTipo = wrapper.get<HTMLSelectElement>('select[aria-label="Tipo, fila 1"]');
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Evento, fila 1"]')
      .setValue("Evento previo");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Evento, fila 2"]')
      .setValue("Otro evento");
    await wrapper.get<HTMLInputElement>('input[aria-label="Ciudad, fila 1"]').setValue("Madrid");
    await wrapper.get<HTMLSelectElement>('select[aria-label="Tipo, fila 3"]').setValue("festival");

    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", {
      value: { getData: () => "Concierto\nFestIval\nINVALID\nconcert\nFESTIVAL\nFestival" },
    });
    firstTipo.element.dispatchEvent(event);
    await nextTick();

    expect(wrapper.get<HTMLSelectElement>('select[aria-label="Tipo, fila 1"]').element.value).toBe(
      "concert"
    );
    expect(wrapper.get<HTMLSelectElement>('select[aria-label="Tipo, fila 2"]').element.value).toBe(
      "festival"
    );
    expect(wrapper.get<HTMLSelectElement>('select[aria-label="Tipo, fila 3"]').element.value).toBe(
      "festival"
    );
    expect(wrapper.get('select[aria-label="Tipo, fila 3"]').attributes("aria-invalid")).toBe(
      "true"
    );
    expect(wrapper.text()).toContain("Tipo inválido «INVALID»");
    expect(wrapper.get('[role="alert"]').text()).toContain("Tipo inválido «INVALID»");
    expect(wrapper.get<HTMLSelectElement>('select[aria-label="Tipo, fila 4"]').element.value).toBe(
      "concert"
    );
    expect(wrapper.get<HTMLSelectElement>('select[aria-label="Tipo, fila 5"]').element.value).toBe(
      "festival"
    );
    expect(wrapper.get<HTMLSelectElement>('select[aria-label="Tipo, fila 6"]').element.value).toBe(
      "festival"
    );
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Evento, fila 1"]').element.value).toBe(
      "Evento previo"
    );
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Ciudad, fila 1"]').element.value).toBe(
      "Madrid"
    );
  });

  it("edits Precio and Otra información independently as optional free text", async () => {
    const wrapper = await mountImportView();
    const price = wrapper.get<HTMLInputElement>('input[aria-label="Precio, fila 1 (opcional)"]');
    const otherInfo = wrapper.get<HTMLInputElement>(
      'input[aria-label="Otra información, fila 1 (opcional)"]'
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

  it("pastes Precio and Otra información ranges across rows, retaining blank cells and other columns", async () => {
    const wrapper = await mountImportView();
    const price = wrapper.get<HTMLInputElement>('input[aria-label="Precio, fila 1 (opcional)"]');
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Precio, fila 1 (opcional)"]')
      .setValue("old price");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Otra información, fila 1 (opcional)"]')
      .setValue("old info");
    await wrapper.get<HTMLInputElement>('input[aria-label="Ciudad, fila 2"]').setValue("Santander");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Provincia, fila 3"]')
      .setValue("Cantabria");

    await paste(price.element, "Desde 49,50€\tApertura 18:00\n\tSolo mayores de edad\nGratis\t");

    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Precio, fila 1 (opcional)"]').element.value
    ).toBe("Desde 49,50€");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Otra información, fila 1 (opcional)"]')
        .element.value
    ).toBe("Apertura 18:00");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Precio, fila 2 (opcional)"]').element.value
    ).toBe("");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Otra información, fila 2 (opcional)"]')
        .element.value
    ).toBe("Solo mayores de edad");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Precio, fila 3 (opcional)"]').element.value
    ).toBe("Gratis");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Otra información, fila 3 (opcional)"]')
        .element.value
    ).toBe("");
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Ciudad, fila 2"]').element.value).toBe(
      "Santander"
    );
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Provincia, fila 3"]').element.value
    ).toBe("Cantabria");
  });

  it("pastes multiple Otra información rows without touching Precio or later columns", async () => {
    const wrapper = await mountImportView();
    const otherInfo = wrapper.get<HTMLInputElement>(
      'input[aria-label="Otra información, fila 5 (opcional)"]'
    );
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Precio, fila 5 (opcional)"]')
      .setValue("35€");
    await wrapper.get<HTMLInputElement>('input[aria-label="Ciudad, fila 5"]').setValue("Bilbao");

    await paste(otherInfo.element, "Acceso por puerta norte\n\nAforo limitado\nÚltima fila");

    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Otra información, fila 5 (opcional)"]')
        .element.value
    ).toBe("Acceso por puerta norte");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Otra información, fila 6 (opcional)"]')
        .element.value
    ).toBe("");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Otra información, fila 7 (opcional)"]')
        .element.value
    ).toBe("Aforo limitado");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Otra información, fila 8 (opcional)"]')
        .element.value
    ).toBe("Última fila");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Precio, fila 5 (opcional)"]').element.value
    ).toBe("35€");
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Ciudad, fila 5"]').element.value).toBe(
      "Bilbao"
    );
  });

  it("edits and normalizes a date, allows an optional end date, and validates date order", async () => {
    const wrapper = await mountImportView();
    const start = wrapper.get<HTMLInputElement>('input[aria-label="Fecha de inicio, fila 1"]');
    const end = wrapper.get<HTMLInputElement>(
      'input[aria-label="Fecha de fin, fila 1 (opcional)"]'
    );

    expect(end.element.value).toBe("");
    await start.setValue("3/2/2026");
    expect(start.element.value).toBe("03/02/2026");
    await end.setValue("02/02/2026");
    expect(wrapper.text()).toContain("La fecha de fin no puede ser anterior a la fecha de inicio.");
    await end.setValue("3/2/2026");
    expect(end.element.value).toBe("03/02/2026");
    expect(wrapper.text()).not.toContain(
      "La fecha de fin no puede ser anterior a la fecha de inicio."
    );
    await end.setValue("");
    expect(end.element.value).toBe("");
  });

  it("keeps invalid date text editable and shows a cell error", async () => {
    const wrapper = await mountImportView();
    const start = wrapper.get<HTMLInputElement>('input[aria-label="Fecha de inicio, fila 1"]');
    await start.setValue("29/02/2026");
    expect(start.element.value).toBe("29/02/2026");
    expect(start.attributes("aria-invalid")).toBe("true");
    expect(wrapper.text()).toContain("Usa una fecha válida en formato DD/MM/AAAA.");
    expect(wrapper.get('[role="alert"]').text()).toContain("Usa una fecha válida");
  });

  it("pastes one date and a two-column multirow range, preserving blanks and other data", async () => {
    const wrapper = await mountImportView();
    const start = wrapper.get<HTMLInputElement>('input[aria-label="Fecha de inicio, fila 1"]');
    await wrapper.get<HTMLInputElement>('input[aria-label="Evento, fila 1"]').setValue("Fila uno");
    await wrapper.get<HTMLInputElement>('input[aria-label="Recinto, fila 1"]').setValue("Sala uno");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Fecha de inicio, fila 4"]')
      .setValue("01/10/2026");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Fecha de fin, fila 4 (opcional)"]')
      .setValue("02/10/2026");
    await paste(start.element, "3/2/2026");
    expect(start.element.value).toBe("03/02/2026");

    await paste(start.element, "3/2/2026\t\n12/6/2026\t14/6/2026\n25/9/2026\t26/9/2026");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Fecha de inicio, fila 1"]').element.value
    ).toBe("03/02/2026");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Fecha de fin, fila 1 (opcional)"]').element
        .value
    ).toBe("");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Fecha de inicio, fila 2"]').element.value
    ).toBe("12/06/2026");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Fecha de fin, fila 2 (opcional)"]').element
        .value
    ).toBe("14/06/2026");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Fecha de inicio, fila 3"]').element.value
    ).toBe("25/09/2026");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Fecha de fin, fila 3 (opcional)"]').element
        .value
    ).toBe("26/09/2026");
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Evento, fila 1"]').element.value).toBe(
      "Fila uno"
    );
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Recinto, fila 1"]').element.value).toBe(
      "Sala uno"
    );
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Fecha de inicio, fila 4"]').element.value
    ).toBe("01/10/2026");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Fecha de fin, fila 4 (opcional)"]').element
        .value
    ).toBe("02/10/2026");
  });

  it("adds rows when a pasted date range extends beyond the existing table", async () => {
    const wrapper = await mountImportView();
    const startRow5 = wrapper.get<HTMLInputElement>('input[aria-label="Fecha de inicio, fila 5"]');
    await paste(startRow5.element, "3/2/2026\t4/2/2026\n5/2/2026\t6/2/2026");

    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Fecha de inicio, fila 6"]').element.value
    ).toBe("05/02/2026");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Fecha de fin, fila 6 (opcional)"]').element
        .value
    ).toBe("06/02/2026");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Fecha de inicio, fila 5"]').element.value
    ).toBe("03/02/2026");
  });

  it("pastes a single column only into its starting date field and leaves later rows untouched", async () => {
    const wrapper = await mountImportView();
    const endRow2 = wrapper.get<HTMLInputElement>(
      'input[aria-label="Fecha de fin, fila 2 (opcional)"]'
    );
    await paste(endRow2.element, "12/6/2026\n14/6/2026");
    expect(endRow2.element.value).toBe("12/06/2026");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Fecha de inicio, fila 2"]').element.value
    ).toBe("");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Fecha de fin, fila 3 (opcional)"]').element
        .value
    ).toBe("14/06/2026");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Fecha de inicio, fila 4"]').element.value
    ).toBe("");
  });

  it("resolves Locality before Recinto while keeping Ciudad, Provincia and entered Recinto text", async () => {
    const wrapper = await mountImportView();
    await flushPromises();
    vi.useFakeTimers();
    await wrapper.get<HTMLInputElement>('input[aria-label="Ciudad, fila 1"]').setValue("Barcelona");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Provincia, fila 1"]')
      .setValue("Barcelona");
    const venueInput = wrapper.get<HTMLInputElement>('input[aria-label="Recinto, fila 1"]');
    await venueInput.setValue("  Sala Apolo  ");
    await venueInput.trigger("blur");
    await vi.advanceTimersByTimeAsync(1350);
    await flushPromises();

    expect(inspectLocalitiesMock).toHaveBeenCalled();
    expect(inspectLocalitiesMock.mock.calls.map(([request]) => request)).toContainEqual(
      expect.objectContaining({
        localities: [expect.objectContaining({ name: "Barcelona", province: "Barcelona" })],
      })
    );
    expect(resolveVenuesMock).toHaveBeenCalledWith(
      [{ name: "  Sala Apolo  ", localityId: "123e4567-e89b-42d3-a456-426614174004" }],
      expect.anything()
    );
    expect(searchVenueNamesMock).not.toHaveBeenCalled();
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Recinto, fila 1"]').element.value).toBe(
      "  Sala Apolo  "
    );
    await wrapper.get<HTMLInputElement>('input[aria-label="Recinto, fila 1"]').trigger("blur");
    expect(
      wrapper.find('button[aria-label="Editar   Sala Apolo  , recinto fila 1"]').exists()
    ).toBe(true);
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Ciudad, fila 1"]').element.value).toBe(
      "Barcelona"
    );
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Provincia, fila 1"]').element.value
    ).toBe("Barcelona");

    await wrapper.get<HTMLInputElement>('input[aria-label="Ciudad, fila 1"]').setValue("Girona");
    await wrapper.get<HTMLInputElement>('input[aria-label="Provincia, fila 1"]').setValue("Girona");
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Ciudad, fila 1"]').element.value).toBe(
      "Girona"
    );
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Provincia, fila 1"]').element.value
    ).toBe("Girona");
    vi.useRealTimers();
  });

  it("edits Event and Lineup independently and allows Event to stay empty", async () => {
    const wrapper = await mountImportView();
    const firstEvent = wrapper.get<HTMLInputElement>('input[aria-label="Evento, fila 1"]');
    const firstLineup = wrapper.get<HTMLInputElement>(
      'input[aria-label="Añadir artistas a Lineup (obligatorio), fila 1"]'
    );

    await firstEvent.setValue("Resurrection Fest 2027");
    await firstLineup.setValue("Electric Callboy + Bury Tomorrow + Wargasm");
    await firstEvent.setValue("");

    expect(firstEvent.element.value).toBe("");
    expect(firstEvent.attributes("required")).toBeUndefined();
    expect(firstLineup.element.value).toBe("Electric Callboy + Bury Tomorrow + Wargasm");
  });

  it("adds blank rows and deletes one without losing other rows", async () => {
    const wrapper = await mountImportView();
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Evento, fila 1"]')
      .setValue("Gira XX Aniversario");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Añadir artistas a Lineup (obligatorio), fila 1"]')
      .setValue("Machine Head");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Precio, fila 1 (opcional)"]')
      .setValue("35€");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Otra información, fila 1 (opcional)"]')
      .setValue("Anticipada online");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Evento, fila 2"]')
      .setValue("Download Festival Madrid");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Añadir artistas a Lineup (obligatorio), fila 2"]')
      .setValue("Architects + Spiritbox");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Precio, fila 2 (opcional)"]')
      .setValue("Gratis");
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Otra información, fila 2 (opcional)"]')
      .setValue("Aforo limitado");
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Añadir fila"))!
      .trigger("click");

    expect(wrapper.get<HTMLInputElement>('input[aria-label="Evento, fila 6"]').element.value).toBe(
      ""
    );
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Precio, fila 6 (opcional)"]').element.value
    ).toBe("");
    expect(
      wrapper.get<HTMLInputElement>(
        'input[aria-label="Añadir artistas a Lineup (obligatorio), fila 6"]'
      ).element.value
    ).toBe("");

    await discardRow(wrapper, 1);
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Evento, fila 1"]').element.value).toBe(
      "Download Festival Madrid"
    );
    expect(
      wrapper.get<HTMLInputElement>(
        'input[aria-label="Añadir artistas a Lineup (obligatorio), fila 1"]'
      ).element.value
    ).toBe("Architects + Spiritbox");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Precio, fila 1 (opcional)"]').element.value
    ).toBe("Gratis");
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Otra información, fila 1 (opcional)"]')
        .element.value
    ).toBe("Aforo limitado");
  });

  it("renders resolved artists as pills and leaves unknown artists editable", async () => {
    const wrapper = await mountImportView();
    const lineupInput = wrapper.get<HTMLInputElement>(
      'input[aria-label="Añadir artistas a Lineup (obligatorio), fila 1"]'
    );
    await lineupInput.setValue("Architects + Spiritbox + Banda Desconocida");
    expect(resolveArtistsBatchMock).not.toHaveBeenCalled();
    vi.useFakeTimers();
    await paste(lineupInput.element, "Architects + Spiritbox + Banda Desconocida");
    await vi.advanceTimersByTimeAsync(450);
    await flushPromises();

    expect(wrapper.find('button[aria-label="Editar Architects"]').exists()).toBe(true);
    expect(wrapper.find('button[aria-label="Editar Spiritbox"]').exists()).toBe(true);
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Artista 3 de Lineup, fila 1"]').element.value
    ).toBe("Banda Desconocida");
    expect(wrapper.text()).toContain("Architects");
    expect(wrapper.text()).toContain("Spiritbox");

    const addArtistInput = wrapper.get<HTMLInputElement>(
      'input[aria-label="Añadir artistas a Lineup (obligatorio), fila 1"]'
    );
    await addArtistInput.setValue("Loathe");
    await addArtistInput.trigger("keydown.enter");
    await vi.advanceTimersByTimeAsync(450);
    await flushPromises();
    expect(wrapper.find('button[aria-label="Editar Loathe"]').exists()).toBe(true);

    await wrapper.get('button[aria-label="Editar Architects"]').trigger("click");
    const editArtistInput = wrapper.get<HTMLInputElement>(
      'input[aria-label="Artista 1 de Lineup, fila 1"]'
    );
    await editArtistInput.setValue("Altered Band");
    await editArtistInput.trigger("blur");
    await vi.advanceTimersByTimeAsync(450);
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

  it("preserves the active Artist draft, focus and caret when a confirmed lookup fails", async () => {
    const wrapper = await mountImportView(document.body);
    await flushPromises();
    vi.useFakeTimers();
    resolveArtistsBatchMock.mockRejectedValueOnce(new Error("Sin conexión"));
    const input = wrapper.get<HTMLInputElement>(
      'input[aria-label="Añadir artistas a Lineup (obligatorio), fila 1"]'
    );
    input.element.focus();
    await input.setValue("Septicflesh");
    await input.trigger("keydown.enter");
    await input.setValue("Equilibrium");
    input.element.setSelectionRange(4, 4);

    await vi.advanceTimersByTimeAsync(450);
    await flushPromises();

    expect(document.activeElement).toBe(input.element);
    expect(input.element.value).toBe("Equilibrium");
    expect(input.element.selectionStart).toBe(4);
    expect(wrapper.text()).toContain("Error al buscar");
  });

  it("allows clearing cells and removing the last rows", async () => {
    const wrapper = await mountImportView();
    const eventInput = wrapper.get<HTMLInputElement>('input[aria-label="Evento, fila 1"]');
    const lineupInput = wrapper.get<HTMLInputElement>(
      'input[aria-label="Añadir artistas a Lineup (obligatorio), fila 1"]'
    );

    await eventInput.setValue("Texto temporal");
    await lineupInput.setValue("Artista temporal");
    await eventInput.setValue("");
    await lineupInput.setValue("");
    expect(eventInput.element.value).toBe("");
    expect(lineupInput.element.value).toBe("");

    for (let index = 0; index < 5; index += 1) await discardRow(wrapper, 1);
    expect(wrapper.findAll('tbody input:not([type="checkbox"])')).toHaveLength(0);
    expect(wrapper.text()).toContain("No hay filas");
  });

  it("discards an empty row through the global action and confirms a populated row as a local draft", async () => {
    const wrapper = await mountImportView();
    await discardRow(wrapper, 1);
    expect(confirmDiscardMock).not.toHaveBeenCalled();
    expect(wrapper.get('input[aria-label="Evento, fila 1"]')).toBeTruthy();

    await wrapper
      .get<HTMLInputElement>('input[aria-label="Evento, fila 1"]')
      .setValue("Festival de prueba");
    await discardRow(wrapper, 1);
    await flushPromises();
    expect(confirmDiscardMock).toHaveBeenCalledWith(
      "¿Descartar esta fila?",
      expect.stringContaining("No se borrarán eventos ya existentes."),
      "Descartar borrador",
      "Cancelar"
    );
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Evento, fila 1"]').element.value).toBe(
      ""
    );
  });

  it("uses the same confirmation when reducing the row count would discard content", async () => {
    const wrapper = await mountImportView();
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Evento, fila 5"]')
      .setValue("Concierto conservado");
    const rowCount = wrapper.get<HTMLInputElement>('input[aria-label="Número de filas"]');
    confirmDiscardMock.mockResolvedValueOnce({ isConfirmed: false });
    await rowCount.setValue("4");
    await flushPromises();
    expect(confirmDiscardMock).toHaveBeenCalledWith(
      "¿Descartar esta fila?",
      expect.stringContaining("No se borrarán eventos ya existentes."),
      "Descartar borrador",
      "Cancelar"
    );
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Evento, fila 5"]').element.value).toBe(
      "Concierto conservado"
    );
    expect(rowCount.element.value).toBe("5");
  });

  it("discards selected rows by stable identity and leaves them when confirmation is cancelled", async () => {
    const wrapper = await mountImportView();
    await wrapper.get<HTMLInputElement>('input[aria-label="Evento, fila 1"]').setValue("Evento A");
    await wrapper.get<HTMLInputElement>('input[aria-label="Evento, fila 2"]').setValue("Evento B");
    await wrapper.get('input[aria-label="Seleccionar fila 1 para descartar"]').setValue(true);
    await wrapper.get('input[aria-label="Seleccionar fila 2 para descartar"]').setValue(true);
    confirmDiscardMock.mockResolvedValueOnce({ isConfirmed: false });
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Descartar seleccionadas"))!
      .trigger("click");
    await flushPromises();
    expect(confirmDiscardMock).toHaveBeenCalledWith(
      "¿Descartar 2 filas?",
      expect.stringContaining("2 borradores locales desaparecerán"),
      "Descartar borrador",
      "Cancelar"
    );
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Evento, fila 1"]').element.value).toBe(
      "Evento A"
    );
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Evento, fila 2"]').element.value).toBe(
      "Evento B"
    );

    confirmDiscardMock.mockResolvedValueOnce({ isConfirmed: true });
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Descartar seleccionadas"))!
      .trigger("click");
    await flushPromises();
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Evento, fila 1"]').element.value).toBe(
      ""
    );
    expect(wrapper.text()).toContain("0 filas seleccionadas");
  });

  it.each([
    ["a transport failure before any response", new Error("Network Error")],
    ["a timeout after a possible commit", new Error("network timeout after possible commit")],
  ])("keeps and retries the original snapshot after %s", async (_scenario, error) => {
    countriesMock.mockResolvedValueOnce(
      allowedCountries.map((country) =>
        country.isoCode === "ES"
          ? { ...country, id: "123e4567-e89b-42d3-a456-426614174000" }
          : country
      )
    );
    const wrapper = await mountImportView();
    await flushPromises();
    vi.useFakeTimers();
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Fecha de inicio, fila 1"]')
      .setValue("15/05/2027");
    await wrapper.get<HTMLInputElement>('input[aria-label="Ciudad, fila 1"]').setValue("Madrid");
    await enterArtist(wrapper, 1);
    await vi.advanceTimersByTimeAsync(1350);
    await flushPromises();
    importEventBatchMock.mockRejectedValueOnce(error);
    await openImportStage(wrapper);
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Importar filas listas"))!
      .trigger("click");
    await flushPromises();

    const originalSnapshot = importEventBatchMock.mock.calls[0]?.[0];
    expect(wrapper.text()).toContain("No sabemos si la operación terminó.");
    await selectImportMode(wrapper, "JSON de scraping");
    expect(wrapper.find('button[aria-label="Importar filas listas"]').exists()).toBe(false);
    expect(wrapper.find("table").exists()).toBe(false);
    expect(importEventBatchMock).toHaveBeenCalledTimes(1);
    await selectImportMode(wrapper, "Manual");
    expect(wrapper.find('button[aria-label="Importar filas listas"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("No sabemos si la operación terminó.");
    expect(importEventBatchMock).toHaveBeenCalledTimes(1);
    await navigateImportStageInView(wrapper, "Revisar eventos");
    await discardRow(wrapper, 1);
    await flushPromises();
    expect(confirmDiscardMock).toHaveBeenLastCalledWith(
      "¿Descartar esta fila?",
      expect.stringContaining("ya no podrás comprobarlo desde aquí"),
      "Descartar borrador",
      "Cancelar"
    );
    expect(wrapper.findAll("tbody tr")).toHaveLength(4);
    expect(wrapper.text()).toContain("No sabemos si la operación terminó.");

    importEventBatchMock.mockImplementationOnce(async (snapshot) => ({
      batchId: snapshot.batchId,
      results: snapshot.rows.map((row) => ({
        operationRowId: row.operationRowId,
        rowKey: row.rowKey,
        revision: row.revision,
        result: { rowId: row.operationRowId, status: "created", eventId: "event-after-retry" },
      })),
    }));
    await openImportStage(wrapper);
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Reintentar 1 filas inciertas"))!
      .trigger("click");
    await flushPromises();
    expect(importEventBatchMock.mock.calls[1]?.[0]).toBe(originalSnapshot);
    await navigateImportStageInView(wrapper, "Revisar eventos");
    expect(wrapper.findAll("tbody tr")).toHaveLength(4);
    expect(wrapper.text()).not.toContain("event-after-retry");
  });

  it("offers recovery explicitly and never submits a restored uncertain snapshot automatically", async () => {
    const batchId = "123e4567-e89b-42d3-a456-426614174010";
    const operationRowId = "123e4567-e89b-42d3-a456-426614174011";
    countriesMock.mockResolvedValueOnce(
      allowedCountries.map((country) =>
        country.isoCode === "ES"
          ? { ...country, id: "123e4567-e89b-42d3-a456-426614174000" }
          : country
      )
    );
    sessionGetMock.mockResolvedValueOnce({
      ownerId: "123e4567-e89b-42d3-a456-426614174099",
      formatVersion: 1,
      savedAt: "2026-11-01T12:00:00.000Z",
      payload: {
        countryId: "123e4567-e89b-42d3-a456-426614174000",
        rows: [
          {
            id: "event-row-1",
            type: "concert",
            event: "Evento recuperado",
            lineup: [],
            startDate: null,
            startDateDraft: "",
            endDate: null,
            endDateDraft: "",
            venue: { name: "", venueId: null, localityId: null },
            price: "",
            otherInfo: "",
            city: "Madrid",
            province: "",
            administrativeRegionId: null,
          },
        ],
        lineupStates: { "event-row-1": { draft: "" } },
        tourStates: { "event-row-1": { confirmedTourId: null, selectedCandidateId: null } },
        uncertainSnapshots: [
          {
            batchId,
            countryId: "123e4567-e89b-42d3-a456-426614174000",
            rows: [
              {
                rowKey: "event-row-1",
                operationRowId,
                revision: 1,
                dto: { rowId: operationRowId },
              },
            ],
            payload: { batchId, rows: [{ rowId: operationRowId }] },
          },
        ],
        createdDrafts: {},
        appliedExpansionsByRow: {},
        protectedExpansionSnapshots: {},
        conflictOperation: null,
        lastImport: null,
      },
    });
    const wrapper = await mountImportView();
    await flushPromises();
    expect(wrapper.text()).toContain("Tienes una sesión incompleta");
    expect(wrapper.text()).toContain("1 operaciones pendientes o inciertas");
    expect(wrapper.find('input[aria-label="Evento, fila 1"]').exists()).toBe(false);
    expect(importEventBatchMock).not.toHaveBeenCalled();

    await wrapper.get("button").trigger("click");
    await flushPromises();
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Evento, fila 1"]').element.value).toBe(
      "Evento recuperado"
    );
    expect(importEventBatchMock).not.toHaveBeenCalled();
  });

  it("persists the exact creation snapshot before POST and blocks the POST when IndexedDB fails", async () => {
    countriesMock.mockResolvedValueOnce(
      allowedCountries.map((country) =>
        country.isoCode === "ES"
          ? { ...country, id: "123e4567-e89b-42d3-a456-426614174000" }
          : country
      )
    );
    const wrapper = await mountImportView();
    await flushPromises();
    vi.useFakeTimers();
    await wrapper
      .get<HTMLInputElement>('input[aria-label="Fecha de inicio, fila 1"]')
      .setValue("15/05/2027");
    await wrapper.get<HTMLInputElement>('input[aria-label="Ciudad, fila 1"]').setValue("Madrid");
    await enterArtist(wrapper, 1);
    await vi.advanceTimersByTimeAsync(1350);
    await flushPromises();

    const order: string[] = [];
    sessionSaveMock.mockImplementation(async (record) => {
      order.push("save");
      expect(record.payload.uncertainSnapshots[0]).toMatchObject({
        batchId: expect.any(String),
        rows: [expect.objectContaining({ operationRowId: expect.any(String) })],
      });
      return "123e4567-e89b-42d3-a456-426614174099";
    });
    importEventBatchMock.mockImplementationOnce(async (snapshot) => {
      order.push("post");
      return {
        batchId: snapshot.batchId,
        results: snapshot.rows.map((row) => ({
          operationRowId: row.operationRowId,
          rowKey: row.rowKey,
          revision: row.revision,
          result: { rowId: row.operationRowId, status: "failed", code: "temporary" },
        })),
      };
    });
    await openImportStage(wrapper);
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Importar filas listas"))!
      .trigger("click");
    await flushPromises();
    expect(order.indexOf("post")).toBeGreaterThan(0);
    expect(order.slice(0, order.indexOf("post")).every((action) => action === "save")).toBe(true);
    expect(importEventBatchMock).toHaveBeenCalledTimes(1);
    wrapper.unmount();

    countriesMock.mockResolvedValueOnce(
      allowedCountries.map((country) =>
        country.isoCode === "ES"
          ? { ...country, id: "123e4567-e89b-42d3-a456-426614174000" }
          : country
      )
    );
    const blockedWrapper = await mountImportView();
    await flushPromises();
    vi.useFakeTimers();
    await blockedWrapper
      .get<HTMLInputElement>('input[aria-label="Fecha de inicio, fila 1"]')
      .setValue("15/05/2027");
    await blockedWrapper
      .get<HTMLInputElement>('input[aria-label="Ciudad, fila 1"]')
      .setValue("Madrid");
    await enterArtist(blockedWrapper, 1);
    await vi.advanceTimersByTimeAsync(1350);
    await flushPromises();
    sessionSaveMock.mockRejectedValueOnce(new Error("quota exceeded"));
    importEventBatchMock.mockClear();
    await openImportStage(blockedWrapper);
    await blockedWrapper
      .findAll("button")
      .find((button) => button.text().includes("Importar filas listas"))!
      .trigger("click");
    await flushPromises();
    expect(importEventBatchMock).not.toHaveBeenCalled();
    expect(blockedWrapper.text()).toContain(
      "No se pudo guardar la propuesta, así que la importación no se ha enviado."
    );
    expect(
      blockedWrapper.findAll("button").filter((button) => button.text() === "Reintentar guardado")
    ).toHaveLength(0);
    const originalSnapshot = sessionSaveMock.mock.calls.at(-1)?.[0].payload.uncertainSnapshots[0];
    expect(originalSnapshot).toBeDefined();
    sessionSaveMock.mockResolvedValueOnce("123e4567-e89b-42d3-a456-426614174099");
    importEventBatchMock.mockImplementationOnce(async (snapshot) => ({
      batchId: snapshot.batchId,
      results: snapshot.rows.map((row) => ({
        operationRowId: row.operationRowId,
        rowKey: row.rowKey,
        revision: row.revision,
        result: { rowId: row.operationRowId, status: "failed", code: "temporary" },
      })),
    }));
    await blockedWrapper
      .findAll("button")
      .find((button) => button.text().includes("Reintentar guardado y envío"))!
      .trigger("click");
    await flushPromises();
    expect(importEventBatchMock).toHaveBeenCalledTimes(1);
    expect(importEventBatchMock.mock.calls[0]?.[0].batchId).toBe(originalSnapshot?.batchId);
    expect(importEventBatchMock.mock.calls[0]?.[0].rows[0]?.operationRowId).toBe(
      originalSnapshot?.rows[0]?.operationRowId
    );
    blockedWrapper.unmount();
  });

  it("loads a JSON fixture into the JSON workspace and resolves its artists", async () => {
    countriesMock.mockResolvedValueOnce(
      allowedCountries.map((country) =>
        country.isoCode === "ES"
          ? { ...country, id: "123e4567-e89b-42d3-a456-426614174000" }
          : country
      )
    );
    const wrapper = await mountImportView(undefined, true);
    await flushPromises();
    const file = new File([scrapedEvents], "events.json", { type: "application/json" });
    const fileInput = wrapper.get<HTMLInputElement>(
      'input[aria-label="Seleccionar archivo JSON de eventos"]'
    );
    Object.defineProperty(fileInput.element, "files", { configurable: true, value: [file] });
    await fileInput.trigger("change");
    await flushPromises();
    expect(wrapper.text()).toContain("Cargar archivo JSON");
    expect(wrapper.text()).toContain("scraped-123");
    expect(
      (
        wrapper.get<HTMLInputElement>('[aria-label="Seleccionar archivo JSON de eventos"]')
          .element as HTMLInputElement
      ).files
    ).toBeDefined();
    expect(wrapper.text()).toContain("Festival de verano");
    const continueButton = wrapper
      .findAll("button")
      .find((button) => button.text().includes("Analizar y resolver eventos"));
    expect(continueButton).toBeDefined();
    vi.useFakeTimers();
    await continueButton!.trigger("click");
    await vi.advanceTimersByTimeAsync(1350);
    await flushPromises();
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Todos"))!
      .trigger("click");
    expect(
      wrapper
        .findAll('input[aria-label^="Evento, fila"]')
        .some((input) => (input.element as HTMLInputElement).value === "Architects + Spiritbox")
    ).toBe(true);
    expect(
      (wrapper.get<HTMLInputElement>('[aria-label="Evento, fila 2"]').element as HTMLInputElement)
        .value
    ).toBe("Festival de verano");
    expect(
      (
        wrapper.get<HTMLInputElement>('[aria-label="Provincia, fila 1"]')
          .element as HTMLInputElement
      ).value
    ).toBe("Cantabria");
    expect(wrapper.text()).toContain("Architects");
    expect(
      wrapper.findAll("li").some((item) => item.text().includes("Repetido dentro del archivo"))
    ).toBe(true);
    expect(resolveArtistsBatchMock).toHaveBeenCalled();
    expect(inspectLocalitiesMock).toHaveBeenCalled();
    const inspectedLocalities = inspectLocalitiesMock.mock.calls.flatMap(
      ([request]) =>
        (request as { localities?: Array<{ name: string; province?: string }> }).localities ?? []
    );
    expect(inspectedLocalities).toContainEqual(
      expect.objectContaining({ name: "Santander", province: "Cantabria" })
    );
    expect(importEventBatchMock).not.toHaveBeenCalled();
    const resolverCallCounts = [
      resolveArtistsBatchMock.mock.calls.length,
      inspectLocalitiesMock.mock.calls.length,
      resolveVenuesMock.mock.calls.length,
      inspectToursMock.mock.calls.length,
    ];
    const duplicateFilter = wrapper
      .findAll("button")
      .find((button) => button.text().includes("Duplicados del archivo"));
    expect(duplicateFilter).toBeDefined();
    await duplicateFilter!.trigger("click");
    expect(wrapper.text()).toContain("Repetido dentro del archivo");
    expect(wrapper.find('input[aria-label^="Evento, fila"]').exists()).toBe(false);
    await wrapper.get<HTMLInputElement>("#event-import-review-search").setValue("bilbao");
    expect(wrapper.text()).toContain("No hay resultados");
    await wrapper.get<HTMLInputElement>("#event-import-review-search").setValue("");
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Inválidos"))!
      .trigger("click");
    expect(wrapper.text()).toContain("fecha de inicio no válida");
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Todos"))!
      .trigger("click");
    await wrapper.get<HTMLInputElement>("#event-import-review-search").setValue("bilbao");
    expect(wrapper.findAll('input[aria-label^="Evento, fila"]')).toHaveLength(1);
    expect([
      resolveArtistsBatchMock.mock.calls.length,
      inspectLocalitiesMock.mock.calls.length,
      resolveVenuesMock.mock.calls.length,
      inspectToursMock.mock.calls.length,
    ]).toEqual(resolverCallCounts);
    await selectImportMode(wrapper, "Manual");
    expect(wrapper.find('[aria-label="Buscar y filtrar eventos del archivo"]').exists()).toBe(
      false
    );
    await selectImportMode(wrapper, "JSON de scraping");
    expect(wrapper.find('[aria-label="Buscar y filtrar eventos del archivo"]').exists()).toBe(true);
    expect(wrapper.get<HTMLInputElement>("#event-import-review-search").element.value).toBe(
      "bilbao"
    );
    await wrapper
      .get('nav[aria-label="Etapas de importación"] button[aria-label^="1. Cargar archivo"]')
      .trigger("click");
    const repeatedFileInput = wrapper.get<HTMLInputElement>(
      'input[aria-label="Seleccionar archivo JSON de eventos"]'
    );
    Object.defineProperty(repeatedFileInput.element, "files", {
      configurable: true,
      value: [file],
    });
    await repeatedFileInput.trigger("change");
    await flushPromises();
    const repeatImport = wrapper
      .findAll("button")
      .find((button) => button.text().includes("Analizar y resolver eventos"));
    await repeatImport!.trigger("click");
    await flushPromises();
    expect([
      resolveArtistsBatchMock.mock.calls.length,
      inspectLocalitiesMock.mock.calls.length,
      resolveVenuesMock.mock.calls.length,
      inspectToursMock.mock.calls.length,
    ]).toEqual(resolverCallCounts);
    expect(wrapper.text()).toContain("ya estaban cargados y se omitieron");
    expect(wrapper.findAll('input[aria-label^="Evento, fila"]')).toHaveLength(1);
  });

  it("loads a v2 Tour through the shared Tour resolver and event import contract", async () => {
    countriesMock.mockResolvedValueOnce(
      allowedCountries.map((country) =>
        country.isoCode === "ES"
          ? { ...country, id: "123e4567-e89b-42d3-a456-426614174000" }
          : country
      )
    );
    importEventBatchMock.mockImplementationOnce(async (snapshot) => ({
      batchId: snapshot.batchId,
      results: snapshot.rows.map((row) => ({
        operationRowId: row.operationRowId,
        rowKey: row.rowKey,
        revision: row.revision,
        result: { rowId: row.operationRowId, status: "created", eventId: "event-tour" },
      })),
    }));
    const wrapper = await mountImportView(undefined, true);
    await flushPromises();
    const json = JSON.stringify({
      format: "riffvalley.events-import",
      version: 2,
      source: { name: "Tour scraper" },
      country: "ES",
      events: [
        {
          type: "tour",
          title: "European Tour 2027",
          startDate: "2027-09-15",
          artists: ["Architects"],
          locality: "Madrid",
          province: "Madrid",
        },
      ],
    });
    const fileInput = wrapper.get<HTMLInputElement>(
      'input[aria-label="Seleccionar archivo JSON de eventos"]'
    );
    Object.defineProperty(fileInput.element, "files", {
      configurable: true,
      value: [new File([json], "tour.json", { type: "application/json" })],
    });
    await fileInput.trigger("change");
    await flushPromises();
    vi.useFakeTimers();
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Analizar y resolver eventos"))!
      .trigger("click");
    await vi.advanceTimersByTimeAsync(1350);
    await flushPromises();

    expect(wrapper.get<HTMLSelectElement>('select[aria-label="Tipo, fila 1"]').element.value).toBe(
      "tour"
    );
    expect(
      wrapper.get<HTMLInputElement>('input[aria-label="Nombre de gira, fila 1"]').element.value
    ).toBe("European Tour 2027");
    expect(inspectToursMock).toHaveBeenCalledWith(
      { names: ["European Tour 2027"] },
      expect.anything()
    );
    expect(wrapper.text()).toContain("1 fila preparada");
    expect(wrapper.text()).toContain("Motivos de intervención · 0 filas únicas");
    expect(wrapper.text()).not.toContain("Faltan datos obligatorios");

    await openImportStage(wrapper);
    await wrapper.get('button[aria-label="Importar filas listas"]').trigger("click");
    await flushPromises();
    expect(importEventBatchMock.mock.calls[0]?.[0].rows[0]).toMatchObject({
      dto: {
        type: "tour",
        name: "European Tour 2027",
        startDate: "2027-09-15",
        city: "Madrid",
      },
    });
    expect(importEventBatchMock.mock.calls[0]?.[0].rows[0]?.dto).not.toHaveProperty("tourId");
    wrapper.unmount();
    vi.useRealTimers();
  });

  it("rejects JSON files that exceed the size limit or have another extension", async () => {
    const wrapper = await mountImportView(undefined, true);
    await flushPromises();
    const input = wrapper.get<HTMLInputElement>(
      'input[aria-label="Seleccionar archivo JSON de eventos"]'
    );
    for (const file of [
      new File([new Uint8Array(SCRAPED_EVENT_JSON_MAX_BYTES + 1)], "large.json"),
      new File(["{}"], "events.txt", { type: "text/plain" }),
    ]) {
      Object.defineProperty(input.element, "files", { configurable: true, value: [file] });
      await input.trigger("change");
      await flushPromises();
      expect(wrapper.get('[role="alert"]').text()).toMatch(/2 MiB|\.json/u);
    }
    expect(wrapper.text()).not.toContain("eventos.json · fuente");
  });
});
