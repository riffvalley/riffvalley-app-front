// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, h } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/modules/identity/auth";
import { dashboardWidgetDefaults } from "@/app/dashboardWidgetRegistry";

const { getTopRatedOrFeaturedAndStats } = vi.hoisted(() => ({
  getTopRatedOrFeaturedAndStats: vi.fn(),
}));

vi.mock("@services/discs/discs", async (importOriginal) => {
  const original = await importOriginal<typeof import("@services/discs/discs")>();
  return { ...original, getTopRatedOrFeaturedAndStats };
});

import DashboardTop3Widget from "./DashboardTop3Widget.vue";
import DashboardWidgetGrid from "../../../components/DashboardWidgetGrid.vue";
import type { HomeRankedDisc } from "@services/discs/discs";

const disc = (id: string, overrides: Partial<HomeRankedDisc> = {}): HomeRankedDisc => ({
  id,
  name: `Disco ${id}`,
  description: "Descripción",
  image: `https://images.test/${id}.jpg`,
  releaseDate: "2026-05-15",
  artist: {
    id: `artist-${id}`,
    name: `Artista ${id}`,
    description: "Descripción del artista",
    image: "",
    country: { id: "country-1", name: "España", isoCode: "ES" },
  },
  verified: true,
  averageRate: 8,
  averageCover: 7,
  voteCount: 1,
  commentCount: 2,
  favoriteId: "favorite-1",
  pendingId: "pending-1",
  userRate: { id: "rate-1", rate: 7, cover: 8 },
  weightedScore: 8,
  ...overrides,
});

const response = (discs: HomeRankedDisc[]) => ({
  discs,
  totalDiscs: discs.length,
  totalVotes: discs.reduce((total, item) => total + item.voteCount, 0),
  ratingDistribution: [],
  topUsersByRates: [],
  topUsersByCover: [],
});

const DiscCardStub = defineComponent({
  name: "DiscCard",
  props: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    ep: Boolean,
    image: String,
    releaseDate: String,
    artistName: String,
    genreName: String,
    genreColor: String,
    link: String,
    averageRate: Number,
    averageCover: Number,
    rate: Number,
    cover: Number,
    isNew: Boolean,
    userDiscRate: String,
    favoriteId: String,
    pendingId: String,
    commentCount: Number,
    rateCount: Number,
    artistCountry: Object,
    debut: Boolean,
  },
  setup(props) {
    return () => h("div", { class: "disc-card-stub", "data-disc-id": props.id }, props.name);
  },
});

function authenticatedPinia(userId = "user-a") {
  const pinia = createPinia();
  setActivePinia(pinia);
  useAuthStore(pinia).$patch({
    token: "test-token",
    userId,
    authStatus: "authenticated",
    role: "user",
  });
  return pinia;
}

function mountWidget(period: "week" | "month", pinia = authenticatedPinia()) {
  return mount(DashboardTop3Widget, {
    props: { period },
    global: { plugins: [pinia], stubs: { DiscCard: DiscCardStub } },
  });
}

function mountGrid(
  pinia: ReturnType<typeof createPinia>,
  enabled: { week: boolean; month: boolean }
) {
  const modules = [
    { ...dashboardWidgetDefaults.find(({ id }) => id === "top3semana")!, enabled: enabled.week },
    { ...dashboardWidgetDefaults.find(({ id }) => id === "top3mes")!, enabled: enabled.month },
  ];
  return mount(DashboardWidgetGrid, {
    props: { modules },
    global: { plugins: [pinia], stubs: { DiscCard: DiscCardStub } },
    slots: {
      top3semana: () => h(DashboardTop3Widget, { period: "week" }),
      top3mes: () => h(DashboardTop3Widget, { period: "month" }),
    },
  });
}

