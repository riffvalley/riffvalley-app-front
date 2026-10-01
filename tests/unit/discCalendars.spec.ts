// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, nextTick, type Component } from "vue";
import DiscCalendar from "../../src/views/discsCalendar/DiscCalendar.vue";
import DiscCalendarBaby from "../../src/views/discsCalendarBaby/DiscCalendarBaby.vue";
import { useCatalogStore } from "@stores/catalog/catalog";
import { useAuthStore } from "@stores/auth/auth";

const { apiGet, apiPatch, errorToast } = vi.hoisted(() => ({ apiGet: vi.fn(), apiPatch: vi.fn(), errorToast: vi.fn() }));
vi.mock("@/shared/ui/errorToast", () => ({ showErrorToast: errorToast }));

vi.mock("@/shared/infrastructure/http/client", () => ({
  default: { get: apiGet, patch: apiPatch },
}));

class PassiveIntersectionObserver implements IntersectionObserver {
  static instances: PassiveIntersectionObserver[] = [];
  constructor() { PassiveIntersectionObserver.instances.push(this); }
  readonly root = null;
  readonly rootMargin = "0px";
  readonly thresholds = [0];
  disconnect = vi.fn();
  observe = vi.fn();
  takeRecords = vi.fn(() => []);
  unobserve = vi.fn();
}

const DiscFiltersStub = defineComponent({
  name: "DiscFilters",
  props: {
    searchQuery: String,
    selectedGenre: [String, Number],
    selectedCountry: String,
    genres: Array,
    countries: Array,
    showCountryFilter: Boolean,
  },
  emits: [
    "update:searchQuery",
    "update:selectedGenre",
    "update:selectedCountry",
    "reset-and-fetch",
  ],
  template: '<div data-testid="disc-filters" />',
});

const SimpleSelectStub = defineComponent({
  name: "SimpleSelect",
  props: { modelValue: [String, Number], options: Array },
  emits: ["update:modelValue"],
  template: '<div data-testid="year-select" />',
});

const DiscStub = defineComponent({
  name: "Disc",
  props: { disc: Object, genres: Array, countries: Array, focusDiscId: String, persistArtistUpdate: Function },
  emits: ["disc-deleted", "date-changed"],
  template: '<article data-testid="disc-card" :data-id="disc?.id" />',
});

const DiscBabyStub = defineComponent({
  name: "DiscBaby",
  props: { disc: Object, genres: Array, artistCountry: Object },
  template: '<article data-testid="disc-card" :data-id="disc?.id" />',
});

interface DiscFixture {
  id: string;
  name: string;
  releaseDate: string;
  artist: { id: string; name: string; country?: { id: string } };
  genre?: { id: string | number; name?: string };
}

interface GroupFixture {
  releaseDate: string;
  discs: DiscFixture[];
}

function response(data: GroupFixture[], totalItems = data.flatMap((group) => group.discs).length) {
  return { data: { data, totalItems, totalPages: 1, currentPage: 1, limit: 200 } };
}

function disc(id: string, name: string, genreId: string | number, releaseDate = "2026-09-18T00:00:00.000Z"): DiscFixture {
  return {
    id,
    name,
    releaseDate,
    artist: { id: "artist", name: "Banda" },
    genre: { id: genreId, name: "Rock" },
  };
}

function monthRange(year: number, month: number) {
  return [
    new Date(Date.UTC(year, month, 1)).toISOString(),
    new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString(),
  ];
}

function mountCalendar(
  component: Component,
  variant: "standard" | "baby",
  options: { loaded?: boolean; roles?: string[]; props?: Record<string, unknown> } = {},
) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const catalog = useCatalogStore();
  catalog.genres = [
    { id: "7", name: "Rock", color: "#000000" },
    { id: "empty", name: "", color: null },
  ];
  catalog.countries = [{ id: "ES", name: "España", isoCode: "ES" }];
  catalog.loaded = options.loaded ?? true;
  useAuthStore().roles = options.roles ?? [];

  const card = variant === "standard" ? DiscStub : DiscBabyStub;
  const wrapper = mount(component, {
    attachTo: document.body,
    props: options.props,
    global: {
      plugins: [pinia],
      stubs: {
        DiscFilters: DiscFiltersStub,
        SimpleSelect: SimpleSelectStub,
        DiscComponent: card,
        Disc: card,
        DiscBaby: card,
      },
    },
  });

  return { wrapper, catalog };
}

