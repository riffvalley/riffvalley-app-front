// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, ref } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCommunityDashboardRankings, getCommunityDashboardStats } = vi.hoisted(() => ({
  getCommunityDashboardRankings: vi.fn(),
  getCommunityDashboardStats: vi.fn(),
}));

vi.mock("@services/community/dashboard", () => ({ getCommunityDashboardRankings, getCommunityDashboardStats }));
vi.mock("@helpers/dateConstants", () => ({ getAvailableYears: () => [2025, 2026, 2027] }));

import { dashboardWidgetDefaults, dashboardWidgetRegistry } from "@/app/dashboardWidgetRegistry";
import DashboardCommunityWidget from "./DashboardCommunityWidget.vue";
import DashboardWidgetGrid from "../../../components/DashboardWidgetGrid.vue";
import { useAuthStore } from "@/modules/identity/auth";

const response = (year: number) => ({
  year,
  topUsersByRates: [
    { user: { id: `rates-${year}-1`, username: `Riffer ${year}` }, rateCount: year },
    { user: { id: `rates-${year}-2`, username: "Second" }, rateCount: 16 },
    { user: { id: `rates-${year}-3`, username: "Third" }, rateCount: 12 },
    { user: { id: `rates-${year}-4`, username: "Fourth" }, rateCount: 8 },
  ],
  topUsersByCover: [
    { user: { id: `cover-${year}-1`, username: "Coverista" }, totalCover: 18 },
    { user: { id: `cover-${year}-2`, username: "Cover Two" }, totalCover: 11 },
  ],
});

function mountWidget() {
  const pinia = createPinia();
  setActivePinia(pinia);
  useAuthStore().$patch({ authStatus: "authenticated", userId: "user-a", role: "user" });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return mount(DashboardCommunityWidget, {
    attachTo: document.body,
    global: {
      plugins: [pinia, [VueQueryPlugin, { queryClient }]],
      stubs: { Teleport: true },
    },
  });
}

function communityModules(enabled: boolean) {
  return [
    {
      ...dashboardWidgetDefaults.find(({ id }) => id === "comunidad")!,
      enabled,
    },
  ];
}

