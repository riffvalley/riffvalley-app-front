// @vitest-environment happy-dom
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { createPinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { get, getGenres } = vi.hoisted(() => ({ get: vi.fn(), getGenres: vi.fn() }));
vi.mock("@services/api/api", () => ({ default: { get } }));
vi.mock("@services/genres/genres", () => ({ getGenres }));

class IntersectionObserverMock {
  static instances: IntersectionObserverMock[] = [];
  readonly observed: Element[] = [];
  constructor(private readonly callback: IntersectionObserverCallback) {
    IntersectionObserverMock.instances.push(this);
  }
  observe(target: Element): void { this.observed.push(target); }
  unobserve(): void {}
  disconnect(): void {}
  trigger(): void {
    this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
}

import ArtistDirectory from "./ArtistDirectory.vue";

type ArtistRow = { id: string; name: string; genre: string | null; genreColor: string | null };
const artist = (
  id: string,
  name: string,
  genre: string | null = null,
  genreColor: string | null = null
): ArtistRow => ({
  id,
  name,
  genre,
  genreColor,
});
const response = (data: ArtistRow[], totalItems = data.length) => ({
  data: { data, totalItems, totalPages: Math.ceil(totalItems / 100), currentPage: 1, limit: 100 },
});

function mountDirectory() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: Infinity } },
  });
  const wrapper = mount(ArtistDirectory, {
    global: {
      plugins: [createPinia(), [VueQueryPlugin, { queryClient }]],
      stubs: { "font-awesome-icon": true },
    },
  });
  return { wrapper, queryClient };
}

async function settle() {
  await flushPromises();
  await Promise.resolve();
  await flushPromises();
}

async function selectGenre(wrapper: VueWrapper, searchTerm = "Metal") {
  await wrapper.get('[data-test="artist-directory-genre"] .search_input_trigger').trigger("click");
  const searchInput = document.body.querySelector<HTMLInputElement>(
    '.search__input[placeholder="Buscar géneros..."]'
  );
  expect(searchInput).not.toBeNull();
  searchInput!.value = searchTerm;
  searchInput!.dispatchEvent(new Event("input", { bubbles: true }));
  await settle();
  const option = [...document.body.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (item) => item.textContent?.trim() === searchTerm
  );
  expect(option).toBeDefined();
  option!.click();
  await settle();
}

