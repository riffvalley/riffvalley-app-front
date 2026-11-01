// @vitest-environment happy-dom
import { nextTick, ref } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Disc, DiscsResponse } from "@services/discs/discs";
import BestDiscCatalog from "./BestDiscCatalog.vue";
import DiscListGenreSelect from "@/modules/catalog/discs/presentation/components/DiscListGenreSelect.vue";

const { assign, updateAssignment, toggleFeatured } = vi.hoisted(() => ({
  assign: vi.fn(),
  updateAssignment: vi.fn(),
  toggleFeatured: vi.fn(),
}));
vi.mock("../../application/bestDetailQueries", () => ({
  useBestAssignmentsQuery: () => ({ data: assignmentsData }),
  useBestAssignableUsersQuery: () => ({ data: usersData }),
  useBestGenresQuery: () => ({ data: genresData, isPending: ref(false) }),
  useBestDiscCatalogQuery: () => catalogQuery,
  flattenBestCatalogPages: (pages: readonly DiscsResponse[] | undefined) => {
    const groups = new Map<string, { key: string; releaseDate: string; discs: Disc[] }>();
    for (const page of pages ?? [])
      for (const group of page.data) {
        if (!("discs" in group)) continue;
        const key = group.releaseDate.slice(0, 10);
        const current = groups.get(key) ?? { key, releaseDate: group.releaseDate, discs: [] };
        current.discs.push(...group.discs);
        groups.set(key, current);
      }
    return [...groups.values()];
  },
}));
vi.mock("../../application/useBestDetailMutations", () => ({
  useBestDetailMutations: () => ({
    assign,
    updateAssignment,
    toggleFeatured,
    isPending: ref(false),
  }),
}));
vi.mock("@services/swal/SwalService", () => ({ default: { error: vi.fn(), success: vi.fn() } }));

const assignmentsData = ref<Array<{ id: string; disc: { id: string }; user: { id: string } }>>([]);
const usersData = ref([{ id: "user-1", username: "Editor" }]);
const genresData = ref([
  { id: "genre-1", name: "Rock", color: "#123456" },
  { id: "genre-2", name: "Jazz", color: "#654321" },
]);
const firstDisc = {
  id: "disc-1",
  name: "First Album",
  releaseDate: "2026-10-03T00:00:00.000Z",
  image: null,
  artist: { id: "artist-1", name: "First Artist" },
  genre: { id: "genre-1", name: "Rock", color: "#123456" },
  pinned: false,
  link: null,
} as unknown as Disc;
const secondDisc = {
  ...firstDisc,
  id: "disc-2",
  name: "Second Album",
  releaseDate: "2026-10-07T00:00:00.000Z",
  genre: { id: "genre-2", name: "Jazz", color: "#654321" },
} as Disc;
const initialPages = ref({
  pages: [
    {
      data: [
        { releaseDate: firstDisc.releaseDate!, discs: [firstDisc] },
        { releaseDate: secondDisc.releaseDate!, discs: [secondDisc] },
      ],
      totalItems: 2,
      totalPages: 1,
      currentPage: 1,
      limit: 300,
    },
  ],
});
const fetchingNext = ref(false);
const hasNext = ref(true);
const fetchNextPage = vi.fn().mockResolvedValue(undefined);
const catalogQuery = {
  data: initialPages,
  isPending: ref(false),
  isFetchingNextPage: fetchingNext,
  isError: ref(false),
  isFetchNextPageError: ref(false),
  hasNextPage: hasNext,
  refetch: vi.fn(),
  fetchNextPage,
};

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  disconnected = false;
  constructor(readonly callback: IntersectionObserverCallback) {
    MockIntersectionObserver.instances.push(this);
  }
  observe() {}
  unobserve() {}
  disconnect() {
    this.disconnected = true;
  }
  trigger(isIntersecting: boolean) {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver
    );
  }
}

