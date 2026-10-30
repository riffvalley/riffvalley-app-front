// @vitest-environment happy-dom
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import { defineComponent, h } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@services/api/api", () => ({ default: { get } }));

import TopDiscsView from "./TopDiscsView.vue";
import DiscFilters from "@components/DiscFilters.vue";
import TopDiscsHeader from "@/modules/catalog/top-discs/presentation/components/TopDiscsHeader.vue";
import { topDiscsQueryKey } from "@/modules/catalog/top-discs/composables/useTopDiscsQueries";

const disc = {
  id: "disc-1",
  name: "Disco 1",
  description: "",
  image: "cover.jpg",
  releaseDate: "2026-06-01",
  artist: { id: "artist-1", name: "Artista", description: "", image: "" },
  genre: { id: "genre-1", name: "Rock", color: "#111111" },
  verified: true,
  averageRate: 8.2,
  voteCount: 4,
};

const DiscCardStub = defineComponent({
  props: { id: { type: String, required: true } },
  emits: ["rating-saved"],
  render() {
    return h("article", { "data-testid": "disc-card" }, this.id);
  },
});

class IntersectionObserverStub {
  observe() {}
  disconnect() {}
}

describe("TopDiscs Rankings view", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
    get.mockReset().mockImplementation((url: string) => {
      if (url === "/discs/topDiscs/options") {
        return Promise.resolve({
          data: {
            countries: [{ id: "country-1", name: "País 1", isoCode: "P1" }],
            genres: [{ id: "genre-1", name: "Rock", color: "#111111" }],
          },
        });
      }
      return Promise.resolve({
        data: {
          discs: [disc],
          totalDiscs: 1,
          totalVotes: 4,
          ratingDistribution: [],
          topUsersByRates: [],
          topUsersByCover: [],
        },
      });
    });
  });

  it("loads official options and ranking, preserves cards, and refreshes ranking after musical ratings", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: Infinity } },
    });
    const wrapper = mount(TopDiscsView, {
      global: {
        plugins: [createPinia(), [VueQueryPlugin, { queryClient }]],
        stubs: { DiscCard: DiscCardStub, "font-awesome-icon": true, "router-link": true },
      },
    });
    await flushPromises();

    expect(wrapper.text()).toContain("Los discos mejor valorados");
    expect(get).toHaveBeenCalledWith(
      "/discs/topDiscs/options",
      expect.objectContaining({
        params: expect.objectContaining({ dateRange: expect.any(Array) }),
      })
    );
    expect(get).toHaveBeenCalledWith(
      "/discs/topDiscs",
      expect.objectContaining({
        params: expect.objectContaining({ dateRange: expect.any(Array) }),
      })
    );
    expect(get.mock.calls.some(([url]) => url === "/discs/homeDiscs")).toBe(false);
    expect(wrapper.findAll('[data-testid="disc-card"]')).toHaveLength(1);
    expect(wrapper.findComponent(TopDiscsHeader).exists()).toBe(true);
    expect(wrapper.findComponent(DiscFilters).props("countries")).toEqual([
      { id: "country-1", name: "País 1", isoCode: "P1" },
    ]);
    expect(wrapper.findComponent(DiscFilters).props("genres")).toEqual([
      { id: "genre-1", name: "Rock", color: "#111111" },
    ]);
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue();
    wrapper.findComponent(DiscCardStub).vm.$emit("rating-saved", { musicalRateChanged: true });
    await flushPromises();
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: topDiscsQueryKey });
    wrapper.unmount();
    queryClient.clear();
    vi.unstubAllGlobals();
  });

  it("does not invalidate ranking for cover-only rating changes", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: Infinity } },
    });
    const wrapper = mount(TopDiscsView, {
      global: {
        plugins: [createPinia(), [VueQueryPlugin, { queryClient }]],
        stubs: { DiscCard: DiscCardStub, "font-awesome-icon": true, "router-link": true },
      },
    });
    await flushPromises();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue();

    wrapper.findComponent(DiscCardStub).vm.$emit("rating-saved", { musicalRateChanged: false });
    await flushPromises();
    expect(invalidateQueries).not.toHaveBeenCalled();
    wrapper.unmount();
    queryClient.clear();
    vi.unstubAllGlobals();
  });

  it("switches Todos without issuing duplicate requests and omits dateRange", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: Infinity } },
    });
    const wrapper = mount(TopDiscsView, {
      global: {
        plugins: [createPinia(), [VueQueryPlugin, { queryClient }]],
        stubs: { DiscCard: DiscCardStub, "font-awesome-icon": true, "router-link": true },
      },
    });
    await flushPromises();
    get.mockClear();

    await wrapper
      .findAll("button")
      .find((button) => button.text().trim() === "Todos")
      ?.trigger("click");
    await flushPromises();

    expect(get).toHaveBeenCalledTimes(2);
    expect(get).toHaveBeenCalledWith(
      "/discs/topDiscs/options",
      expect.objectContaining({ params: {} })
    );
    expect(get).toHaveBeenCalledWith("/discs/topDiscs", expect.objectContaining({ params: {} }));
    wrapper.unmount();
    queryClient.clear();
    vi.unstubAllGlobals();
  });

  it("uses one ranking request for both blocks and refreshes them after a filter change", async () => {
    const changedDiscs = [1, 2, 3, 4].map((number) => ({
      ...disc,
      id: `filtered-disc-${number}`,
      name: `Disco filtrado ${number}`,
    }));
    get.mockImplementation((url: string, config?: { params?: Record<string, unknown> }) => {
      if (url === "/discs/topDiscs/options") {
        return Promise.resolve({
          data: {
            countries: [{ id: "country-1", name: "País 1", isoCode: "P1" }],
            genres: [{ id: "genre-1", name: "Rock", color: "#111111" }],
          },
        });
      }
      const resultDiscs = config?.params?.countryId ? changedDiscs : [disc];
      return Promise.resolve({
        data: {
          discs: resultDiscs,
          totalDiscs: resultDiscs.length,
          totalVotes: 4,
          ratingDistribution: [],
          topUsersByRates: [],
          topUsersByCover: [],
        },
      });
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: Infinity } },
    });
    const wrapper = mount(TopDiscsView, {
      global: {
        plugins: [createPinia(), [VueQueryPlugin, { queryClient }]],
        stubs: { DiscCard: DiscCardStub, "font-awesome-icon": true, "router-link": true },
      },
    });
    await flushPromises();
    get.mockClear();

    wrapper.findComponent(TopDiscsHeader).vm.$emit("country-change", "country-1");
    await flushPromises();

    expect(get.mock.calls.filter(([url]) => url === "/discs/topDiscs")).toHaveLength(1);
    expect(wrapper.findAll('[data-testid="disc-card"]').map((card) => card.text())).toEqual(
      changedDiscs.map(({ id }) => id)
    );
    expect(wrapper.find('[data-testid="top-discs-featured-section"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="top-discs-grid-section"]').exists()).toBe(true);

    wrapper.unmount();
    queryClient.clear();
    vi.unstubAllGlobals();
  });

  it("shows a ranking made only of unrated pinned discs without the global empty state", async () => {
    const pinnedDisc = { ...disc, voteCount: 0, averageRate: null, weightedScore: null };
    get.mockImplementation((url: string) =>
      url === "/discs/topDiscs/options"
        ? Promise.resolve({ data: { countries: [], genres: [] } })
        : Promise.resolve({
            data: {
              discs: [pinnedDisc],
              totalDiscs: 1,
              totalVotes: 0,
              ratingDistribution: [],
              topUsersByRates: [],
              topUsersByCover: [],
            },
          })
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: Infinity } },
    });
    const wrapper = mount(TopDiscsView, {
      global: {
        plugins: [createPinia(), [VueQueryPlugin, { queryClient }]],
        stubs: { DiscCard: DiscCardStub, "font-awesome-icon": true, "router-link": true },
      },
    });
    await flushPromises();

    expect(wrapper.find('[data-testid="top-discs-featured-section"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="top-discs-grid-section"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-testid="disc-card"]')).toHaveLength(1);
    expect(wrapper.text()).not.toContain("No hay discos para este periodo");

    wrapper.unmount();
    queryClient.clear();
    vi.unstubAllGlobals();
  });

  it("shows loading and error states and exposes ranking retry", async () => {
    let resolveRanking: ((value: { data: { discs: (typeof disc)[] } }) => void) | undefined;
    get.mockImplementation((url: string) => {
      if (url === "/discs/topDiscs/options") {
        return Promise.resolve({ data: { countries: [], genres: [] } });
      }
      return new Promise((resolve) => {
        resolveRanking = resolve;
      });
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: Infinity } },
    });
    const wrapper = mount(TopDiscsView, {
      global: {
        plugins: [createPinia(), [VueQueryPlugin, { queryClient }]],
        stubs: { DiscCard: DiscCardStub, "font-awesome-icon": true, "router-link": true },
      },
    });
    await flushPromises();
    expect(wrapper.text()).toContain("Cargando ranking");
    expect(wrapper.findAll('[data-testid="disc-card"]')).toHaveLength(0);
    resolveRanking?.({ data: { discs: [] } });
    await flushPromises();
    expect(wrapper.text()).toContain("No hay discos para este periodo");
    wrapper.unmount();
    queryClient.clear();

    get.mockImplementation((url: string) => {
      if (url === "/discs/topDiscs/options") {
        return Promise.resolve({ data: { countries: [], genres: [] } });
      }
      return Promise.reject(new Error("ranking unavailable"));
    });
    const errorQueryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: Infinity } },
    });
    const errorWrapper = mount(TopDiscsView, {
      global: {
        plugins: [createPinia(), [VueQueryPlugin, { queryClient: errorQueryClient }]],
        stubs: { DiscCard: DiscCardStub, "font-awesome-icon": true, "router-link": true },
      },
    });
    await flushPromises();
    expect(errorWrapper.text()).toContain("No se pudo cargar el ranking");
    expect(errorWrapper.find('[data-testid="top-discs-featured-section"]').exists()).toBe(false);
    expect(errorWrapper.find('[data-testid="top-discs-grid-section"]').exists()).toBe(false);
    get.mockImplementation((url: string) =>
      url === "/discs/topDiscs/options"
        ? Promise.resolve({ data: { countries: [], genres: [] } })
        : Promise.resolve({
            data: {
              discs: [disc],
              totalDiscs: 1,
              totalVotes: 4,
              ratingDistribution: [],
              topUsersByRates: [],
              topUsersByCover: [],
            },
          })
    );
    await errorWrapper
      .findAll("button")
      .find((button) => button.text().trim() === "Reintentar")!
      .trigger("click");
    await flushPromises();
    expect(errorWrapper.findAll('[data-testid="disc-card"]')).toHaveLength(1);
    errorWrapper.unmount();
    errorQueryClient.clear();
    vi.unstubAllGlobals();
  });
});
