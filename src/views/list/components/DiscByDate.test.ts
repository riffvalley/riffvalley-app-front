// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDiscsDated, updateDisc, getRvUsers, getGenres, postAsignationService } = vi.hoisted(
  () => ({
    getDiscsDated: vi.fn(),
    updateDisc: vi.fn(),
    getRvUsers: vi.fn(),
    getGenres: vi.fn(),
    postAsignationService: vi.fn(),
  })
);

vi.mock("@services/discs/discs", () => ({ getDiscsDated, updateDisc }));
vi.mock("@/modules/identity/users", () => ({ getRvUsers }));
vi.mock("@services/genres/genres", () => ({ getGenres }));
vi.mock("@services/asignation/asignation", () => ({
  postAsignationService,
  updateAsignationService: vi.fn(),
}));
vi.mock("@stores/asignation/asignation", () => ({
  useAsignationStore: () => ({
    asignations: [],
    addAsignation: vi.fn(),
    updateAsignationStore: vi.fn(),
  }),
}));
vi.mock("@services/swal/SwalService", () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

import DiscByDate from "./DiscByDate.vue";
import DiscFilters from "@components/DiscFilters.vue";
import { useAuthStore } from "@/modules/identity/auth";

let queryClient: QueryClient;

function disc(id: string, name: string, genreId = "genre-1") {
  return {
    id,
    name,
    image: "https://images.test/cover.jpg",
    releaseDate: "2026-10-09T00:00:00.000Z",
    pinned: false,
    ep: true,
    genre: { id: genreId, name: "Rock", color: "#123456" },
    artist: {
      id: `artist-${id}`,
      name: "Artist",
      country: { name: "United States of America", isoCode: "us" },
    },
    asignations: [],
  };
}

function response(discs: ReturnType<typeof disc>[]) {
  return { data: [{ releaseDate: "2026-10-09", discs }], totalItems: discs.length };
}

function mountDiscList(extraProps: Record<string, unknown> = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);
  useAuthStore().$patch({
    authStatus: "authenticated",
    token: "test-token",
    userId: "editor",
    role: "riffvalley",
    authSessionGeneration: 2,
  });
  return mount(DiscByDate, {
    props: { date: "2026-10-09", type: "week", listId: "list-1", ...extraProps },
    global: {
      plugins: [pinia, [VueQueryPlugin, { queryClient }]],
      stubs: {
        SearchableSelect: true,
        SimpleSelect: true,
        SpotifyArtistButton: true,
        CircleFlags: true,
      },
    },
  });
}

class TestIntersectionObserver {
  static observers: TestIntersectionObserver[] = [];
  constructor(public callback: IntersectionObserverCallback) {
    TestIntersectionObserver.observers.push(this);
  }
  observe() {}
  disconnect() {}
  unobserve() {}
  trigger(isIntersecting: boolean) {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver
    );
  }
}

