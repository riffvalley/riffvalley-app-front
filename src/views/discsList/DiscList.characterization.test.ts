// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, h } from "vue";

const api = vi.hoisted(() => ({
  getDiscs: vi.fn(),
  getRatesByUser: vi.fn(),
  getFavoritesByUser: vi.fn(),
  getPendingsByUser: vi.fn(),
  getCommentsByUser: vi.fn(),
}));

vi.mock("@services/discs/discs", () => ({ getDiscs: api.getDiscs }));
vi.mock("@services/rates/rates", () => ({ getRatesByUser: api.getRatesByUser }));
vi.mock("@services/favorites/favorites", () => ({ getFavoritesByUser: api.getFavoritesByUser }));
vi.mock("@services/pendings/pendings", () => ({ getPendingsByUser: api.getPendingsByUser }));
vi.mock("@services/comments/comments", () => ({ getCommentsByUser: api.getCommentsByUser }));

import { useCatalogStore } from "@stores/catalog/catalog";
import DiscList from "./DiscList.vue";

const FiltersStub = defineComponent({
  name: "DiscFilters",
  props: ["searchQuery", "selectedGenre", "selectedCountry", "selectedWeek"],
  emits: [
    "update:searchQuery",
    "update:selectedGenre",
    "update:selectedCountry",
    "update:selectedWeek",
  ],
  template: '<div data-testid="disc-filters"></div>',
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
      h(
        "article",
        {
          "data-testid": "disc-card",
          "data-disc-id": props.id,
        },
        String(props.name)
      );
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

const dateRange: [string, string] = ["2024-01-01T00:00:00.000Z", "2024-12-31T23:59:59.999Z"];

function page<T>(data: T[], totalItems = data.length) {
  return { data, totalItems, totalPages: Math.ceil(totalItems / 20), currentPage: 1, limit: 20 };
}

function disc(id: string) {
  return {
    id,
    name: `Disco ${id}`,
    image: `https://images.test/${id}.jpg`,
    releaseDate: "2024-03-01",
    artist: { id: "artist-1", name: "Artista", country: undefined },
    genre: { id: "genre-1", name: "Rock", color: "#123456" },
    averageRate: 8,
    averageCover: 7,
    commentCount: 3,
    voteCount: 4,
    userRate: { id: "rate-existing", rate: "8.50", cover: "7.00" },
    favoriteId: "favorite-existing",
    pendingId: "pending-existing",
  };
}

function mountList() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const catalog = useCatalogStore(pinia);
  catalog.$patch({
    genres: [{ id: "genre-1", name: "Rock", color: "#123456" }],
    countries: [{ id: "country-1", name: "España", isoCode: "ES" }],
  });

  return mount(DiscList, {
    global: {
      plugins: [pinia],
      stubs: {
        DiscFilters: FiltersStub,
        SimpleSelect: SimpleSelectStub,
        DiscCard: DiscCardStub,
        CircleFlags: true,
        "font-awesome-icon": true,
      },
    },
  });
}

async function settle() {
  await flushPromises();
}

async function selectMode(wrapper: ReturnType<typeof mountList>, mode: string) {
  await wrapper.get(`input[type="radio"][value="${mode}"]`).setValue();
  await settle();
}

async function setFilters(
  wrapper: ReturnType<typeof mountList>,
  filters: { query?: string; country?: string; genre?: string; dateRange?: [string, string] | null }
) {
  const control = wrapper.findComponent(FiltersStub);
  if (filters.query !== undefined) control.vm.$emit("update:searchQuery", filters.query);
  if (filters.country !== undefined) control.vm.$emit("update:selectedCountry", filters.country);
  if (filters.genre !== undefined) control.vm.$emit("update:selectedGenre", filters.genre);
  if (filters.dateRange !== undefined) control.vm.$emit("update:selectedWeek", filters.dateRange);
  await settle();
}

beforeEach(() => {
  localStorage.clear();
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
  api.getDiscs.mockReset().mockResolvedValue(page([]));
  api.getRatesByUser.mockReset().mockResolvedValue(page([]));
  api.getFavoritesByUser.mockReset().mockResolvedValue(page([]));
  api.getPendingsByUser.mockReset().mockResolvedValue(page([]));
  api.getCommentsByUser.mockReset().mockResolvedValue(page([]));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("DiscList current behavior", () => {
  it("loads Todos first with 20-item pages and normalizes the card's personal state", async () => {
    api.getDiscs.mockResolvedValueOnce(page([disc("all-1")], 1));
    const wrapper = mountList();
    await settle();

    expect(api.getDiscs).toHaveBeenCalledWith(
      20,
      0,
      "",
      null,
      "",
      "",
      "disc.releaseDate:DESC,artist.name:ASC",
      undefined,
      undefined
    );
    expect(wrapper.findAllComponents(DiscCardStub)).toHaveLength(1);
    expect(wrapper.findComponent(DiscCardStub).props()).toMatchObject({
      id: "all-1",
      rate: 8.5,
      cover: 7,
      userDiscRate: "rate-existing",
      favoriteId: "favorite-existing",
      pendingId: "pending-existing",
    });
    expect(wrapper.text()).toContain("(1)");
    wrapper.unmount();
  });

  it.each([
    ["rates", "getRatesByUser"],
    ["covers", "getRatesByUser"],
    ["comments", "getCommentsByUser"],
    ["favorites", "getFavoritesByUser"],
    ["pendientes", "getPendingsByUser"],
  ] as const)(
    "uses the %s mode endpoint, combines active filters, and replaces previous results",
    async (mode, endpoint) => {
      api.getDiscs.mockResolvedValueOnce(page([disc("previous-all")], 1));
      const wrapper = mountList();
      await settle();

      await setFilters(wrapper, {
        query: "artista",
        country: "country-1",
        genre: "genre-1",
        dateRange,
      });
      if (mode === "rates" || mode === "covers") {
        api.getRatesByUser.mockResolvedValueOnce(
          page(
            [
              {
                id: "rate-1",
                rate: "9.25",
                cover: "8.50",
                disc: disc(`${mode}-result`),
              },
            ],
            1
          )
        );
      } else if (mode === "comments") {
        api.getCommentsByUser.mockResolvedValueOnce(
          page(
            [
              {
                id: "comment-1",
                comment: "Comentario propio",
                createdAt: "2024-04-01",
                disc: disc("comments-result"),
              },
            ],
            1
          )
        );
      } else if (mode === "favorites") {
        api.getFavoritesByUser.mockResolvedValueOnce(
          page(
            [
              {
                id: "favorite-1",
                disc: { ...disc("favorites-result"), userPending: { id: "pending-from-favorite" } },
              },
            ],
            1
          )
        );
      } else {
        api.getPendingsByUser.mockResolvedValueOnce(
          page(
            [
              {
                id: "pending-1",
                disc: disc("pendientes-result"),
              },
            ],
            1
          )
        );
      }

      await selectMode(wrapper, mode);

      if (mode === "rates" || mode === "covers") {
        expect(api.getRatesByUser).toHaveBeenLastCalledWith(
          20,
          0,
          "artista",
          dateRange,
          "genre-1",
          "country-1",
          mode === "rates" ? "rate" : "cover",
          "disc.releaseDate:DESC,artist.name:ASC"
        );
        expect(wrapper.findComponent(DiscCardStub).props()).toMatchObject({
          id: `${mode}-result`,
          rate: 9.25,
          cover: 8.5,
          userDiscRate: "rate-1",
        });
      } else if (mode === "comments") {
        expect(api.getCommentsByUser).toHaveBeenLastCalledWith(
          20,
          0,
          "artista",
          dateRange,
          "genre-1",
          "country-1",
          "disc.releaseDate:DESC,artist.name:ASC"
        );
        expect(wrapper.text()).toContain("Comentario propio");
        expect(wrapper.findAllComponents(DiscCardStub)).toHaveLength(0);
      } else if (mode === "favorites") {
        expect(api.getFavoritesByUser).toHaveBeenLastCalledWith(
          20,
          0,
          "artista",
          dateRange,
          "genre-1",
          "country-1",
          undefined,
          "disc.releaseDate:DESC,artist.name:ASC"
        );
        expect(wrapper.findComponent(DiscCardStub).props()).toMatchObject({
          id: "favorites-result",
          favoriteId: "favorite-1",
          pendingId: "pending-from-favorite",
        });
      } else {
        expect(api.getPendingsByUser).toHaveBeenLastCalledWith(
          20,
          0,
          "artista",
          dateRange,
          "genre-1",
          "country-1"
        );
        expect(wrapper.findComponent(DiscCardStub).props()).toMatchObject({
          id: "pendientes-result",
          pendingId: "pending-1",
          rate: 8.5,
          cover: 7,
        });
      }

      expect(wrapper.text()).not.toContain("Disco previous-all");
      expect(api[endpoint]).toHaveBeenCalled();
      wrapper.unmount();
    }
  );

  it("maps the Todos unvoted sort option to the voted=false backend filter", async () => {
    const wrapper = mountList();
    await settle();

    await wrapper.get('[data-testid="disc-order"]').setValue("UNVOTED:cover");
    await settle();

    expect(api.getDiscs).toHaveBeenLastCalledWith(
      20,
      0,
      "",
      null,
      "",
      "",
      "disc.releaseDate:DESC,artist.name:ASC",
      false,
      "cover"
    );
    wrapper.unmount();
  });

  it("uses the IntersectionObserver sentinel for forward-only incremental paging and resets to offset zero", async () => {
    const firstPage = Array.from({ length: 20 }, (_, index) => disc(`page-1-${index}`));
    api.getDiscs
      .mockResolvedValueOnce(page(firstPage, 25))
      .mockResolvedValueOnce(page([disc("page-2-1")], 25))
      .mockResolvedValueOnce(page([disc("filtered-1")], 1))
      .mockResolvedValueOnce(page([disc("rates-1")], 1));
    api.getRatesByUser.mockResolvedValueOnce(
      page(
        [
          {
            id: "rate-1",
            rate: "7",
            cover: "8",
            disc: disc("rates-1"),
          },
        ],
        1
      )
    );

    const wrapper = mountList();
    await settle();
    expect(wrapper.findAllComponents(DiscCardStub)).toHaveLength(20);
    expect(intersectionCallbacks.length).toBeGreaterThan(0);
    intersectionCallbacks[0]?.(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver
    );
    await settle();

    expect(api.getDiscs.mock.calls[1]?.[1]).toBe(20);
    expect(wrapper.findAllComponents(DiscCardStub)).toHaveLength(21);

    await setFilters(wrapper, { query: "nuevo" });
    expect(api.getDiscs.mock.calls[2]?.[1]).toBe(0);
    expect(api.getDiscs.mock.calls[2]?.[2]).toBe("nuevo");
    expect(wrapper.findAllComponents(DiscCardStub).map((card) => card.props("id"))).toEqual([
      "filtered-1",
    ]);

    await selectMode(wrapper, "rates");
    expect(api.getRatesByUser).toHaveBeenLastCalledWith(
      20,
      0,
      "nuevo",
      null,
      "",
      "",
      "rate",
      "disc.releaseDate:DESC,artist.name:ASC"
    );
    expect(wrapper.findAllComponents(DiscCardStub).map((card) => card.props("id"))).toEqual([
      "rates-1",
    ]);
    wrapper.unmount();
  });

  it("requests another page when a short response still has items according to totalItems", async () => {
    api.getDiscs
      .mockResolvedValueOnce(page([disc("short-page-1"), disc("short-page-2")], 30))
      .mockResolvedValueOnce(page([disc("short-page-next")], 30));
    const wrapper = mountList();
    await settle();

    expect(wrapper.findAllComponents(DiscCardStub)).toHaveLength(2);
    intersectionCallbacks[0]?.(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver
    );
    await settle();

    expect(api.getDiscs.mock.calls.map((call) => call[1])).toEqual([0, 20]);
    expect(wrapper.findAllComponents(DiscCardStub).map((card) => card.props("id"))).toEqual([
      "short-page-1",
      "short-page-2",
      "short-page-next",
    ]);
    wrapper.unmount();
  });

  it("applies the same forward paging contract to a personal Community list", async () => {
    api.getRatesByUser
      .mockResolvedValueOnce(
        page(
          [
            { id: "rate-1", rate: "7", cover: "8", disc: disc("rates-page-1") },
            { id: "rate-2", rate: "8", cover: "9", disc: disc("rates-page-1b") },
          ],
          25
        )
      )
      .mockResolvedValueOnce(
        page([{ id: "rate-3", rate: "9", cover: "9.5", disc: disc("rates-page-2") }], 25)
      );

    const wrapper = mountList();
    await settle();
    await selectMode(wrapper, "rates");
    expect(wrapper.findAllComponents(DiscCardStub)).toHaveLength(2);

    intersectionCallbacks[0]?.(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver
    );
    await settle();

    expect(api.getRatesByUser.mock.calls.map((call) => call[1])).toEqual([0, 20]);
    expect(wrapper.findAllComponents(DiscCardStub).map((card) => card.props("id"))).toEqual([
      "rates-page-1",
      "rates-page-1b",
      "rates-page-2",
    ]);
    wrapper.unmount();
  });

  it("renders the existing empty state for the personal comments mode", async () => {
    api.getCommentsByUser.mockResolvedValueOnce(page([], 0));
    const wrapper = mountList();
    await settle();
    await selectMode(wrapper, "comments");

    expect(wrapper.text()).toContain("Todavía no has escrito comentarios.");
    wrapper.unmount();
  });

  it("ends loading on an empty page and records that the grid has no explicit empty or error state", async () => {
    api.getDiscs.mockResolvedValueOnce(page([], 0));
    const wrapper = mountList();
    await settle();

    expect(wrapper.findAllComponents(DiscCardStub)).toHaveLength(0);
    expect(wrapper.text()).not.toContain("Cargando discos...");
    expect(wrapper.text()).not.toContain("No hay discos");
    wrapper.unmount();
  });

  it("ends loading after an HTTP error without rendering a page-level error state", async () => {
    const error = new Error("network unavailable");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    api.getDiscs.mockRejectedValueOnce(error);
    const wrapper = mountList();
    await settle();

    expect(consoleError).toHaveBeenCalledWith("Error fetching data:", error);
    expect(wrapper.text()).not.toContain("Cargando discos...");
    expect(wrapper.text()).not.toContain("Error al cargar discos");
    wrapper.unmount();
    consoleError.mockRestore();
  });

  it("reproduces the current race: changing A to B during loading drops B and later renders A", async () => {
    let resolveA!: (value: ReturnType<typeof page>) => void;
    api.getDiscs.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveA = resolve;
      })
    );
    const wrapper = mountList();
    const filters = wrapper.findComponent(FiltersStub);

    filters.vm.$emit("update:searchQuery", "filtro B");
    await settle();

    expect(filters.props("searchQuery")).toBe("filtro B");
    expect(api.getDiscs).toHaveBeenCalledTimes(1);

    resolveA(page([disc("resultado-filtro-A")], 1));
    await settle();

    expect(api.getDiscs).toHaveBeenCalledTimes(1);
    expect(wrapper.findAllComponents(DiscCardStub).map((card) => card.props("id"))).toEqual([
      "resultado-filtro-A",
    ]);
    wrapper.unmount();
  });

  it.todo("pending behavior: discard A after filter B is selected and render only B's response");
});