describe("DashboardCommunityWidget", () => {
  beforeEach(() => {
    getCommunityDashboardRankings.mockReset().mockImplementation(async (year: number) => response(year));
    getCommunityDashboardStats.mockReset().mockImplementation(async (year: number) => ({
      year,
      summary: { ratedDiscs: 31, releasedDiscs: 19, participatingUsers: 7, averageRating: 7.65 },
      ratingDistribution: [
        { label: "0–2", min: 0, max: 2, minInclusive: true, maxInclusive: false, count: 1 },
        { label: "2–4", min: 2, max: 4, minInclusive: true, maxInclusive: false, count: 3 },
      ],
      currentStreaks: [
        { user: { id: "u1", username: "Guitarrista" }, days: 12 },
        { user: { id: "u2", username: "Bajista" }, days: 6 },
        { user: { id: "u3", username: "Batería" }, days: 5 },
        { user: { id: "u4", username: "Voz" }, days: 3 },
        { user: { id: "u5", username: "Teclista" }, days: 1 },
      ],
      topGenres: [
        { id: "3a45a315-8881-4683-9d89-c3f9a9bf7083", name: "Black metal", ratedDiscs: 255 },
        { id: "0c2b74e6-2727-41d0-b50c-914ac1bcb108", name: "Death metal", ratedDiscs: 166 },
        { id: "a781feb1-2102-4943-9608-bbf51b8ca986", name: "Metalcore", ratedDiscs: 138 },
        { id: "fac01bc4-50e0-4fb0-9b74-23db5b505254", name: "Doom metal", ratedDiscs: 112 },
        { id: "300fa395-1dd0-444e-8972-0d3823fd0dae", name: "Hard rock", ratedDiscs: 92 },
      ],
    }));
  });

  it("requests the selected year and renders the musical ranking in backend order", async () => {
    const wrapper = mountWidget();

    await vi.waitFor(() => expect(getCommunityDashboardRankings).toHaveBeenCalledOnce());
    expect(getCommunityDashboardRankings).toHaveBeenCalledWith(2026, expect.any(AbortSignal));
    await vi.waitFor(() => expect(wrapper.text()).toContain("Riffer 2026"));
    const ranking = wrapper.findAll("ul")[0]!;
    expect(ranking.text()).toContain("Riffer 2026");
    expect(ranking.text()).toContain("2026");
    expect(ranking.text()).toContain("Second");
    expect(ranking.findAll("li").map((row) => row.text())).toEqual([
      expect.stringContaining("Riffer 2026"),
      expect.stringContaining("Second"),
    ]);
    expect(wrapper.findAll("i.fa-trophy")).toHaveLength(3);
    expect(wrapper.findAll("a").map((link) => link.attributes("href"))).toEqual(
      expect.arrayContaining([
        "https://t.me/RiffValleyAppUpdates",
        "https://t.me/RiffValleyApp",
        "https://riffvalley.es",
        "https://www.riffvalley.es/agenda-conciertos",
        "https://t.me/conciertosrockmetal",
        "https://t.me/riffvalley",
      ]),
    );
    expect(getCommunityDashboardRankings.mock.calls[0]?.[0]).toBe(2026);
    wrapper.unmount();
  });

  it("keeps the cover ranking, its tab, counts, and backend order", async () => {
    const wrapper = mountWidget();
    await vi.waitFor(() => expect(wrapper.text()).toContain("Riffer 2026"));

    const coversTab = wrapper.findAll("button").find((button) => button.text().includes("Portadas"));
    await coversTab?.trigger("click");
    expect(coversTab?.attributes("aria-pressed")).toBe("true");
    expect(wrapper.text()).toContain("Coverista");
    expect(wrapper.text()).toContain("18");
    expect(wrapper.findAll("li").map((row) => row.text())).toEqual([
      expect.stringContaining("Coverista"),
      expect.stringContaining("Cover Two"),
    ]);

    const discsTab = wrapper.findAll("button").find((button) => button.text().includes("Discos"));
    await discsTab?.trigger("click");
    expect(discsTab?.attributes("aria-pressed")).toBe("true");
    expect(wrapper.text()).toContain("Riffer 2026");
    wrapper.unmount();
  });

  it("keeps ranking selection native, keyboard reachable, and visibly focused", async () => {
    const wrapper = mountWidget();
    await vi.waitFor(() => expect(wrapper.text()).toContain("Riffer 2026"));

    const ratesTab = wrapper.findAll("button").find((button) => button.text().includes("Discos"))!;
    const coversTab = wrapper.findAll("button").find((button) => button.text().includes("Portadas"))!;
    expect(ratesTab.element.tagName).toBe("BUTTON");
    expect(ratesTab.attributes("type")).toBe("button");
    expect(ratesTab.element).toHaveProperty("tabIndex", 0);
    expect(ratesTab.attributes("aria-pressed")).toBe("true");
    expect(coversTab.attributes("aria-pressed")).toBe("false");
    expect(ratesTab.classes()).toContain("focus-visible:outline");
    expect(coversTab.classes()).toContain("focus-visible:outline");

    (coversTab.element as HTMLButtonElement).focus();
    expect(document.activeElement).toBe(coversTab.element);
    await coversTab.trigger("click");
    expect(coversTab.attributes("aria-pressed")).toBe("true");
    expect(ratesTab.attributes("aria-pressed")).toBe("false");
    expect(wrapper.text()).toContain("Coverista");
    wrapper.unmount();
  });

  it("keeps the year selector named, keyboard focusable, and visibly focused", async () => {
    const wrapper = mountWidget();
    await vi.waitFor(() => expect(wrapper.text()).toContain("Riffer 2026"));
    const yearSelect = wrapper.get('select[aria-label="Año de estadísticas"]');

    expect(yearSelect.classes()).toContain("focus-visible:outline");
    expect(yearSelect.element).toHaveProperty("tabIndex", 0);
    (yearSelect.element as HTMLSelectElement).focus();
    expect(document.activeElement).toBe(yearSelect.element);
    await yearSelect.setValue("2025");
    await vi.waitFor(() => expect(getCommunityDashboardRankings).toHaveBeenLastCalledWith(2025, expect.any(AbortSignal)));
    expect(yearSelect.element).toHaveProperty("value", "2025");
    wrapper.unmount();
  });

  it.each([2025, 2026, 2027])("uses the backend ranking for year %i without changing its semantics", async (year) => {
    const wrapper = mountWidget();
    await vi.waitFor(() => expect(wrapper.text()).toContain("Riffer 2026"));
    await wrapper.get("select").setValue(String(year));
    await vi.waitFor(() => expect(getCommunityDashboardRankings).toHaveBeenLastCalledWith(year, expect.any(AbortSignal)));
    await vi.waitFor(() => expect(wrapper.text()).toContain(`Riffer ${year}`));
    expect(wrapper.text()).toContain(String(year));
    wrapper.unmount();
  });

  it("replaces the prior year's rows immediately and uses only the rankings endpoint", async () => {
    const wrapper = mountWidget();
    await vi.waitFor(() => expect(wrapper.text()).toContain("Riffer 2026"));
    await wrapper.get("select").setValue("2025");
    expect(wrapper.text()).not.toContain("Riffer 2026");
    await vi.waitFor(() => expect(wrapper.text()).toContain("Riffer 2025"));
    expect(getCommunityDashboardRankings).toHaveBeenCalledTimes(2);
    expect(getCommunityDashboardRankings.mock.calls.map(([year]) => year)).toEqual([2026, 2025]);
    wrapper.unmount();
  });

  it("shows an empty ranking, removes the obsolete detailed-stats button, and opens the community dialog", async () => {
    getCommunityDashboardRankings.mockResolvedValueOnce({
      year: 2026,
      topUsersByRates: [],
      topUsersByCover: [],
    });
    const wrapper = mountWidget();
    await vi.waitFor(() => expect(wrapper.text()).toContain("No hay datos"));
    expect(wrapper.text()).not.toContain("Cargando rankings");

    expect(wrapper.text()).not.toContain("Estadísticas detalladas");
    const communityStatsButton = wrapper.findAll("button").find((button) => button.text().trim() === "Estadísticas");
    expect(communityStatsButton?.attributes("aria-haspopup")).toBe("dialog");
    await communityStatsButton?.trigger("click");
    expect(wrapper.find("dialog").exists()).toBe(true);
    await vi.waitFor(() => expect(getCommunityDashboardStats).toHaveBeenCalledOnce());
    await wrapper.get("dialog .close-button").trigger("click");
    expect(wrapper.find("dialog").exists()).toBe(false);
    expect(getCommunityDashboardRankings).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it("shows a retry action on errors and retries the selected year", async () => {
    getCommunityDashboardRankings.mockRejectedValueOnce(new Error("HTTP 500"));
    const wrapper = mountWidget();
    await vi.waitFor(() => expect(wrapper.get('[role="alert"]').text()).toContain("No se pudieron cargar"));
    await wrapper.get('[role="alert"] button').trigger("click");
    await vi.waitFor(() => expect(getCommunityDashboardRankings).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(wrapper.text()).toContain("Riffer 2026"));
    wrapper.unmount();
  });

  it("prefetches community stats on hover without loading them at mount", async () => {
    const wrapper = mountWidget();
    await vi.waitFor(() => expect(getCommunityDashboardRankings).toHaveBeenCalledOnce());
    expect(getCommunityDashboardStats).not.toHaveBeenCalled();
    const button = wrapper.findAll("button").find((item) => item.text().trim() === "Estadísticas");
    await button?.trigger("mouseenter");
    await vi.waitFor(() => expect(getCommunityDashboardStats).toHaveBeenCalledOnce());
    expect(getCommunityDashboardStats).toHaveBeenCalledWith(2026, expect.any(AbortSignal));
    await button?.trigger("click");
    await nextTick();
    expect(getCommunityDashboardStats).toHaveBeenCalledOnce();
    expect(wrapper.find("dialog").exists()).toBe(true);
    wrapper.unmount();
  });

  it("prefetches community stats when the button receives keyboard focus", async () => {
    const wrapper = mountWidget();
    await vi.waitFor(() => expect(getCommunityDashboardRankings).toHaveBeenCalledOnce());
    expect(getCommunityDashboardStats).not.toHaveBeenCalled();
    const button = wrapper.findAll("button").find((item) => item.text().trim() === "Estadísticas");
    await button?.trigger("focus");
    await vi.waitFor(() => expect(getCommunityDashboardStats).toHaveBeenCalledOnce());
    expect(getCommunityDashboardStats).toHaveBeenCalledWith(2026, expect.any(AbortSignal));
    wrapper.unmount();
  });

  it("does not fetch on closed year changes and loads directly on opening the selected year", async () => {
    const wrapper = mountWidget();
    await vi.waitFor(() => expect(getCommunityDashboardRankings).toHaveBeenCalledOnce());
    await wrapper.get("select").setValue("2025");
    expect(getCommunityDashboardStats).not.toHaveBeenCalled();
    const button = wrapper.findAll("button").find((item) => item.text().trim() === "Estadísticas");
    await button?.trigger("click");
    await vi.waitFor(() => expect(getCommunityDashboardStats).toHaveBeenCalledOnce());
    expect(getCommunityDashboardStats).toHaveBeenCalledWith(2025, expect.any(AbortSignal));
    await vi.waitFor(() => expect(wrapper.text()).toContain("Estadísticas de la comunidad"));
    expect(wrapper.get("dialog").attributes("aria-labelledby")).toBe("community-stats-title");
    expect(wrapper.get(".close-button").attributes("aria-label")).toBe("Cerrar estadísticas de la comunidad");
    expect(wrapper.text()).toContain("31");
    expect(wrapper.text()).toContain("19");
    expect(wrapper.text()).toContain("7,65");
    expect(wrapper.text()).toContain("Guitarrista");
    expect(wrapper.findAll(".streak-row")).toHaveLength(5);
    expect(wrapper.findAll(".bucket-count")).toHaveLength(2);
    expect(wrapper.findAll(".streak-days")).toHaveLength(5);
    expect(wrapper.find(".streak-list a").exists()).toBe(false);
    const genreRows = wrapper.findAll(".top-genre-row");
    expect(genreRows).toHaveLength(5);
    expect(genreRows.map((row) => row.text())).toEqual([
      expect.stringContaining("Black metal"),
      expect.stringContaining("Death metal"),
      expect.stringContaining("Metalcore"),
      expect.stringContaining("Doom metal"),
      expect.stringContaining("Hard rock"),
    ]);
    expect(wrapper.findAll(".genre-rank i")).toHaveLength(3);
    expect(genreRows[0]?.text()).toContain("255 discos distintos valorados");
    await wrapper.get("dialog .close-button").trigger("keydown", { key: "Escape" });
    await nextTick();
    expect(wrapper.find("dialog").exists()).toBe(false);
    wrapper.unmount();
  });

  it("uses backend interval order, nullable averages, empty streaks, and absent genres", async () => {
    getCommunityDashboardStats.mockResolvedValueOnce({
      year: 2026,
      summary: { ratedDiscs: 0, releasedDiscs: 0, participatingUsers: 0, averageRating: null },
      ratingDistribution: [
        { label: "Intervalo superior", min: 7, max: 10, minInclusive: true, maxInclusive: true, count: 0 },
        { label: "Intervalo inferior", min: 0, max: 7, minInclusive: true, maxInclusive: false, count: 0 },
      ],
      currentStreaks: [],
      topGenres: [],
    });
    const wrapper = mountWidget();
    const button = wrapper.findAll("button").find((item) => item.text().trim() === "Estadísticas");
    await button?.trigger("click");
    await vi.waitFor(() => expect(getCommunityDashboardStats).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(wrapper.text()).toContain("Sin datos"));
    expect(wrapper.text()).toContain("Todavía no hay rachas activas.");
    expect(wrapper.text()).toContain("No hay géneros destacados para 2026.");
    const labels = wrapper.find(".distribution-list").findAll(".bucket-label").map((item) => item.text());
    expect(labels).toEqual(["Intervalo superior", "Intervalo inferior"]);
    expect(wrapper.text()).not.toMatch(/Nota media comunitaria\s*0/);
    wrapper.unmount();
  });

  it("updates an open modal on year change without showing the previous year's response", async () => {
    const wrapper = mountWidget();
    const button = wrapper.findAll("button").find((item) => item.text().trim() === "Estadísticas");
    await button?.trigger("click");
    await vi.waitFor(() => expect(getCommunityDashboardStats).toHaveBeenCalledOnce());
    expect(wrapper.text()).toContain("Resumen del año 2026.");

    await wrapper.get('select[aria-label="Año de estadísticas"]').setValue("2025");
    await vi.waitFor(() => expect(getCommunityDashboardStats).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(wrapper.text()).toContain("Resumen del año 2025."));
    expect(getCommunityDashboardStats).toHaveBeenLastCalledWith(2025, expect.any(AbortSignal));
    wrapper.unmount();
  });

  it("shows an HTTP error and allows retrying the modal query", async () => {
    getCommunityDashboardStats.mockRejectedValueOnce(new Error("HTTP 500"));
    const wrapper = mountWidget();
    const button = wrapper.findAll("button").find((item) => item.text().trim() === "Estadísticas");
    await button?.trigger("click");
    await vi.waitFor(() => expect(wrapper.get('[role="alert"]').text()).toContain("No se pudieron cargar"));
    const retryButton = wrapper.get('[role="alert"] button');
    expect(retryButton.element.tagName).toBe("BUTTON");
    expect(retryButton.element).toHaveProperty("tabIndex", 0);
    (retryButton.element as HTMLButtonElement).focus();
    expect(document.activeElement).toBe(retryButton.element);
    await wrapper.get('[role="alert"] button').trigger("click");
    await vi.waitFor(() => expect(getCommunityDashboardStats).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(wrapper.text()).toContain("Estadísticas de la comunidad"));
    wrapper.unmount();
  });

  it("cancels a direct modal request when the dialog closes during loading", async () => {
    getCommunityDashboardStats.mockImplementation(() => new Promise(() => undefined));
    const wrapper = mountWidget();
    const button = wrapper.findAll("button").find((item) => item.text().trim() === "Estadísticas");
    await button?.trigger("click");
    await vi.waitFor(() => expect(getCommunityDashboardStats).toHaveBeenCalledOnce());
    expect(wrapper.get('[role="status"]').text()).toContain("Cargando estadísticas");
    const signal = getCommunityDashboardStats.mock.calls[0]?.[1] as AbortSignal;
    await wrapper.get("dialog .close-button").trigger("keydown", { key: "Escape" });
    await nextTick();
    await vi.waitFor(() => expect(signal.aborted).toBe(true));
    wrapper.unmount();
  });

  it("cancels obsolete year requests and ignores a late response", async () => {
    let resolveOld!: (value: ReturnType<typeof response>) => void;
    getCommunityDashboardRankings
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }))
      .mockImplementationOnce(async (year: number) => response(year));
    const wrapper = mountWidget();
    const oldSignal = getCommunityDashboardRankings.mock.calls[0]?.[1] as AbortSignal;

    await wrapper.get("select").setValue("2025");
    await vi.waitFor(() => expect(wrapper.text()).toContain("Riffer 2025"));
    expect(oldSignal.aborted).toBe(true);
    resolveOld(response(2026));
    await nextTick();
    expect(wrapper.text()).toContain("Riffer 2025");
    expect(wrapper.text()).not.toContain("Riffer 2026");
    wrapper.unmount();
  });

  it("aborts the active request on unmount", () => {
    getCommunityDashboardRankings.mockImplementation(() => new Promise(() => undefined));
    const wrapper = mountWidget();
    const signal = getCommunityDashboardRankings.mock.calls[0]?.[1] as AbortSignal;
    wrapper.unmount();
    expect(signal.aborted).toBe(true);
  });

  it("does not request while disabled and preserves the comunidad preference", async () => {
    const modules = ref(communityModules(false));
    const pinia = createPinia();
    setActivePinia(pinia);
    useAuthStore().$patch({ authStatus: "authenticated", userId: "user-a", role: "user" });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    const wrapper = mount(defineComponent({
      setup() {
        return () => h(DashboardWidgetGrid, { modules: modules.value }, {
          comunidad: () => h(DashboardCommunityWidget),
        });
      },
    }), { global: { plugins: [pinia, [VueQueryPlugin, { queryClient }]] } });

    await nextTick();
    expect(wrapper.findComponent(DashboardCommunityWidget).exists()).toBe(false);
    expect(getCommunityDashboardRankings).not.toHaveBeenCalled();

    modules.value = communityModules(true);
    await vi.waitFor(() => expect(getCommunityDashboardRankings).toHaveBeenCalledOnce());
    modules.value = communityModules(false);
    await nextTick();
    expect((getCommunityDashboardRankings.mock.calls[0]?.[1] as AbortSignal).aborted).toBe(true);
    expect(getCommunityDashboardStats).not.toHaveBeenCalled();
    modules.value = communityModules(true);
    await vi.waitFor(() => expect(getCommunityDashboardRankings).toHaveBeenCalledTimes(2));

    const preference = dashboardWidgetDefaults.find(({ id }) => id === "comunidad");
    expect(preference).toMatchObject({ id: "comunidad", size: "half" });
    expect(dashboardWidgetRegistry.find(({ id }) => id === "comunidad")).toMatchObject({
      id: "comunidad",
      size: "half",
      order: 1,
    });
    wrapper.unmount();
  });
});