describe("ArtistDirectory", () => {
  beforeEach(() => {
    vi.useRealTimers();
    IntersectionObserverMock.instances = [];
    vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);
    get.mockReset().mockResolvedValue(response([]));
    getGenres.mockReset().mockResolvedValue({
      data: [{ id: "genre-metal", name: "Metal", color: "#123456" }],
      totalItems: 1,
      totalPages: 1,
      currentPage: 1,
      limit: 200,
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("starts with A selected and switches the selected letter to #", async () => {
    get.mockResolvedValue(response([artist("a", "A Perfect Circle")]));
    const { wrapper, queryClient } = mountDirectory();
    await settle();

    expect(wrapper.get('button[aria-pressed="true"]').text()).toBe("A");
    await wrapper.findAll("nav button")[26]!.trigger("click");
    await settle();

    expect(get).toHaveBeenLastCalledWith("/artists/directory", {
      params: { letter: "#", limit: 100, offset: 0 },
      signal: expect.anything(),
    });
    expect(wrapper.get('button[aria-pressed="true"]').text()).toBe("#");
    wrapper.unmount();
    queryClient.clear();
  });

  it("loads every page of the existing genre catalog into the selector", async () => {
    getGenres
      .mockResolvedValueOnce({
        data: [{ id: "genre-metal", name: "Metal", color: "#123456" }],
        totalItems: 2,
        totalPages: 2,
        currentPage: 1,
        limit: 200,
      })
      .mockResolvedValueOnce({
        data: [{ id: "genre-rock", name: "Rock", color: "#654321" }],
        totalItems: 2,
        totalPages: 2,
        currentPage: 2,
        limit: 200,
      });
    const { wrapper, queryClient } = mountDirectory();
    await settle();

    expect(getGenres).toHaveBeenNthCalledWith(1, 200, 0);
    expect(getGenres).toHaveBeenNthCalledWith(2, 200, 200);
    await wrapper.get('[data-test="artist-directory-genre"] .search_input_trigger').trigger("click");
    expect(
      [...document.body.querySelectorAll<HTMLElement>('[role="option"]')].map((option) =>
        option.textContent?.trim()
      )
    ).toEqual(["Todos los géneros", "Metal", "Rock"]);
    wrapper.unmount();
    queryClient.clear();
  });

  it("renders genre colors, a neutral fallback, and distinct homonymous IDs", async () => {
    get.mockResolvedValue(
      response([
        artist("homonym-one", "The Warning", "Rock", "#c026d3"),
        artist("homonym-two", "The Warning"),
      ])
    );
    const { wrapper, queryClient } = mountDirectory();
    await settle();

    const pills = wrapper.findAll(".artist-pill");
    expect(pills).toHaveLength(2);
    expect(pills[0]!.attributes("aria-label")).toBe("The Warning");
    expect(pills[0]!.attributes("style")).toContain("#c026d3");
    expect(pills[1]!.attributes("style") ?? "").not.toContain("#c026d3");
    expect(pills[0]!.classes()).toContain("text-white");
    expect(pills[1]!.attributes("style")).toContain("#404157");

    await pills[1]!.trigger("click");
    expect(pills[0]!.attributes("aria-pressed")).toBe("false");
    expect(pills[1]!.attributes("aria-pressed")).toBe("true");
    wrapper.unmount();
    queryClient.clear();
  });

  it("resolves named backend CSS colors instead of substituting the genre fallback", async () => {
    get.mockResolvedValue(response([artist("aa-williams", "A.A. Williams", "Rock alternativo", "red")]));
    const { wrapper, queryClient } = mountDirectory();
    await settle();

    const pill = wrapper.get(".artist-pill");
    const background = pill.attributes("style").match(/#([\da-f]{6})/i)?.[1];
    expect(background).toBeDefined();
    expect(Number.parseInt(background!.slice(0, 2), 16)).toBeGreaterThan(200);
    expect(Number.parseInt(background!.slice(2, 4), 16)).toBeLessThan(20);
    expect(Number.parseInt(background!.slice(4, 6), 16)).toBeLessThan(20);
    wrapper.unmount();
    queryClient.clear();
  });

  it("opens a pill by its Catalog ID and returns with directory state and query intact", async () => {
    vi.useFakeTimers();
    get.mockResolvedValue(response([artist("homonym-two", "The Warning")]));
    const { wrapper, queryClient } = mountDirectory();
    await settle();
    const input = wrapper.get("#artist-directory-search");
    await input.setValue("Warning");
    await vi.advanceTimersByTimeAsync(400);
    await settle();
    const pill = wrapper.get(".artist-pill");
    await pill.trigger("click");
    await settle();
    expect(document.body.querySelector("[data-test=artist-details-dialog]")).not.toBeNull();
    expect(get).toHaveBeenCalledWith("/artists/homonym-two/details", expect.objectContaining({ signal: expect.anything() }));
    expect(wrapper.get("#artist-directory-search").element).toBe(input.element);
    expect(wrapper.get('button[aria-pressed="true"]').text()).toBe("A");
    await document.body.querySelector<HTMLButtonElement>("[aria-label='Cerrar ficha del artista']")!.click();
    await settle();
    expect(wrapper.get("#artist-directory-search").element).toBe(input.element);
    expect(wrapper.get("#artist-directory-search").element.value).toBe("Warning");
    expect(get.mock.calls.filter(([url]) => url === "/artists/directory")).toHaveLength(2);
    wrapper.unmount();
    queryClient.clear();
    vi.useRealTimers();
  });

  it("searches globally while retaining the active letter and returns to it when cleared", async () => {
    vi.useFakeTimers();
    get.mockImplementation((_url: string, { params }: { params: { q?: string; letter: string } }) =>
      Promise.resolve(
        response([artist(params.q ? "search" : "letter", params.q ? "Radiohead" : "T. Rex")])
      )
    );
    const { wrapper, queryClient } = mountDirectory();
    await settle();
    const letter = wrapper.findAll("nav button")[19]!;
    await letter.trigger("click");
    await settle();
    const input = wrapper.get("#artist-directory-search");
    await input.setValue("Radiohead");

    expect(wrapper.text()).toContain("Búsqueda global");
    expect(wrapper.get('button[aria-pressed="true"]').text()).toBe("T");
    expect(wrapper.text()).toContain("Actualizando búsqueda");
    await vi.advanceTimersByTimeAsync(400);
    await settle();
    expect(get).toHaveBeenLastCalledWith("/artists/directory", {
      params: { letter: "T", q: "Radiohead", limit: 100, offset: 0 },
      signal: expect.anything(),
    });
    await input.setValue("");
    await flushPromises();
    await vi.advanceTimersByTimeAsync(400);
    await settle();
    expect(wrapper.get('button[aria-pressed="true"]').text()).toBe("T");
    expect(wrapper.text()).toContain("T. Rex");
    expect(wrapper.text()).not.toContain("Radiohead");
    wrapper.unmount();
    queryClient.clear();
    vi.useRealTimers();
  });

  it("loads the next page when the infinite-scroll sentinel enters view and stops at totalItems", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) =>
      artist(`id-${index}`, `Artist ${index}`)
    );
    get
      .mockResolvedValueOnce(response(firstPage, 101))
      .mockResolvedValueOnce(response([artist("id-100", "Artist 100")], 101));
    const { wrapper, queryClient } = mountDirectory();
    await settle();

    expect(wrapper.findAll(".artist-pill")).toHaveLength(100);
    expect(wrapper.find("[data-test=artist-directory-load-more-sentinel]").exists()).toBe(true);
    expect(wrapper.text()).not.toContain("Cargar 100 artistas más");
    expect(IntersectionObserverMock.instances[0]?.observed).toHaveLength(1);
    IntersectionObserverMock.instances[0]?.trigger();
    await settle();
    expect(wrapper.findAll(".artist-pill")).toHaveLength(101);
    expect(get.mock.calls[0]?.[1].params).toEqual({ letter: "A", limit: 100, offset: 0 });
    expect(get.mock.calls[1]?.[1].params).toEqual({ letter: "A", limit: 100, offset: 100 });
    expect(wrapper.find("[data-test=artist-directory-load-more-sentinel]").exists()).toBe(false);
    wrapper.unmount();
    queryClient.clear();
  });

  it("restarts at offset zero when the letter changes after loading more", async () => {
    get
      .mockResolvedValueOnce(
        response(
          Array.from({ length: 100 }, (_, index) => artist(`a-${index}`, `A ${index}`)),
          150
        )
      )
      .mockResolvedValueOnce(response([artist("a-100", "A 100")], 150))
      .mockResolvedValueOnce(response([artist("b-1", "B 1")], 1));
    const { wrapper, queryClient } = mountDirectory();
    await settle();
    IntersectionObserverMock.instances[0]?.trigger();
    await settle();
    await wrapper.findAll("nav button")[1]!.trigger("click");
    await settle();

    expect(get.mock.calls.at(-1)?.[1].params).toEqual({ letter: "B", limit: 100, offset: 0 });
    expect(wrapper.findAll(".artist-pill").map((pill) => pill.text())).toEqual(["B 1"]);
    wrapper.unmount();
    queryClient.clear();
  });

  it("combines the genre with the current letter and search and resets pagination", async () => {
    vi.useFakeTimers();
    get.mockImplementation((_url: string, { params }: { params: { q?: string; genreId?: string } }) =>
      Promise.resolve(response([artist("artist", params.q ? "Radiohead" : "A Artist", "Post-Metal", "#123456")], 101))
    );
    const { wrapper, queryClient } = mountDirectory();
    await settle();
    await wrapper.findAll("nav button")[19]!.trigger("click");
    await settle();
    await wrapper.get("#artist-directory-search").setValue("Radiohead");
    await vi.advanceTimersByTimeAsync(400);
    await settle();
    IntersectionObserverMock.instances[0]?.trigger();
    await settle();
    expect(get).toHaveBeenLastCalledWith("/artists/directory", {
      params: { letter: "T", q: "Radiohead", limit: 100, offset: 100 },
      signal: expect.anything(),
    });
    await selectGenre(wrapper);
    await settle();

    expect(get).toHaveBeenLastCalledWith("/artists/directory", {
      params: { letter: "T", q: "Radiohead", genreId: "genre-metal", limit: 100, offset: 0 },
      signal: expect.anything(),
    });
    expect(wrapper.get(".artist-pill").attributes("style")).toContain("#123456");
    expect(wrapper.get('button[aria-pressed="true"]').text()).toBe("T");
    wrapper.unmount();
    queryClient.clear();
    vi.useRealTimers();
  });

  it("keeps the modal and directory state mounted while selecting a genre", async () => {
    get.mockResolvedValue(response([artist("modal-artist", "A Artist")]));
    const { wrapper, queryClient } = mountDirectory();
    await settle();
    await wrapper.get(".artist-pill").trigger("click");
    await settle();
    expect(document.body.querySelector("[data-test=artist-details-dialog]")).not.toBeNull();
    const search = wrapper.get("#artist-directory-search");
    await selectGenre(wrapper);
    await settle();
    expect(wrapper.get("#artist-directory-search").element).toBe(search.element);
    expect(document.body.querySelector("[data-test=artist-details-dialog]")).not.toBeNull();
    await document.body.querySelector<HTMLButtonElement>("[aria-label='Cerrar ficha del artista']")!.click();
    await settle();
    expect(wrapper.get('[data-test="artist-directory-genre"] .search_input_trigger').text()).toContain("Metal");
    wrapper.unmount();
    queryClient.clear();
  });

  it("shows empty and error states and does not replace newer results with an obsolete response", async () => {
    get.mockResolvedValueOnce(response([]));
    const empty = mountDirectory();
    await settle();
    expect(empty.wrapper.text()).toContain("No se encontraron artistas");
    empty.wrapper.unmount();
    empty.queryClient.clear();

    get.mockRejectedValueOnce(new Error("offline"));
    const failed = mountDirectory();
    await settle();
    expect(failed.wrapper.text()).toContain("No se pudo cargar el directorio");
    failed.wrapper.unmount();
    failed.queryClient.clear();

    vi.useFakeTimers();
    let resolveOld: ((value: ReturnType<typeof response>) => void) | undefined;
    get.mockImplementation((_url: string, { params }: { params: { q?: string } }) => {
      if (params.q === "Old")
        return new Promise((resolve) => {
          resolveOld = resolve;
        });
      return Promise.resolve(response([artist("new", "New result")]));
    });
    const { wrapper, queryClient } = mountDirectory();
    await settle();
    const input = wrapper.get("#artist-directory-search");
    await input.setValue("Old");
    await vi.advanceTimersByTimeAsync(400);
    await settle();
    await input.setValue("New");
    await vi.advanceTimersByTimeAsync(400);
    await settle();
    resolveOld?.(response([artist("old", "Old result")]));
    await settle();

    expect(wrapper.text()).toContain("New result");
    expect(wrapper.text()).not.toContain("Old result");
    wrapper.unmount();
    queryClient.clear();
    vi.useRealTimers();
  });
});
