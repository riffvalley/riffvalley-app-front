// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, h } from "vue";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";

const api = vi.hoisted(() => ({
  getDiscListPage: vi.fn(),
  getDiscListOptions: vi.fn(),
  getDiscListSuggestions: vi.fn(),
}));
const savedFiltersApi = vi.hoisted(() => ({
  getSavedDiscFilters: vi.fn(),
  createSavedDiscFilter: vi.fn(),
  updateSavedDiscFilter: vi.fn(),
  deleteSavedDiscFilter: vi.fn(),
}));
vi.mock("../../api/discList", () => api);
vi.mock("../../api/savedDiscFilters", () => savedFiltersApi);

import { useAuthStore } from "@/modules/identity/auth/stores/auth";
import DiscList from "./DiscListView.vue";

const FiltersStub = defineComponent({
  name: "DiscListExplorationFilters",
  props: ["searchQuery", "selectedCountry", "selectedWeek", "countries", "optionsError"],
  emits: ["update:search", "update:country", "update:week", "update:genres", "retry-options"],
  template:
    '<div data-testid="disc-filters"><button data-testid="genre-filter" @click="$emit(\'update:genres\', [\'genre-a\', \'genre-b\'])">Géneros</button><span v-if="optionsError">No se pudieron cargar los filtros de país y género.</span><slot name="savedActions" /></div>',
});

const createdDiscForModal = { id: "disc-created", name: "Disco recién creado" };
const CreateDiscModalStub = defineComponent({
  name: "CreateDiscModal",
  emits: ["close"],
  template:
    '<div data-testid="create-disc-modal"><button @click="$emit(\'close\', { createdDisc: null })">Cancelar alta</button><button @click="$emit(\'close\', { createdDisc: { ...createdDiscForModal } })">Cerrar alta</button></div>',
  setup() {
    return { createdDiscForModal };
  },
});

const SimpleSelectStub = defineComponent({
  name: "SimpleSelect",
  props: {
    modelValue: { type: [String, Number], default: "" },
    options: { type: Array, default: () => [] },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    return () =>
      h(
        "select",
        {
          "data-testid": "disc-order",
          value: props.modelValue,
          onChange: (event: Event) =>
            emit("update:modelValue", (event.target as HTMLSelectElement).value),
        },
        (props.options as Array<{ label: string; value: string }>).map((option) =>
          h("option", { value: option.value }, option.label)
        )
      );
  },
});

const DiscCardStub = defineComponent({
  name: "DiscCard",
  emits: ["rating-saved", "card-updated"],
  props: [
    "id",
    "name",
    "image",
    "artistName",
    "rate",
    "cover",
    "userDiscRate",
    "favoriteId",
    "pendingId",
    "commentCount",
    "rateCount",
    "averageRate",
    "averageCover",
  ],
  setup(props) {
    return () =>
      h("article", { "data-testid": "disc-card", "data-disc-id": props.id }, String(props.name));
  },
});