function filters(wrapper: VueWrapper) {
  return wrapper.findComponent({ name: "DiscFilters" });
}

function yearSelect(wrapper: VueWrapper) {
  return wrapper.findComponent({ name: "SimpleSelect" });
}

function cardIds(wrapper: VueWrapper) {
  return wrapper.findAll('[data-testid="disc-card"]').map((card) => card.attributes("data-id"));
}

describe("disc calendar legacy contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    PassiveIntersectionObserver.instances = [];
    vi.setSystemTime(new Date("2026-09-15T12:00:00.000Z"));
    vi.stubGlobal("IntersectionObserver", PassiveIntersectionObserver);
    apiGet.mockResolvedValue(response([]));
    apiPatch.mockResolvedValue(undefined);
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it.each([
    ["standard", DiscCalendar],
    ["baby", DiscCalendarBaby],
  ] as const)("%s calendar requests the UTC/local month and eagerly merges all 200-item pages", async (variant, component) => {
    const releaseDate = "2026-09-18T00:00:00.000Z";
    apiGet.mockImplementation((_url: string, config: { params: { offset: number } }) =>
      Promise.resolve(config.params.offset === 0
        ? response([{ releaseDate, discs: [disc("first", "Primero", "7", releaseDate)] }], 201)
        : response([{ releaseDate, discs: [disc("second", "Segundo", "7", releaseDate)] }], 201)),
    );

    const { wrapper } = mountCalendar(component, variant);
    await flushPromises();

    const dateRange = monthRange(2026, 8);
    expect(apiGet).toHaveBeenNthCalledWith(1, "/discs/date", {
      params: { limit: 200, offset: 0, dateRange },
    });
    expect(apiGet).toHaveBeenNthCalledWith(2, "/discs/date", {
      params: { limit: 200, offset: 200, dateRange },
    });
    expect(apiGet).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain("2 discos");
    wrapper.unmount();
  });

  it("keeps standard accent/space normalization and string-coerced genre matching", async () => {
    const releaseDate = "2026-09-18T00:00:00.000Z";
    apiGet.mockResolvedValue(response([{ releaseDate, discs: [
      disc("accent", "Álbum   Uno", 7, releaseDate),
      disc("plain", "Album dos", "7", releaseDate),
    ] }]));
    const { wrapper } = mountCalendar(DiscCalendar, "standard");
    await flushPromises();

    filters(wrapper).vm.$emit("update:searchQuery", "album uno");
    await nextTick();
    expect(cardIds(wrapper)).toEqual(["accent"]);

    filters(wrapper).vm.$emit("update:searchQuery", "");
    filters(wrapper).vm.$emit("update:selectedGenre", "7");
    await nextTick();
    expect(cardIds(wrapper)).toEqual(["accent", "plain"]);
    wrapper.unmount();
  });

  it("keeps baby search lowercase-only and genre matching type-strict", async () => {
    const releaseDate = "2026-09-18T00:00:00.000Z";
    apiGet.mockResolvedValue(response([{ releaseDate, discs: [
      disc("accent", "Álbum   Uno", 7, releaseDate),
      disc("plain", "Album dos", "7", releaseDate),
    ] }]));
    const { wrapper } = mountCalendar(DiscCalendarBaby, "baby");
    await flushPromises();
    await wrapper.find("div.cursor-pointer").trigger("click");

    filters(wrapper).vm.$emit("update:searchQuery", "album uno");
    await nextTick();
    expect(cardIds(wrapper)).toEqual([]);

    filters(wrapper).vm.$emit("update:searchQuery", "");
    filters(wrapper).vm.$emit("update:selectedGenre", "7");
    await nextTick();
    expect(cardIds(wrapper)).toEqual(["plain"]);
    wrapper.unmount();
  });

  it("changes a standard year to January and refetches country in both legacy parameter names", async () => {
    const { wrapper } = mountCalendar(DiscCalendar, "standard");
    await flushPromises();
    apiGet.mockClear();

    yearSelect(wrapper).vm.$emit("update:modelValue", 2030);
    await flushPromises();
    expect(apiGet).toHaveBeenLastCalledWith("/discs/date", {
      params: { limit: 200, offset: 0, dateRange: monthRange(2030, 0) },
    });

    apiGet.mockClear();
    filters(wrapper).vm.$emit("update:selectedCountry", "ES");
    await flushPromises();
    expect(apiGet).toHaveBeenLastCalledWith("/discs/date", {
      params: {
        limit: 200,
        offset: 0,
        dateRange: monthRange(2030, 0),
        country: "ES",
        countryId: "ES",
      },
    });
    wrapper.unmount();
  });

  it("persists a calendar artist edit through Catalog and updates its owning calendar data only after success", async () => {
    const releaseDate = "2026-09-18T00:00:00.000Z";
    apiGet.mockResolvedValue(response([{ releaseDate, discs: [disc("artist-disc", "Disco", "7", releaseDate)] }]));
    const { wrapper } = mountCalendar(DiscCalendar, "standard");
    await flushPromises();
    const card = wrapper.findComponent(DiscStub);

    await card.props("persistArtistUpdate")("artist", { name: "Nuevo nombre", countryId: "fr" });
    await nextTick();

    expect(apiPatch).toHaveBeenCalledWith("/artists/artist", { name: "Nuevo nombre", countryId: "fr" });
    expect(card.props("disc")).toMatchObject({ artist: { id: "artist", name: "Nuevo nombre", countryId: "fr" } });
    wrapper.unmount();
  });

  it("leaves calendar artist data unchanged when its Catalog update fails", async () => {
    const releaseDate = "2026-09-18T00:00:00.000Z";
    apiGet.mockResolvedValue(response([{ releaseDate, discs: [disc("artist-disc", "Disco", "7", releaseDate)] }]));
    apiPatch.mockRejectedValue(new Error("update failed"));
    const { wrapper } = mountCalendar(DiscCalendar, "standard");
    await flushPromises();
    const card = wrapper.findComponent(DiscStub);

    await expect(card.props("persistArtistUpdate")("artist", { name: "Nombre fallido" })).rejects.toThrow("update failed");
    expect(card.props("disc")).toMatchObject({ artist: { name: "Banda" } });
    wrapper.unmount();
  });

  it("keeps standard options loading and privileged group tools out of the baby calendar", async () => {
    const releaseDate = "2020-09-18T00:00:00.000Z";
    apiGet.mockResolvedValue(response([{ releaseDate, discs: [disc("one", "Uno", "7", releaseDate)] }]));
    const standard = mountCalendar(DiscCalendar, "standard", { loaded: false, roles: ["superUser"] });
    await flushPromises();
    expect(filters(standard.wrapper).props("showCountryFilter")).toBe(true);
    expect(standard.wrapper.text()).toContain("Cargando géneros y países…");
    expect(standard.wrapper.text()).toContain("Last.fm búsqueda");
    expect(standard.wrapper.text()).toContain("Buscar en Spotify");
    expect(standard.wrapper.text()).toContain("Exportar HTML");

    standard.catalog.loaded = true;
    await nextTick();
    expect(cardIds(standard.wrapper)).toEqual(["one"]);
    standard.wrapper.unmount();

    apiGet.mockClear();
    const baby = mountCalendar(DiscCalendarBaby, "baby");
    await flushPromises();
    expect(filters(baby.wrapper).props("showCountryFilter")).toBe(false);
    expect(baby.wrapper.text()).not.toContain("Last.fm búsqueda");
    expect(baby.wrapper.text()).not.toContain("Buscar en Spotify");
    expect(baby.wrapper.text()).not.toContain("Exportar HTML");
    baby.wrapper.unmount();
  });

  it("uses the embedded initial month, opens its local day and forwards the focus id", async () => {
    const releaseDate = "2024-02-15T12:00:00.000Z";
    apiGet.mockResolvedValue(response([{ releaseDate, discs: [disc("focus-me", "Objetivo", "7", releaseDate)] }]));
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;

    const { wrapper } = mountCalendar(DiscCalendar, "standard", {
      props: { embedded: true, initialDate: releaseDate, focusDiscId: "focus-me" },
    });
    await flushPromises();

    expect(apiGet).toHaveBeenCalledWith("/discs/date", {
      params: { limit: 200, offset: 0, dateRange: monthRange(2024, 1) },
    });
    expect(wrapper.text()).not.toContain("Todos los lanzamientos ordenados por fecha.");
    expect(cardIds(wrapper)).toEqual(["focus-me"]);
    expect(wrapper.findComponent({ name: "Disc" }).props("focusDiscId")).toBe("focus-me");
    expect(scrollIntoView).toHaveBeenCalled();
    wrapper.unmount();
  });

  it.each([
    ["standard", DiscCalendar], ["baby", DiscCalendarBaby],
  ] as const)("%s displays the same error toast once and permits month reselection", async (variant, component) => {
    apiGet.mockRejectedValueOnce(new Error("offline"));
    const { wrapper } = mountCalendar(component, variant);
    await flushPromises();
    expect(errorToast).toHaveBeenCalledOnce();
    expect(errorToast).toHaveBeenCalledWith("Error al cargar los discos");
    expect(apiGet).toHaveBeenCalledOnce();
    expect(wrapper.text()).not.toContain("Cargando discos...");
    const month = wrapper.findAll("button").find((button) => button.text() === "Octubre");
    await month!.trigger("click");
    await flushPromises();
    expect(apiGet).toHaveBeenCalledTimes(2);
    wrapper.unmount();
    expect(PassiveIntersectionObserver.instances).toHaveLength(2);
    for (const observer of PassiveIntersectionObserver.instances) expect(observer.disconnect).toHaveBeenCalledOnce();
  });

  it("baby also changes year to January and never sends country parameters", async () => {
    const { wrapper } = mountCalendar(DiscCalendarBaby, "baby");
    await flushPromises();
    filters(wrapper).vm.$emit("update:selectedCountry", "ES");
    await nextTick();
    expect(apiGet).toHaveBeenCalledOnce();
    yearSelect(wrapper).vm.$emit("update:modelValue", 2030);
    await flushPromises();
    expect(apiGet).toHaveBeenLastCalledWith("/discs/date", {
      params: { limit: 200, offset: 0, dateRange: monthRange(2030, 0) },
    });
    wrapper.unmount();
  });

  it("keeps date-change/removal events wired through the facade without repositioning cards", async () => {
    const releaseDate = "2026-09-18";
    apiGet.mockResolvedValue(response([{ releaseDate, discs: [disc("a", "Uno", "7"), disc("b", "Dos", "7")] }]));
    const { wrapper } = mountCalendar(DiscCalendar, "standard");
    await flushPromises();
    wrapper.findComponent({ name: "Disc" }).vm.$emit("date-changed", "a", "2026-10-01");
    await nextTick();
    expect(cardIds(wrapper)).toEqual(["b"]);
    wrapper.findComponent({ name: "Disc" }).vm.$emit("disc-deleted", "b");
    await nextTick();
    expect(wrapper.findAll("h3")).toHaveLength(0);
    expect(apiGet).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it("opens and scrolls an embedded target arriving on a later page after the transition", async () => {
    const releaseDate = "2024-02-15T12:00:00Z";
    apiGet.mockResolvedValueOnce(response([{ releaseDate: "2024-02-01", discs: [disc("first", "Primero", "7")] }], 201))
      .mockResolvedValueOnce(response([{ releaseDate, discs: [disc("later", "Objetivo", "7", releaseDate)] }], 201));
    const scroll = vi.fn();
    HTMLElement.prototype.scrollIntoView = scroll;
    vi.useRealTimers();
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    const { wrapper } = mountCalendar(DiscCalendar, "standard", {
      props: { embedded: true, initialDate: releaseDate, focusDiscId: "later" },
    });
    await flushPromises();
    await vi.advanceTimersByTimeAsync(380);
    expect(scroll).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
    expect(wrapper.find("#disc-later").element.closest(".overflow-x-auto")?.getAttribute("style") ?? "").not.toContain("display: none");
    wrapper.unmount();
  });

});