describe("BestDiscCatalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockIntersectionObserver.instances = [];
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
    fetchingNext.value = false;
    hasNext.value = true;
    fetchNextPage.mockResolvedValue(undefined);
    assignmentsData.value = [];
    initialPages.value = {
      pages: [
        {
          data: [
            { releaseDate: firstDisc.releaseDate!, discs: [firstDisc] },
            { releaseDate: secondDisc.releaseDate!, discs: [secondDisc] },
          ],
          totalItems: 2,
          totalPages: 1,
          currentPage: 1,
          limit: 300,
        },
      ],
    };
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  it("starts with all monthly groups closed and preserves the user's expansion by stable key", async () => {
    const wrapper = mount(BestDiscCatalog, { props: { listId: "best-1", date: "2026-10-01" } });
    await flushPromises();
    const toggles = wrapper.findAll(".best-group-toggle");
    expect(toggles).toHaveLength(2);
    expect(toggles[0].attributes("aria-expanded")).toBe("false");
    expect(toggles[1].attributes("aria-expanded")).toBe("false");
    await toggles[0].trigger("click");
    const expandedBeforeRefresh = wrapper.findAll(".best-group-toggle")[0];
    expect(expandedBeforeRefresh.attributes("aria-expanded")).toBe("true");

    initialPages.value = {
      pages: [
        ...initialPages.value.pages,
        {
          data: [
            {
              releaseDate: firstDisc.releaseDate!,
              discs: [{ ...firstDisc, id: "disc-3", name: "Third Album" } as Disc],
            },
          ],
          totalItems: 3,
          totalPages: 1,
          currentPage: 2,
          limit: 300,
        },
      ],
    };
    await flushPromises();
    const afterRefresh = wrapper.findAll(".best-group-toggle");
    expect(afterRefresh[0].attributes("aria-expanded")).toBe("true");
    expect(afterRefresh[1].attributes("aria-expanded")).toBe("false");
    expect(wrapper.findAll(".best-group-toggle")[0].attributes("aria-controls")).toContain(
      "best-1:2026-10-01"
    );
    wrapper.unmount();
  });

  it("loads one page per sentinel visibility cycle and disconnects on unmount", async () => {
    const wrapper = mount(BestDiscCatalog, { props: { listId: "best-1", date: "2026-10-01" } });
    await flushPromises();
    const observer = MockIntersectionObserver.instances[0];
    observer.trigger(true);
    observer.trigger(true);
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
    observer.trigger(false);
    observer.trigger(true);
    expect(fetchNextPage).toHaveBeenCalledTimes(2);
    expect(
      wrapper.find(".best-catalog-sentinel").element.parentElement?.closest(".best-catalog-group")
    ).toBeNull();
    wrapper.unmount();
    expect(observer.disconnected).toBe(true);
  });

  it("does not add artificial scroll space while more pages exist", async () => {
    const wrapper = mount(BestDiscCatalog, { props: { listId: "best-1", date: "2026-10-01" } });
    await flushPromises();
    expect(wrapper.find(".best-catalog-scroll-spacer").exists()).toBe(false);

    hasNext.value = false;
    await flushPromises();
    expect(wrapper.find(".best-catalog-scroll-spacer").exists()).toBe(false);
    expect(wrapper.text()).toContain("Has llegado al final del catálogo.");
    wrapper.unmount();
  });

  it("uses the searchable multi-select genre filter with OR matching", async () => {
    const wrapper = mount(BestDiscCatalog, {
      props: { listId: "best-1", date: "2026-10-01" },
    });
    await flushPromises();

    const genreSelect = wrapper.getComponent(DiscListGenreSelect);
    expect(genreSelect.props("options")).toHaveLength(2);
    expect(genreSelect.props("modelValue")).toEqual([]);
    await genreSelect.get("button[aria-haspopup='listbox']").trigger("click");
    expect(wrapper.get('input[aria-label="Buscar géneros"]')).toBeDefined();
    expect(wrapper.text()).toContain("Rock");
    expect(wrapper.text()).toContain("Jazz");

    genreSelect.vm.$emit("update:modelValue", ["genre-1", "genre-2"]);
    await flushPromises();
    expect(wrapper.text()).toContain("First Album");
    expect(wrapper.text()).toContain("Second Album");
    wrapper.unmount();
  });

  it("advances on actual downward scroll while the sentinel stays visible", async () => {
    const wrapper = mount(BestDiscCatalog, {
      props: { listId: "best-1", date: "2026-10-01" },
    });
    await flushPromises();
    const observer = MockIntersectionObserver.instances[0];
    fetchNextPage.mockImplementation(() => {
      if (fetchNextPage.mock.calls.length >= 3) hasNext.value = false;
      return Promise.resolve();
    });
    Object.defineProperty(window, "scrollY", { configurable: true, value: 120 });
    window.dispatchEvent(new Event("scroll"));
    await flushPromises();
    expect(fetchNextPage).toHaveBeenCalledTimes(3);
    observer.trigger(true);
    expect(fetchNextPage).toHaveBeenCalledTimes(3);
    wrapper.unmount();
  });

  it("does not load more just because closed groups keep the sentinel visible", async () => {
    const wrapper = mount(BestDiscCatalog, { props: { listId: "best-1", date: "2026-10-01" } });
    await flushPromises();
    const observer = MockIntersectionObserver.instances[0];
    observer.trigger(true);
    observer.trigger(true);
    await wrapper.findAll(".best-group-toggle")[0].trigger("click");
    observer.trigger(true);
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("fills the viewport with another page when a page adds groups and the sentinel stays near", async () => {
    const wrapper = mount(BestDiscCatalog, { props: { listId: "best-1", date: "2026-10-01" } });
    await flushPromises();
    const sentinelElement = wrapper.get(".best-catalog-sentinel").element;
    let measurement = 0;
    vi.spyOn(sentinelElement, "getBoundingClientRect").mockImplementation(() => {
      measurement += 1;
      const top = measurement === 1 ? 100 : 200;
      return {
        top,
        bottom: top + 1,
        left: 0,
        right: 1,
        width: 1,
        height: 1,
        x: 0,
        y: top,
        toJSON: () => ({}),
      };
    });
    fetchNextPage.mockImplementationOnce(() => {
      initialPages.value = {
        pages: [
          ...initialPages.value.pages,
          {
            data: [{ releaseDate: "2026-10-08T00:00:00.000Z", discs: [secondDisc] }],
            totalItems: 3,
            totalPages: 2,
            currentPage: 2,
            limit: 300,
          },
        ],
      };
      return Promise.resolve();
    });

    MockIntersectionObserver.instances[0].trigger(true);
    await flushPromises();
    expect(fetchNextPage).toHaveBeenCalledTimes(2);
    expect(wrapper.findAll(".best-group-toggle")).toHaveLength(3);
    wrapper.unmount();
  });

  it("starts and stops observing only while the Selección de discos tab is active", async () => {
    const wrapper = mount(BestDiscCatalog, {
      props: { listId: "best-1", date: "2026-10-01", active: false },
    });
    await flushPromises();
    expect(MockIntersectionObserver.instances).toHaveLength(0);

    await wrapper.setProps({ active: true });
    await nextTick();
    expect(MockIntersectionObserver.instances).toHaveLength(1);

    await wrapper.setProps({ active: false });
    expect(MockIntersectionObserver.instances[0].disconnected).toBe(true);
    wrapper.unmount();
  });

  it("creates assignments and updates featured status using the selected disc", async () => {
    const wrapper = mount(BestDiscCatalog, { props: { listId: "best-1", date: "2026-10-01" } });
    await flushPromises();
    await wrapper.get('[aria-label="Usuario para First Album"]').setValue("user-1");
    await wrapper.get(".best-row-actions button").trigger("click");
    await flushPromises();
    expect(assign).toHaveBeenCalledWith({
      userId: "user-1",
      discId: "disc-1",
      listId: "best-1",
      genre: "Rock",
    });
    await wrapper.get('[aria-label="Destacar First Album"]').trigger("click");
    expect(toggleFeatured).toHaveBeenCalledWith({ discId: "disc-1", pinned: true });
    wrapper.unmount();
  });
});