const intersectionCallbacks: IntersectionObserverCallback[] = [];
class IntersectionObserverStub {
  constructor(callback: IntersectionObserverCallback) {
    intersectionCallbacks.push(callback);
  }
  observe(): void {}
  disconnect(): void {}
  unobserve(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  readonly root = null;
  readonly rootMargin = "0px";
  readonly thresholds = [0];
}

function card(id: string, mode = "all") {
  const itemType =
    mode === "rates"
      ? "rate"
      : mode === "covers"
        ? "cover"
        : mode === "favorites"
          ? "favorite"
          : mode === "pendientes"
            ? "pending"
            : "disc";
  return {
    id,
    entryId: `${mode}-${id}`,
    itemType,
    name: `Disco ${id}`,
    image: `https://images.test/${id}.jpg`,
    releaseDate: "2025-03-01",
    link: null,
    ep: false,
    debut: true,
    artist: { name: "Artista", country: { id: "country-a", name: "España", isoCode: "ES" } },
    genre: { id: "genre-a", name: "Black Metal", color: "#123456" },
    averageRate: 8,
    averageCover: 7,
    voteCount: 4,
    commentCount: 3,
    userRate: { id: "rate-existing", rate: 8.5, cover: 7 },
    favoriteId: "favorite-existing",
    pendingId: "pending-existing",
  };
}

function page<T>(data: T[], totalItems = data.length) {
  return { data, totalItems, totalPages: Math.ceil(totalItems / 20), currentPage: 1, limit: 20 };
}

function comment(entryId: string) {
  return {
    itemType: "comment",
    entryId,
    comment: `Comentario ${entryId}`,
    createdAt: "2025-03-01T12:00:00.000Z",
    disc: {
      id: "same-disc",
      name: "Disco comentado",
      image: "cover.jpg",
      releaseDate: "2025-03-01",
      artist: { name: "Artista", country: { id: "country-a", name: "España", isoCode: "ES" } },
      genre: { id: "genre-a", name: "Black Metal", color: "#123456" },
    },
  };
}

function mountList(useRealExplorationFilters = false) {
  const pinia = createPinia();
  setActivePinia(pinia);
  useAuthStore(pinia).$patch({
    authStatus: "authenticated",
    token: "session-token",
    userId: "user-a",
    role: "riffvalley",
    authSessionGeneration: 1,
  });
  return mount(DiscList, {
    global: {
      plugins: [
        pinia,
        [
          VueQueryPlugin,
          { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
        ],
      ],
      stubs: {
        ...(useRealExplorationFilters ? {} : { DiscListExplorationFilters: FiltersStub }),
        SimpleSelect: SimpleSelectStub,
        DiscCard: DiscCardStub,
        CreateDiscModal: CreateDiscModalStub,
        CircleFlags: true,
      },
    },
  });
}

async function settle() {
  await flushPromises();
}
async function openCreateDiscFromEmptySuggestions(
  wrapper: ReturnType<typeof mountList>,
  query: string
) {
  const input = wrapper.get<HTMLInputElement>("#disc-list-search-input");
  await input.trigger("focus");
  await input.setValue(query);
  await new Promise((resolve) => setTimeout(resolve, 300));
  await settle();
  const addButton = [
    ...(document.body.querySelectorAll(
      ".disc-list-autocomplete-popup button"
    ) as NodeListOf<HTMLButtonElement>),
  ].find((button) => button.textContent?.includes("Añadir disco"));
  if (!addButton) throw new Error("Empty suggestions did not offer to add a disc");
  addButton.click();
  await settle();
}

async function selectMode(wrapper: ReturnType<typeof mountList>, mode: string) {
  await wrapper.get(`input[type="radio"][value="${mode}"]`).setValue();
  await settle();
}

beforeEach(() => {
  intersectionCallbacks.length = 0;
  vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 1000,
    width: 1,
    height: 1,
    top: 1000,
    right: 1,
    bottom: 1001,
    left: 0,
    toJSON: () => ({}),
  } as DOMRect);
  api.getDiscListPage
    .mockReset()
    .mockImplementation(async (request) =>
      request.mode === "comments"
        ? page([comment("comment-first")])
        : page([card(`${request.mode}-first`, request.mode)])
    );
  api.getDiscListOptions.mockReset().mockResolvedValue({
    countries: [{ id: "country-a", name: "España", isoCode: "ES" }],
    genres: [
      { id: "genre-a", name: "Black Metal", color: "#123456" },
      { id: "genre-b", name: "Death Metal", color: null },
    ],
  });
  api.getDiscListSuggestions.mockReset().mockResolvedValue({ artists: [], discs: [] });
  savedFiltersApi.getSavedDiscFilters.mockReset().mockResolvedValue([]);
  savedFiltersApi.createSavedDiscFilter.mockReset().mockImplementation(async (payload) => ({
    id: "saved-filter-a", name: payload.name, filters: payload.filters,
    missingGenreIds: [], countryMissing: false, createdAt: "", updatedAt: "",
  }));
  savedFiltersApi.updateSavedDiscFilter.mockReset().mockImplementation(async (id, payload) => ({
    id, name: payload.name ?? "Metal", filters: payload.filters ?? { genreIds: [], countryId: null, yearFrom: null, yearTo: null },
    missingGenreIds: [], countryMissing: false, createdAt: "", updatedAt: "",
  }));
  savedFiltersApi.deleteSavedDiscFilter.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  localStorage.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("DiscList new backend integration", () => {
  it("shows an accessible no-votes switch after genres and requests eligible discs", async () => {
    localStorage.setItem("rv_default_year_filter", "all");
    const wrapper = mountList(true);
    await settle();

    const noRatesSwitch = wrapper.get<HTMLInputElement>('input[role="switch"]');
    expect(noRatesSwitch.attributes("aria-label")).toBe("Mostrar solo discos sin votos");
    expect(wrapper.get(".no-rates-control #disc-list-no-rates-label").text()).toBe("Sin votos");
    expect(wrapper.get(".genre-control").element.compareDocumentPosition(noRatesSwitch.element) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();

    await noRatesSwitch.setValue(true);
    await settle();
    expect(api.getDiscListPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ eligibility: "noRates", offset: 0 })
    );
  });

  it("keeps the saved-filter label and control aligned with search and places states outside the control", async () => {
    let resolveSavedFilters!: (filters: []) => void;
    savedFiltersApi.getSavedDiscFilters.mockReturnValue(new Promise((resolve) => {
      resolveSavedFilters = resolve;
    }));
    const wrapper = mountList();
    expect(wrapper.text()).toContain("Cargando filtros guardados…");
    resolveSavedFilters([]);
    await settle();
    expect(wrapper.text()).toContain("Aún no tienes filtros guardados.");
    expect(wrapper.get("#saved-disc-filter-label").classes()).toEqual(
      wrapper.get("#disc-list-search-label").classes()
    );
    expect(wrapper.get("#saved-disc-filter").classes()).toContain("min-h-[50px]");
    expect(wrapper.findAll("button").some((button) => button.text() === "Aplicar")).toBe(false);
    expect(wrapper.findComponent({ name: "SavedDiscFilterSelector" }).find("section").exists()).toBe(false);
    wrapper.unmount();

    savedFiltersApi.getSavedDiscFilters.mockRejectedValue(new Error("offline"));
    const failedWrapper = mountList();
    await settle();
    const status = failedWrapper.get('[role="alert"]');
    expect(status.text()).toContain("No se pudieron cargar tus filtros guardados.");
    expect(status.find("#saved-disc-filter").exists()).toBe(false);
    failedWrapper.unmount();
  });

  it("blocks creating another filter when the user already has 20", async () => {
    savedFiltersApi.getSavedDiscFilters.mockResolvedValue(Array.from({ length: 20 }, (_, index) => ({
      id: `saved-filter-${index}`,
      name: `Filtro ${index}`,
      filters: { genreIds: [`genre-${index}`], countryId: null, yearFrom: null, yearTo: null },
      missingGenreIds: [],
      countryMissing: false,
      createdAt: "",
      updatedAt: "",
    })));
    const wrapper = mountList();
    await settle();
    await wrapper.get('[data-testid="genre-filter"]').trigger("click");
    await settle();
    expect(wrapper.text()).toContain("Has alcanzado el límite de 20 filtros.");
    const saveButton = wrapper.findAll("button").find((button) => button.text().startsWith("Guardar"));
    expect(saveButton?.attributes("disabled")).toBeDefined();
    wrapper.unmount();
  });

  it("loads saved filters and creates a named filter from the compact modal", async () => {
    const wrapper = mountList();
    await settle();
    expect(savedFiltersApi.getSavedDiscFilters).toHaveBeenCalledTimes(1);
    await wrapper.get('[data-testid="genre-filter"]').trigger("click");
    await settle();
    const saveButton = wrapper.findAll("button").find((button) => button.text() === "Guardar");
    expect(saveButton).toBeDefined();
    await saveButton!.trigger("click");
    await wrapper.get("#saved-filter-name").setValue("Metal extremo");
    expect(wrapper.text()).toContain("Black Metal, Death Metal");
    await wrapper.findAll("form").at(1)!.trigger("submit");
    await settle();
    expect(savedFiltersApi.createSavedDiscFilter).toHaveBeenCalledWith({
      name: "Metal extremo",
      filters: { genreIds: ["genre-a", "genre-b"], countryId: null, yearFrom: null, yearTo: null },
    });
    expect(wrapper.text()).toContain("Filtro «Metal extremo» guardado.");
    wrapper.unmount();
  });

  it("recognizes an equivalent saved combination and hides duplicate creation", async () => {
    savedFiltersApi.getSavedDiscFilters.mockResolvedValue([{
      id: "saved-filter-existing", name: "Metal ya guardado",
      filters: { genreIds: ["genre-a", "genre-b"], countryId: null, yearFrom: null, yearTo: null },
      missingGenreIds: [], countryMissing: false, createdAt: "", updatedAt: "",
    }]);
    const wrapper = mountList();
    await settle();
    await wrapper.get('[data-testid="genre-filter"]').trigger("click");
    await settle();
    expect(wrapper.text()).toContain("Guardado");
    expect(wrapper.text()).not.toContain("Guardado como Metal ya guardado");
    expect(wrapper.findAll("button").some((button) => button.text() === "Guardar")).toBe(false);
    wrapper.unmount();
  });

  it("applies saved criteria without clearing search, mode or ordering", async () => {
    savedFiltersApi.getSavedDiscFilters.mockResolvedValue([{
      id: "saved-filter-a", name: "Años 2025–2026",
      filters: { genreIds: ["genre-b", "genre-a"], countryId: "country-a", yearFrom: 2025, yearTo: 2026 },
      missingGenreIds: [], countryMissing: false, createdAt: "", updatedAt: "",
    }]);
    const wrapper = mountList();
    await settle();
    await wrapper.get("#disc-list-search-input").setValue("MØL");
    await selectMode(wrapper, "favorites");
    await wrapper.get("#saved-disc-filter").setValue("saved-filter-a");
    await settle();
    expect(api.getDiscListPage).toHaveBeenLastCalledWith(expect.objectContaining({
      mode: "favorites", query: "MØL", genreIds: ["genre-a", "genre-b"], countryId: "country-a",
      dateRange: ["2025-01-01T00:00:00.000Z", "2026-12-31T23:59:59.999Z"], offset: 0,
    }));
    expect(wrapper.text()).toContain("Años 2025–2026 · aplicado");

    await wrapper.get("#saved-disc-filter").setValue("");
    await settle();
    expect(api.getDiscListPage).toHaveBeenLastCalledWith(expect.objectContaining({
      mode: "favorites", query: "MØL", genreIds: [], countryId: "", dateRange: null, offset: 0,
    }));
    expect(wrapper.get("#disc-list-search-input").element).toHaveProperty("value", "MØL");
    expect(wrapper.text()).toContain("Sin guardar");
    wrapper.unmount();
  });

  it("renames and deletes the selected saved filter after confirmation", async () => {
    savedFiltersApi.getSavedDiscFilters.mockResolvedValue([{
      id: "saved-filter-a", name: "Metal",
      filters: { genreIds: ["genre-a"], countryId: null, yearFrom: null, yearTo: null },
      missingGenreIds: [], countryMissing: false, createdAt: "", updatedAt: "",
    }]);
    const wrapper = mountList();
    await settle();
    await wrapper.get("#saved-disc-filter").setValue("saved-filter-a");
    await wrapper.findAll("button").find((button) => button.text() === "Renombrar")!.trigger("click");
    await wrapper.get("#saved-filter-name").setValue("Death Metal");
    savedFiltersApi.getSavedDiscFilters.mockResolvedValue([{
      id: "saved-filter-a", name: "Death Metal",
      filters: { genreIds: ["genre-a"], countryId: null, yearFrom: null, yearTo: null },
      missingGenreIds: [], countryMissing: false, createdAt: "", updatedAt: "",
    }]);
    await wrapper.findAll("form").at(1)!.trigger("submit");
    await settle();
    expect(savedFiltersApi.updateSavedDiscFilter).toHaveBeenCalledWith("saved-filter-a", { name: "Death Metal" });
    expect(wrapper.text()).toContain("Filtro renombrado a «Death Metal».");

    await wrapper.findAll("button").find((button) => button.text() === "Eliminar")!.trigger("click");
    await settle();
    expect(wrapper.get('[role="dialog"]').text()).toContain("¿Eliminar el filtro «Death Metal»?");
    await wrapper.findAll("button").find((button) => button.text() === "Eliminar filtro")!.trigger("click");
    await settle();
    expect(savedFiltersApi.deleteSavedDiscFilter).toHaveBeenCalledWith("saved-filter-a");
    wrapper.unmount();
  });

  it("updates the applied filter only after explicit confirmation", async () => {
    savedFiltersApi.getSavedDiscFilters.mockResolvedValue([{
      id: "saved-filter-a", name: "Metal",
      filters: { genreIds: ["genre-a"], countryId: null, yearFrom: null, yearTo: null },
      missingGenreIds: [], countryMissing: false, createdAt: "", updatedAt: "",
    }]);
    const wrapper = mountList();
    await settle();
    await wrapper.get("#saved-disc-filter").setValue("saved-filter-a");
    await settle();
    await wrapper.get('[data-testid="genre-filter"]').trigger("click");
    await settle();
    expect(savedFiltersApi.updateSavedDiscFilter).not.toHaveBeenCalled();
    await wrapper.findAll("button").find((button) => button.text() === "Actualizar")!.trigger("click");
    await settle();
    expect(wrapper.get('[role="dialog"]').text()).toContain("¿Actualizar «Metal» con los criterios actuales?");
    expect(savedFiltersApi.updateSavedDiscFilter).not.toHaveBeenCalled();
    await wrapper.findAll("button").find((button) => button.text() === "Actualizar filtro")!.trigger("click");
    await settle();
    expect(savedFiltersApi.updateSavedDiscFilter).toHaveBeenCalledWith("saved-filter-a", {
      filters: { genreIds: ["genre-a", "genre-b"], countryId: null, yearFrom: null, yearTo: null },
    });
    wrapper.unmount();
  });

  it("warns when applying a saved filter with deleted genre and country references", async () => {
    savedFiltersApi.getSavedDiscFilters.mockResolvedValue([{
      id: "saved-filter-stale", name: "Referencias antiguas",
      filters: { genreIds: ["genre-gone"], countryId: "country-gone", yearFrom: 2025, yearTo: 2025 },
      missingGenreIds: ["genre-gone"], countryMissing: true, createdAt: "", updatedAt: "",
    }]);
    const wrapper = mountList();
    await settle();
    await wrapper.get("#saved-disc-filter").setValue("saved-filter-stale");
    await settle();
    expect(wrapper.get('[role="alert"]').text()).toContain("género(s) que ya no existen y un país que ya no existe");
    expect(api.getDiscListPage).toHaveBeenLastCalledWith(expect.objectContaining({
      genreIds: ["genre-gone"], countryId: "country-gone", offset: 0,
    }));
    wrapper.unmount();
  });

  it("shows the backend limit error in the save modal", async () => {
    savedFiltersApi.createSavedDiscFilter.mockRejectedValue({
      response: { status: 409, data: { code: "SAVED_DISC_FILTER_LIMIT_REACHED" } },
    });
    const wrapper = mountList();
    await settle();
    await wrapper.get('[data-testid="genre-filter"]').trigger("click");
    await wrapper.findAll("button").find((button) => button.text() === "Guardar")!.trigger("click");
    await wrapper.get("#saved-filter-name").setValue("Metal extremo");
    await wrapper.findAll("form").at(1)!.trigger("submit");
    await settle();
    expect(wrapper.get('[role="alert"]').text()).toContain("límite de 20 filtros guardados");
    wrapper.unmount();
  });

  it("refreshes the current list and preserves the active filters after a successful creation", async () => {
    const wrapper = mountList();
    await settle();
    await openCreateDiscFromEmptySuggestions(wrapper, "Doom");
    await settle();
    await wrapper.get('[data-testid="genre-filter"]').trigger("click");
    await settle();
    const callsBeforeCreate = api.getDiscListPage.mock.calls.length;
    const optionCallsBeforeCreate = api.getDiscListOptions.mock.calls.length;
    const suggestionCallsBeforeCreate = api.getDiscListSuggestions.mock.calls.length;

    expect(wrapper.find('[data-testid="create-disc-modal"]').exists()).toBe(true);
    await wrapper.get('[data-testid="create-disc-modal"] button:nth-child(2)').trigger("click");
    await settle();

    expect(api.getDiscListPage.mock.calls.length).toBeGreaterThan(callsBeforeCreate);
    expect(api.getDiscListOptions.mock.calls.length).toBeGreaterThan(optionCallsBeforeCreate);
    expect(api.getDiscListSuggestions.mock.calls.length).toBeGreaterThan(suggestionCallsBeforeCreate);
    expect(api.getDiscListPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: "Doom", genreIds: ["genre-a", "genre-b"] })
    );
    expect(wrapper.get("#disc-list-search-input").element).toHaveProperty("value", "Doom");
    expect(wrapper.text()).toContain("El disco se ha creado y el listado se ha actualizado");
    wrapper.unmount();
  });