describe("DiscByDate permanent list", () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    vi.resetAllMocks();
    TestIntersectionObserver.observers = [];
    vi.stubGlobal("IntersectionObserver", TestIntersectionObserver);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top: 1000,
      bottom: 1001,
      left: 0,
      right: 1,
      width: 1,
      height: 1,
      x: 0,
      y: 1000,
      toJSON: () => ({}),
    });
    getDiscsDated.mockResolvedValue(
      response([disc("one", "Album One"), disc("two", "Album Two", "genre-2")])
    );
    updateDisc.mockResolvedValue({});
    getRvUsers.mockResolvedValue([{ id: "editor", username: "Editor" }]);
    getGenres.mockResolvedValue({ data: [{ id: "genre-1", name: "Rock", color: "#123456" }] });
    postAsignationService.mockResolvedValue({ id: "asignation-new" });
  });

  it("renders the weekly rows inside day groups, with Friday open by default", async () => {
    const wrapper = mountDiscList();
    await flushPromises();
    expect(wrapper.text()).toContain("Album One");
    expect(wrapper.text()).toContain("Album Two");
    expect(wrapper.text()).not.toContain("Discs for Week:");
    expect(wrapper.text()).not.toContain("Semana del");
    expect(wrapper.findAll("li")).toHaveLength(2);
    const dayGroups = wrapper.findAll("details");
    expect(dayGroups).toHaveLength(1);
    const friday = dayGroups.find((group) => group.find("summary").text().includes("Viernes"))!;
    expect((friday.element as HTMLDetailsElement).open).toBe(true);
    wrapper.unmount();
  });

  it("shows a loading status while the disc request is pending", async () => {
    let resolveRequest!: (result: ReturnType<typeof response>) => void;
    getDiscsDated.mockReturnValue(new Promise((resolve) => (resolveRequest = resolve)));
    const wrapper = mountDiscList();
    await flushPromises();

    expect(getDiscsDated).toHaveBeenCalledOnce();
    expect(wrapper.get('[role="status"]').text()).toBe("Cargando discos...");
    resolveRequest(response([disc("loaded", "Loaded album")]));
    await flushPromises();

    expect(wrapper.find('[role="status"]').exists()).toBe(false);
    expect(wrapper.text()).toContain("Loaded album");
    wrapper.unmount();
  });

  it("keeps disk information and assignment, highlight, country and Spotify controls", async () => {
    const wrapper = mountDiscList();
    await flushPromises();
    expect(wrapper.text()).toContain("Artist · Album One");
    expect(wrapper.text()).toContain("Rock");
    expect(wrapper.text()).toContain("EP");
    expect(wrapper.text()).toContain("United States of America");
    expect(wrapper.text()).toContain("Asignar");
    expect(wrapper.text()).toContain("Destacar");
    expect(wrapper.findComponent(DiscFilters).exists()).toBe(true);
    expect(wrapper.findAll("li")).toHaveLength(2);
    expect(wrapper.findComponent({ name: "SpotifyArtistButton" }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: "CircleFlags" }).exists()).toBe(true);
    const countryTooltip = wrapper
      .findAll("span")
      .find((span) => span.text() === "United States of America")!;
    expect(countryTooltip.classes()).toContain("opacity-0");
    expect(countryTooltip.classes()).toContain("group-hover:opacity-100");
    expect(wrapper.findAll("details").every((group) => !group.classes().includes("group"))).toBe(
      true
    );

    const select = wrapper.find("select");
    await select.setValue("editor");
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Asignar"))!
      .trigger("click");
    await flushPromises();
    expect(postAsignationService).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "editor", discId: "one", listId: "list-1" })
    );

    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Destacar"))!
      .trigger("click");
    await flushPromises();
    expect(updateDisc).toHaveBeenCalledWith("one", { pinned: true });
    wrapper.unmount();
  });

  it("groups weekly discs by release date and omits empty days", async () => {
    getDiscsDated.mockResolvedValue(
      response([
        { ...disc("monday", "Monday album"), releaseDate: "2026-10-05T00:00:00.000Z" },
        { ...disc("friday-a", "Friday album A"), releaseDate: "2026-10-09T00:00:00.000Z" },
        { ...disc("friday-b", "Friday album B"), releaseDate: "2026-10-09" },
      ])
    );
    const wrapper = mountDiscList();
    await flushPromises();

    expect(wrapper.text()).toContain("Lunes 05-10");
    expect(wrapper.text()).toContain("Viernes 09-10");
    expect(wrapper.text()).not.toContain("Martes 06-10");
    expect(wrapper.text()).not.toContain("Miércoles 07-10");
    expect(wrapper.text()).not.toContain("Jueves 08-10");
    expect(wrapper.text()).not.toContain("Sábado 10-10");
    expect(wrapper.text()).not.toContain("Domingo 11-10");
    expect(wrapper.text().indexOf("Lunes 05-10")).toBeLessThan(
      wrapper.text().indexOf("Viernes 09-10")
    );
    expect(wrapper.findAll("li")).toHaveLength(3);
    expect(wrapper.text().indexOf("Monday album")).toBeLessThan(
      wrapper.text().indexOf("Friday album A")
    );
    expect(wrapper.text().indexOf("Friday album A")).toBeLessThan(
      wrapper.text().indexOf("Friday album B")
    );
    const dayGroups = wrapper.findAll("details");
    expect(dayGroups).toHaveLength(2);
    expect(dayGroups.filter((group) => (group.element as HTMLDetailsElement).open)).toHaveLength(1);
    const friday = dayGroups.find((group) => group.find("summary").text().includes("Viernes"))!;
    expect((friday.element as HTMLDetailsElement).open).toBe(true);
    const monday = dayGroups.find((group) => group.find("summary").text().includes("Lunes"))!;
    expect((monday.element as HTMLDetailsElement).open).toBe(false);
    await monday.find("summary").trigger("click");
    expect((monday.element as HTMLDetailsElement).open).toBe(true);
    expect(getDiscsDated).toHaveBeenCalledWith(50, 0, [
      "2026-10-05T00:00:00.000Z",
      "2026-10-11T23:59:59.999Z",
    ]);
    wrapper.unmount();
  });

  it("omits empty day groups when the weekly result has no discs", async () => {
    getDiscsDated.mockResolvedValue({ data: [], totalItems: 0 });
    const wrapper = mountDiscList();
    await flushPromises();

    expect(wrapper.findAll("li")).toHaveLength(0);
    expect(wrapper.findAll("details")).toHaveLength(0);
    expect(wrapper.text()).toContain("No discs found for the selected week.");
    expect(wrapper.text()).not.toContain("Sin discos");
    wrapper.unmount();
  });

  it("continues to filter by search and genre", async () => {
    const wrapper = mountDiscList();
    await flushPromises();
    await wrapper.get('input[placeholder="Buscar álbum o artista..."]').setValue("Album One");
    await flushPromises();
    expect(wrapper.text()).toContain("Album One");
    expect(wrapper.text()).not.toContain("Album Two");

    await wrapper.get('input[placeholder="Buscar álbum o artista..."]').setValue("");
    wrapper.findComponent(DiscFilters).vm.$emit("update:selectedGenre", "genre-2");
    await flushPromises();
    expect(wrapper.text()).toContain("Album Two");
    expect(wrapper.text()).not.toContain("Album One");
    wrapper.unmount();
  });

  it("allows a fresh request after reaching the end and resetting filters", async () => {
    getDiscsDated
      .mockResolvedValueOnce(response([disc("first", "First page")]))
      .mockResolvedValueOnce({ data: [], totalItems: 1 })
      .mockResolvedValueOnce(response([disc("again", "After reset")]))
      .mockResolvedValueOnce({ data: [], totalItems: 1 });
    const wrapper = mountDiscList();
    await flushPromises();
    const observer = TestIntersectionObserver.observers[0];
    observer.trigger(true);
    await flushPromises();
    expect(getDiscsDated).toHaveBeenCalledTimes(2);

    wrapper.findComponent(DiscFilters).vm.$emit("resetAndFetch");
    await flushPromises();
    expect(getDiscsDated).toHaveBeenCalledTimes(3);
    expect(getDiscsDated).toHaveBeenLastCalledWith(
      50,
      0,
      expect.arrayContaining([expect.any(String), expect.any(String)])
    );
    expect(wrapper.text()).toContain("After reset");
    wrapper.unmount();
  });
});