describe("DashboardTop3Widget", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 20, 12));
    getTopRatedOrFeaturedAndStats.mockReset().mockResolvedValue(response([]));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("requests the Friday-to-Thursday week and renders its requested range", async () => {
    getTopRatedOrFeaturedAndStats.mockResolvedValueOnce(response([disc("weekly")]));
    const wrapper = mountWidget("week");
    await flushPromises();

    expect(getTopRatedOrFeaturedAndStats).toHaveBeenCalledOnce();
    expect(getTopRatedOrFeaturedAndStats.mock.calls[0][0]).toEqual(["2026-05-15", "2026-05-21"]);
    expect(getTopRatedOrFeaturedAndStats.mock.calls[0][5]).toBeInstanceOf(AbortSignal);
    expect(wrapper.text()).toContain("Los discos mejor valorados publicados esta semana");
    expect(wrapper.text()).toContain("15 may – 21 may");
    expect(wrapper.find("[data-disc-id='weekly']").exists()).toBe(true);
    wrapper.unmount();
  });

  it("requests the natural month range", async () => {
    const wrapper = mountWidget("month");
    await flushPromises();

    expect(getTopRatedOrFeaturedAndStats.mock.calls[0][0]).toEqual(["2026-05-01", "2026-05-31"]);
    expect(wrapper.text()).toContain("Los discos mejor valorados publicados este mes");
    expect(wrapper.text()).toContain("mayo de 2026");
    wrapper.unmount();
  });

  it("announces the loading state while its request is pending", () => {
    getTopRatedOrFeaturedAndStats.mockReturnValueOnce(new Promise(() => undefined));
    const wrapper = mountWidget("week");

    expect(wrapper.get("[role='status']").attributes("aria-busy")).toBe("true");
    expect(wrapper.findAll(".disc-card-stub")).toHaveLength(0);
    wrapper.unmount();
  });

  it("keeps backend order, takes at most three eligible discs, and includes a real zero rating", async () => {
    getTopRatedOrFeaturedAndStats.mockResolvedValueOnce(
      response([
        disc("first", { weightedScore: 10 }),
        disc("cover-only", { voteCount: 0, averageRate: 0, averageCover: 10 }),
        disc("zero-rate", { voteCount: 1, averageRate: 0, weightedScore: 1 }),
        disc("third", { weightedScore: 1 }),
        disc("fourth", { weightedScore: 100 }),
      ])
    );
    const wrapper = mountWidget("week");
    await flushPromises();

    expect(
      wrapper.findAll(".disc-card-stub").map((card) => card.attributes("data-disc-id"))
    ).toEqual(["first", "zero-rate", "third"]);
    expect(wrapper.findAll(".medal-chip").map((medal) => medal.text().trim())).toEqual([
      "1º",
      "2º",
      "3º",
    ]);
    wrapper.unmount();
  });

  it("renders one or two results without filling extra positions", async () => {
    getTopRatedOrFeaturedAndStats.mockResolvedValueOnce(response([disc("one"), disc("two")]));
    const wrapper = mountWidget("month");
    await flushPromises();

    expect(wrapper.findAll(".disc-card-stub")).toHaveLength(2);
    expect(wrapper.findAll(".medal-chip").map((medal) => medal.text().trim())).toEqual([
      "1º",
      "2º",
    ]);
    wrapper.unmount();
  });

  it("renders a period-specific empty state", async () => {
    const wrapper = mountWidget("week");
    await flushPromises();

    expect(wrapper.find("[role='status']").text()).toContain(
      "Todavía no hay discos valorados publicados esta semana"
    );
    wrapper.unmount();
  });

  it("distinguishes an HTTP error from empty and retries only its period", async () => {
    getTopRatedOrFeaturedAndStats
      .mockRejectedValueOnce(new Error("network failure"))
      .mockResolvedValueOnce(response([disc("after-retry")]));
    const wrapper = mountWidget("month");
    await flushPromises();

    expect(wrapper.find("[role='alert']").text()).toContain("No se pudo cargar este ranking");
    expect(wrapper.text()).not.toContain("Todavía no hay discos valorados");
    await wrapper.get("button").trigger("click");
    await flushPromises();

    expect(getTopRatedOrFeaturedAndStats).toHaveBeenCalledTimes(2);
    expect(
      getTopRatedOrFeaturedAndStats.mock.calls.every(([range]) => range?.[0] === "2026-05-01")
    ).toBe(true);
    expect(wrapper.find("[data-disc-id='after-retry']").exists()).toBe(true);
    wrapper.unmount();
  });

  it("aborts its request when unmounted", async () => {
    let signal: AbortSignal | undefined;
    getTopRatedOrFeaturedAndStats.mockImplementationOnce(
      (_range, _genre, _country, _stats, _distribution, requestSignal) => {
        signal = requestSignal;
        return new Promise(() => undefined);
      }
    );
    const wrapper = mountWidget("week");

    expect(signal?.aborted).toBe(false);
    wrapper.unmount();
    expect(signal?.aborted).toBe(true);
  });

  it("aborts and ignores an older session response", async () => {
    const requests: {
      signal?: AbortSignal;
      resolve: (value: ReturnType<typeof response>) => void;
    }[] = [];
    getTopRatedOrFeaturedAndStats.mockImplementation(
      (_range, _genre, _country, _stats, _distribution, signal) =>
        new Promise((resolve) => requests.push({ signal, resolve }))
    );
    const pinia = authenticatedPinia();
    const wrapper = mountWidget("week", pinia);
    const authStore = useAuthStore(pinia);

    expect(requests).toHaveLength(1);
    authStore.userId = "user-b";
    authStore.authSessionGeneration += 1;
    await flushPromises();
    expect(requests).toHaveLength(2);
    expect(requests[0].signal?.aborted).toBe(true);

    requests[0].resolve(response([disc("old-session")]));
    requests[1].resolve(response([disc("new-session")]));
    await flushPromises();
    expect(
      wrapper.findAll(".disc-card-stub").map((card) => card.attributes("data-disc-id"))
    ).toEqual(["new-session"]);
    wrapper.unmount();
  });

  it("keeps simultaneous weekly and monthly instances independent", async () => {
    getTopRatedOrFeaturedAndStats.mockImplementation((range) => {
      if (range?.[0] === "2026-05-15") return Promise.reject(new Error("week failed"));
      return Promise.resolve(response([disc("month-result")]));
    });
    const pinia = authenticatedPinia();
    const week = mountWidget("week", pinia);
    const month = mountWidget("month", pinia);
    await flushPromises();

    expect(getTopRatedOrFeaturedAndStats).toHaveBeenCalledTimes(2);
    expect(week.find("[role='alert']").exists()).toBe(true);
    expect(month.find("[data-disc-id='month-result']").exists()).toBe(true);
    week.unmount();
    month.unmount();
  });

  it("mounts requests only for enabled grid slots and keeps the other slot active", async () => {
    const pinia = authenticatedPinia();
    const wrapper = mountGrid(pinia, { week: false, month: false });
    await flushPromises();

    expect(getTopRatedOrFeaturedAndStats).not.toHaveBeenCalled();
    await wrapper.setProps({
      modules: [
        { ...dashboardWidgetDefaults.find(({ id }) => id === "top3semana")!, enabled: true },
        { ...dashboardWidgetDefaults.find(({ id }) => id === "top3mes")!, enabled: false },
      ],
    });
    await flushPromises();
    expect(getTopRatedOrFeaturedAndStats).toHaveBeenCalledTimes(1);
    expect(getTopRatedOrFeaturedAndStats.mock.calls[0][0]).toEqual(["2026-05-15", "2026-05-21"]);
    await wrapper.setProps({
      modules: [
        { ...dashboardWidgetDefaults.find(({ id }) => id === "top3semana")!, enabled: false },
        { ...dashboardWidgetDefaults.find(({ id }) => id === "top3mes")!, enabled: true },
      ],
    });
    await flushPromises();

    expect(getTopRatedOrFeaturedAndStats).toHaveBeenCalledTimes(2);
    expect(getTopRatedOrFeaturedAndStats.mock.calls[1][0]).toEqual(["2026-05-01", "2026-05-31"]);
    expect(
      wrapper.findAll("[data-widget-id]").map((widget) => widget.attributes("data-widget-id"))
    ).toEqual(["top3mes"]);
    wrapper.unmount();
  });

  it("preserves the DiscCard props used for its current actions and navigation", async () => {
    getTopRatedOrFeaturedAndStats.mockResolvedValueOnce(
      response([
        disc("interactive", {
          userRate: { id: "rate-42", rate: 7, cover: 8 },
          favoriteId: "favorite-42",
          pendingId: "pending-42",
          commentCount: 9,
        }),
      ])
    );
    const wrapper = mountWidget("week");
    await flushPromises();

    expect(wrapper.findComponent(DiscCardStub).props()).toMatchObject({
      id: "interactive",
      name: "Disco interactive",
      image: "https://images.test/interactive.jpg",
      releaseDate: "2026-05-15",
      artistName: "Artista interactive",
      genreName: undefined,
      link: "",
      averageRate: 8,
      averageCover: 7,
      rate: 7,
      cover: 8,
      isNew: false,
      userDiscRate: "rate-42",
      favoriteId: "favorite-42",
      pendingId: "pending-42",
      commentCount: 9,
      rateCount: 1,
      artistCountry: { id: "country-1", name: "España", isoCode: "ES" },
    });
    expect(wrapper.find(".disc-card-stub").attributes("data-disc-id")).toBe("interactive");
    wrapper.unmount();
  });
});