  it("shows a backend result for the created disc when it matches the active filters", async () => {
    const createdCard = card("disc-created");
    createdCard.name = "Disco recién creado";
    api.getDiscListPage.mockImplementation(async (request) =>
      request.query === "created disc" ? page([createdCard]) : page([card("other-result")])
    );
    const wrapper = mountList();
    await settle();
    await openCreateDiscFromEmptySuggestions(wrapper, "created disc");
    await wrapper.get('[data-testid="create-disc-modal"] button:nth-child(2)').trigger("click");
    await settle();

    expect(wrapper.find('[data-disc-id="disc-created"]').text()).toContain("Disco recién creado");
    expect(api.getDiscListPage).toHaveBeenCalledWith(expect.objectContaining({ offset: 0 }));
    wrapper.unmount();
  });

  it("does not clear filters when the created disc is excluded by the current search", async () => {
    const wrapper = mountList();
    await settle();
    await openCreateDiscFromEmptySuggestions(wrapper, "missing title");
    await settle();
    await wrapper.get('[data-testid="create-disc-modal"] button:nth-child(2)').trigger("click");
    await settle();

    expect(wrapper.get("#disc-list-search-input").element).toHaveProperty("value", "missing title");
    expect(api.getDiscListPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: "missing title" })
    );
    expect(wrapper.text()).toContain(
      "Si no aparece, revisa el texto y los filtros activos; no se han cambiado."
    );
    wrapper.unmount();
  });

  it("provides a labeled search field and clears only its search criterion", async () => {
    const wrapper = mountList();
    await settle();
    const input = wrapper.get<HTMLInputElement>("#disc-list-search-input");
    expect(wrapper.get("#disc-list-search-label").text()).toContain("Buscar discos o artistas");
    await input.setValue("Doom");
    await settle();
    expect(api.getDiscListPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: "Doom" })
    );
    await wrapper.get('button[aria-label="Limpiar búsqueda"]').trigger("click");
    await settle();
    expect(api.getDiscListPage).toHaveBeenLastCalledWith(expect.objectContaining({ query: "" }));
    expect(wrapper.find('button[aria-label="Limpiar búsqueda"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("keeps live list filtering and applies an artist suggestion by exact ID without an Enter reload", async () => {
    vi.useFakeTimers();
    const wrapper = mountList();
    await settle();
    api.getDiscListSuggestions.mockResolvedValue({
      artists: [
        {
          id: "artist-exact-id",
          name: "MØL",
          image: null,
          country: { id: "country-a", name: "Dinamarca", isoCode: "DK" },
        },
      ],
      discs: [],
    });
    const input = wrapper.get<HTMLInputElement>("#disc-list-search-input");
    await input.setValue("MØL");
    await settle();
    expect(api.getDiscListPage.mock.calls.at(-1)?.[0]).toMatchObject({ query: "MØL" });
    expect(api.getDiscListPage.mock.calls.at(-1)?.[0]).not.toHaveProperty("artistId");

    const pageCallsBeforeEnter = api.getDiscListPage.mock.calls.length;
    await vi.advanceTimersByTimeAsync(250);
    await settle();
    await input.trigger("keydown", { key: "Enter" });
    await settle();
    expect(api.getDiscListPage).toHaveBeenCalledTimes(pageCallsBeforeEnter);

    await input.trigger("keydown", { key: "ArrowDown" });
    await settle();
    const artistOption = document.body.querySelector<HTMLButtonElement>(
      '[role="option"][id$="artist-artist-exact-id"]'
    );
    expect(artistOption).not.toBeNull();
    artistOption?.click();
    await settle();

    expect(api.getDiscListPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: "MØL", artistId: "artist-exact-id", offset: 0 })
    );
    expect(api.getDiscListOptions).toHaveBeenLastCalledWith(
      expect.objectContaining({ artistId: "artist-exact-id" })
    );
    expect(wrapper.get("#disc-list-search-input").element).toHaveProperty("value", "MØL");
    expect(wrapper.get('[data-testid="selected-artist-filter"]').text()).toContain("MØL");
    wrapper.unmount();
  });

  it("fills the search with the disc title when selecting a disc suggestion", async () => {
    vi.useFakeTimers();
    const wrapper = mountList();
    await settle();
    api.getDiscListSuggestions.mockResolvedValue({
      artists: [],
      discs: [
        {
          id: "disc-suggestion-id",
          title: "Jord",
          artistId: "artist-id",
          artistName: "MØL",
          image: null,
        },
      ],
    });
    const input = wrapper.get<HTMLInputElement>("#disc-list-search-input");
    await input.setValue("Jord");
    await settle();
    await vi.advanceTimersByTimeAsync(250);
    await settle();
    const beforeSelect = api.getDiscListPage.mock.calls.length;
    document.body
      .querySelector<HTMLButtonElement>('[role="option"][id$="disc-disc-suggestion-id"]')
      ?.click();
    await settle();
    expect(wrapper.get("#disc-list-search-input").element).toHaveProperty(
      "value",
      "Jord"
    );
    expect(wrapper.find('[data-testid="suggested-disc-detail"]').exists()).toBe(false);
    expect(api.getDiscListPage).toHaveBeenCalledTimes(beforeSelect);
    expect(api.getDiscListPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: "Jord", offset: 0 })
    );
    wrapper.unmount();
  });

  it("batches exploration clearing into one request and leaves mode and order intact", async () => {
    const wrapper = mountList(true);
    await settle();
    const pageCallsBefore = api.getDiscListPage.mock.calls.length;
    const optionCallsBefore = api.getDiscListOptions.mock.calls.length;
    const clearButton = wrapper
      .findAll("button")
      .find((button) => button.text() === "Limpiar exploración");
    expect(clearButton).toBeDefined();
    await clearButton?.trigger("click");
    await settle();

    expect(api.getDiscListPage).toHaveBeenCalledTimes(pageCallsBefore + 1);
    expect(api.getDiscListOptions).toHaveBeenCalledTimes(optionCallsBefore + 1);
    expect(api.getDiscListPage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        mode: "all",
        orderBy: "disc.releaseDate:DESC,artist.name:ASC",
        query: "",
        dateRange: null,
      })
    );
    wrapper.unmount();
  });

  it("loads the first page from the shared endpoint and adapts private card data", async () => {
    const wrapper = mountList();
    await settle();
    expect(api.getDiscListPage).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "all", offset: 0, limit: 20, genreIds: [], countryId: "" })
    );
    expect(wrapper.findComponent(DiscCardStub).props()).toMatchObject({
      id: "all-first",
      rate: 8.5,
      cover: 7,
      userDiscRate: "rate-existing",
      favoriteId: "favorite-existing",
      pendingId: "pending-existing",
    });
    expect(api.getDiscListOptions).toHaveBeenCalledWith(expect.objectContaining({ mode: "all" }));
    wrapper.unmount();
  });

  it.each(["rates", "covers", "comments", "favorites", "pendientes"])(
    "uses the new endpoint for %s",
    async (mode) => {
      const wrapper = mountList();
      await settle();
      await selectMode(wrapper, mode);
      expect(api.getDiscListPage).toHaveBeenLastCalledWith(
        expect.objectContaining({ mode, offset: 0, limit: 20 })
      );
      expect(api.getDiscListOptions).toHaveBeenLastCalledWith(expect.objectContaining({ mode }));
      if (mode !== "comments") expect(wrapper.findAllComponents(DiscCardStub)).toHaveLength(1);
      wrapper.unmount();
    }
  );

  it("loads dynamic options and sends changed country, period, search, and multi-genre criteria", async () => {
    const wrapper = mountList();
    await settle();
    const filters = wrapper.findComponent(FiltersStub);
    filters.vm.$emit("update:country", "country-a");
    filters.vm.$emit("update:search", " Doom ");
    filters.vm.$emit("update:week", ["2025-01-01T00:00:00.000Z", "2025-12-31T23:59:59.999Z"]);
    await wrapper.get('[data-testid="genre-filter"]').trigger("click");
    await settle();

    expect(api.getDiscListPage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        query: "Doom",
        countryId: "country-a",
        genreIds: ["genre-a", "genre-b"],
        offset: 0,
      })
    );
    expect(api.getDiscListOptions).toHaveBeenLastCalledWith(
      expect.objectContaining({
        query: "Doom",
        countryId: "country-a",
        genreIds: ["genre-a", "genre-b"],
        dateRange: ["2025-01-01T00:00:00.000Z", "2025-12-31T23:59:59.999Z"],
      })
    );
    expect(wrapper.findComponent(FiltersStub).props("countries")).toEqual([
      { id: "country-a", name: "España", isoCode: "ES" },
    ]);
    wrapper.unmount();
  });

  it("keeps forward-only pagination and resets offset when filters change", async () => {
    api.getDiscListPage
      .mockResolvedValueOnce(
        page(
          Array.from({ length: 20 }, (_, index) => card(`first-${index}`)),
          25
        )
      )
      .mockResolvedValueOnce(page([card("next")], 25))
      .mockResolvedValueOnce(page([card("filtered")], 1));
    const wrapper = mountList();
    await settle();
    intersectionCallbacks[0]?.(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver
    );
    await settle();
    expect(api.getDiscListPage.mock.calls.map(([request]) => request.offset)).toEqual([0, 20]);
    expect(wrapper.findAllComponents(DiscCardStub)).toHaveLength(21);

    wrapper.findComponent(FiltersStub).vm.$emit("update:search", "nuevo");
    await settle();
    expect(api.getDiscListPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: "nuevo", offset: 0 })
    );
    expect(wrapper.findAllComponents(DiscCardStub).map((item) => item.props("id"))).toEqual([
      "filtered",
    ]);
    wrapper.unmount();
  });

  it("discards stale result responses after a fast criteria change", async () => {
    let resolveA!: (value: ReturnType<typeof page>) => void;
    api.getDiscListPage
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveA = resolve;
        })
      )
      .mockResolvedValueOnce(page([card("current")], 1));
    const wrapper = mountList();
    wrapper.findComponent(FiltersStub).vm.$emit("update:search", "B");
    await settle();
    expect(api.getDiscListPage).toHaveBeenCalledTimes(2);
    resolveA(page([card("stale")], 1));
    await settle();
    expect(wrapper.findAllComponents(DiscCardStub).map((item) => item.props("id"))).toEqual([
      "current",
    ]);
    wrapper.unmount();
  });

  it("shows a separate retryable options error while keeping result cards available", async () => {
    api.getDiscListOptions.mockRejectedValueOnce(new Error("options offline"));
    const wrapper = mountList();
    await settle();
    expect(wrapper.text()).toContain("No se pudieron cargar los filtros de país y género.");
    expect(wrapper.findAllComponents(DiscCardStub)).toHaveLength(1);
    wrapper.unmount();
  });

  it("updates community state in this list without refetching after a card mutation", async () => {
    const wrapper = mountList();
    await settle();
    const pageCallsBefore = api.getDiscListPage.mock.calls.length;
    const optionCallsBefore = api.getDiscListOptions.mock.calls.length;
    wrapper.findComponent(DiscCardStub).vm.$emit("card-updated", {
      type: "community",
      discId: "all-first",
      favoriteId: "favorite-updated",
      pendingId: null,
    });
    await settle();
    expect(api.getDiscListPage).toHaveBeenCalledTimes(pageCallsBefore);
    expect(api.getDiscListOptions).toHaveBeenCalledTimes(optionCallsBefore);
    expect(wrapper.findComponent(DiscCardStub).props("favoriteId")).toBe("favorite-updated");
    wrapper.unmount();
  });
});
