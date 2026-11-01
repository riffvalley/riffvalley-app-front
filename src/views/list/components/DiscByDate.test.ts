// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getDiscsDated,
  updateDisc,
  getRvUsers,
  getGenres,
  postAsignationService,
} = vi.hoisted(() => ({
  getDiscsDated: vi.fn(),
  updateDisc: vi.fn(),
  getRvUsers: vi.fn(),
  getGenres: vi.fn(),
  postAsignationService: vi.fn(),
}));

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

function disc(id: string, name: string, genreId = "genre-1") {
  return {
    id,
    name,
    image: "https://images.test/cover.jpg",
    releaseDate: "2026-10-09T00:00:00.000Z",
    pinned: false,
    ep: true,
    genre: { id: genreId, name: "Rock", color: "#123456" },
    artist: { id: `artist-${id}`, name: "Artist", country: { name: "United States of America", isoCode: "us" } },
    asignations: [],
  };
}

function response(discs: ReturnType<typeof disc>[]) {
  return { data: [{ releaseDate: "2026-10-09", discs }], totalItems: discs.length };
}

function mountDiscList() {
  return mount(DiscByDate, {
    props: { date: "2026-10-09", type: "week", listId: "list-1" },
    global: {
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
    this.callback([{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
}

describe("DiscByDate permanent list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    getDiscsDated.mockResolvedValue(response([disc("one", "Album One"), disc("two", "Album Two", "genre-2")]));
    updateDisc.mockResolvedValue({});
    getRvUsers.mockResolvedValue([{ id: "editor", username: "Editor" }]);
    getGenres.mockResolvedValue({ data: [{ id: "genre-1", name: "Rock", color: "#123456" }] });
    postAsignationService.mockResolvedValue({ id: "asignation-new" });
  });

  it("renders disk rows immediately and has no expand/collapse controls", async () => {
    const wrapper = mountDiscList();
    await flushPromises();
    expect(wrapper.text()).toContain("Album One");
    expect(wrapper.text()).toContain("Album Two");
    expect(wrapper.findAll("li")).toHaveLength(2);
    expect(wrapper.findAll("i.fa-chevron-down, i.fa-chevron-up")).toHaveLength(0);
    expect(wrapper.findAll("[data-toggle-group]")).toHaveLength(0);
    wrapper.unmount();
  });

  it("keeps disk information and assignment, highlight, country and Spotify controls", async () => {
    const wrapper = mountDiscList();
    await flushPromises();
    expect(wrapper.text()).toContain("Artist - Album One");
    expect(wrapper.text()).toContain("Rock");
    expect(wrapper.text()).toContain("EP");
    expect(wrapper.text()).toContain("Asignar");
    expect(wrapper.text()).toContain("Destacar");
    expect(wrapper.findComponent({ name: "SpotifyArtistButton" }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: "CircleFlags" }).exists()).toBe(true);

    const select = wrapper.find("select");
    await select.setValue("editor");
    await wrapper.findAll("button").find((button) => button.text().includes("Asignar"))!.trigger("click");
    await flushPromises();
    expect(postAsignationService).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "editor", discId: "one", listId: "list-1" }),
    );

    await wrapper.findAll("button").find((button) => button.text().includes("Destacar"))!.trigger("click");
    await flushPromises();
    expect(updateDisc).toHaveBeenCalledWith("one", { pinned: true });
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
      expect.arrayContaining([expect.any(String), expect.any(String)]),
    );
    expect(wrapper.text()).toContain("After reset");
    wrapper.unmount();
  });
});
