// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";

const { getStatisticsSummary, getStatisticsRatedDiscs } = vi.hoisted(() => ({
  getStatisticsSummary: vi.fn(),
  getStatisticsRatedDiscs: vi.fn(),
}));
vi.mock("@/modules/statistics/api/statisticsApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/statistics/api/statisticsApi")>()),
  getStatisticsSummary,
  getStatisticsRatedDiscs,
}));

import { useAuthStore } from "@/modules/identity/auth";
import { useStatisticsFilters } from "@/modules/statistics/application/statisticsFilters";
import Statistics from "./Statistics.vue";

const makeSummary = (overrides: Record<string, unknown> = {}) => ({
  year: 2026,
  timeZone: "UTC",
  activityBasis: "rate_created_at_estimate" as const,
  activityCoverage: "unknown" as const,
  activityCount: 7,
  scoredDiscs: 3,
  mean: 0,
  median: 7.25,
  standardDeviation: null,
  activityByGenre: [],
  activityByMonth: [],
  scoreDistribution: [],
  topDiscOverall: null,
  mostControversial: [],
  activityByDay: [],
  activityWithoutGenre: 0,
  ...overrides,
});

describe("Statistics view EST-FE-2/3/4", () => {
  let queryClient: QueryClient;
  let wrapper: ReturnType<typeof mount> | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    const auth = useAuthStore();
    auth.$patch({
      authStatus: "authenticated",
      token: "test-token",
      userId: "user-a",
      username: "user-a",
      role: "user",
      authSessionGeneration: 4,
    });
    const filters = useStatisticsFilters();
    filters.setYear(filters.currentYear.value);
    filters.timeZone.value = "UTC";
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    queryClient.clear();
  });

  function mountView() {
    wrapper = mount(Statistics, {
      attachTo: document.body,
      global: { plugins: [[VueQueryPlugin, { queryClient }]] },
    });
    return wrapper;
  }

  it("shows loading without fabricated values, then renders new summary metrics and formatted zero/null values", async () => {
    let resolveRequest!: (value: ReturnType<typeof makeSummary>) => void;
    getStatisticsSummary.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve; }));
    const view = mountView();

    expect(view.get('[aria-busy="true"]').text()).toContain("Cargando estadísticas");
    expect(view.text()).not.toContain("Total de votos");
    expect(view.text()).not.toContain("Ranking");

    resolveRequest(makeSummary({ activityCount: 12500, scoredDiscs: 11, mean: 0, median: null }));
    await flushPromises();

    const summary = view.get('[aria-label="Resumen anual"]');
    expect(summary.text()).toContain("Discos puntuados");
    expect(summary.text()).toContain("Nota media");
    expect(summary.text()).toContain("Mediana");
    expect(summary.text()).toContain("Desviación típica");
    expect(summary.text()).not.toContain("Actividad anual");
    expect(summary.findAll("article")).toHaveLength(4);
    expect(summary.text()).toContain("con nota vigente");
    expect(summary.text()).toContain("11");
    expect(summary.text()).toContain("0");
    expect(summary.text()).toContain("—");
    expect(summary.text()).toContain("Sin datos para clasificar");
    expect(view.get('[aria-label="Visualizaciones anuales"]').text()).toContain("Actividad mensual");
  });

  it("changes years reactively and never displays a previous year's response as the selected year", async () => {
    let resolve2025!: (value: ReturnType<typeof makeSummary>) => void;
    getStatisticsSummary.mockImplementation(({ year, timeZone }) => {
      if (year === 2025) return new Promise((resolve) => { resolve2025 = resolve; });
      return Promise.resolve(makeSummary({ year, timeZone, activityCount: 26, scoredDiscs: 26 }));
    });
    const view = mountView();
    await vi.waitFor(() => expect(view.text()).toContain("26"));
    expect(getStatisticsSummary).toHaveBeenCalledWith({ year: 2026, timeZone: "UTC" }, expect.any(AbortSignal));

    await view.get(".ss-trigger").trigger("click");
    await view.get("[role=listbox]").trigger("keydown", { key: "ArrowDown" });
    await view.get('[role="option"][data-option-index="1"]').trigger("keydown", { key: "Enter" });
    await vi.waitFor(() => expect(getStatisticsSummary).toHaveBeenCalledWith(
      { year: 2025, timeZone: "UTC" }, expect.any(AbortSignal),
    ));
    expect(view.get('[aria-busy="true"]').exists()).toBe(true);
    expect(view.find('[aria-label="Resumen anual"] article').exists()).toBe(false);

    resolve2025(makeSummary({ year: 2025, timeZone: "UTC", activityCount: 25, scoredDiscs: 25 }));
    await vi.waitFor(() => expect(view.get('[aria-label="Resumen anual"]').text()).toContain("25"));
    expect(view.get(".ss-trigger").attributes("aria-label")).toBe("Año de las estadísticas");
    expect(view.find('[role="option"][data-option-index="2"]').exists()).toBe(false);

    await view.get(".ss-trigger").trigger("click");
    await view.get('[role="option"][data-option-index="0"]').trigger("keydown", { key: "Enter" });
    await vi.waitFor(() => expect(view.get('[aria-label="Resumen anual"]').text()).toContain("26"));
    expect(view.get(".ss-trigger").text()).toContain("2026");
  });

  it("distinguishes no activity from activity without any currently scored discs", async () => {
    getStatisticsSummary.mockResolvedValueOnce(makeSummary({ activityCount: 0, scoredDiscs: 0, mean: null, median: null }));
    const view = mountView();
    await vi.waitFor(() => expect(view.text()).toContain("No hay actividad de voto registrada en 2026"));
    expect(view.get('[aria-label="Resumen anual"]').text()).toContain("0");
    expect(view.get('[aria-label="Resumen anual"]').text()).toContain("—");

    wrapper?.unmount();
    wrapper = undefined;
    queryClient.clear();
    getStatisticsSummary.mockResolvedValueOnce(makeSummary({ activityCount: 4, scoredDiscs: 0, mean: null, median: null }));
    const activeView = mountView();
    await vi.waitFor(() => expect(activeView.text()).toContain("Hay actividad este año"));
    const summary = activeView.get('[aria-label="Resumen anual"]').text();
    expect(summary).toContain("Discos puntuados");
    expect(summary).toContain("0");
    expect(summary.match(/—/g)).toHaveLength(3);
    expect(activeView.get('[aria-label="Visualizaciones anuales"]').text()).toContain("resumen anual indica 4");
    expect(activeView.get('[aria-label="Visualizaciones anuales"]').text()).toContain("No hay discos con una puntuación vigente");
  });

  it("reports errors with an accessible retry and keeps pending visualizations unmounted", async () => {
    getStatisticsSummary.mockRejectedValueOnce(new Error("network failure"))
      .mockRejectedValueOnce(new Error("network failure"))
      .mockResolvedValueOnce(makeSummary());
    const view = mountView();
    await vi.waitFor(
      () => expect(view.get('[role="alert"]').text()).toContain("No se pudieron cargar"),
      { timeout: 5000, interval: 25 },
    );
    expect(getStatisticsSummary).toHaveBeenCalledTimes(2);
    expect(view.get('[role="alert"] button').text()).toBe("Reintentar");
    expect(view.findComponent({ name: "GenreGalaxyModal" }).exists()).toBe(false);
    expect(getStatisticsRatedDiscs).not.toHaveBeenCalled();

    await view.get('[role="alert"] button').trigger("click");
    await vi.waitFor(() => expect(view.get('[aria-label="Resumen anual"]').exists()).toBe(true));
    expect(getStatisticsSummary).toHaveBeenCalledTimes(3);
    expect(getStatisticsRatedDiscs).not.toHaveBeenCalled();
  });

  it("loads the galaxy only after opening, selects discs with nullable metadata and restores focus on Escape", async () => {
    const duplicateTitleDiscs = [
      { id: "album-a", name: "Same title", rate: 8.5, artist: null, genre: null },
      { id: "album-b", name: "Same title", rate: 9, artist: { name: "Artist B" }, genre: { name: "Rock", color: "#334155" } },
    ];
    getStatisticsSummary.mockResolvedValue(makeSummary());
    getStatisticsRatedDiscs.mockResolvedValue(duplicateTitleDiscs);
    const view = mountView();
    await vi.waitFor(() => expect(view.text()).toContain("Actividad mensual"));

    const openButton = view.findAll("button").find((button) => button.text().includes("Abrir galaxia"));
    expect(openButton).toBeDefined();
    expect(getStatisticsRatedDiscs).not.toHaveBeenCalled();
    expect(view.findComponent({ name: "GenreGalaxyModal" }).exists()).toBe(false);
    openButton!.element.focus();
    await openButton!.trigger("click");
    await vi.waitFor(() => expect(getStatisticsRatedDiscs).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(document.body.querySelector("dialog")).not.toBeNull());
    expect(getStatisticsRatedDiscs).toHaveBeenCalledWith({ year: 2026, timeZone: "UTC" }, expect.any(AbortSignal));
    expect(document.activeElement).toBe(document.body.querySelector(".close-button"));
    document.body.querySelector(".close-button")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true }));
    expect(document.activeElement).toBe(document.body.querySelector(".zoom-controls button:last-child"));
    expect(document.body.querySelector('[aria-label="Modo de exploración"]')).toBeNull();
    expect(document.body.querySelector(".disc-list-panel")).toBeNull();
    expect(document.body.querySelector("#galaxy-disc-search")).toBeNull();
    const accessibleDiscSelect = document.body.querySelector('[aria-label="Seleccionar disco de la galaxia"]') as HTMLSelectElement;
    expect(accessibleDiscSelect.classList.contains("sr-only")).toBe(true);
    expect(Array.from(accessibleDiscSelect.options).map((option) => option.textContent?.trim())).toEqual([
      "Selecciona un disco",
      "Same title — Artista no disponible — Sin género — 8,5/10",
      "Same title — Artist B — Rock — 9/10",
    ]);
    accessibleDiscSelect.value = "album-b";
    accessibleDiscSelect.dispatchEvent(new Event("change", { bubbles: true }));
    await flushPromises();
    expect(document.body.querySelector('[data-test="selected-disc"]')?.textContent).toContain("Artist B");

    const galaxy = view.findComponent({ name: "GenreGalaxyDesktop" });
    expect(galaxy.exists()).toBe(true);
    galaxy.vm.$emit("select", "album-b");
    await flushPromises();
    expect(document.body.textContent).toContain("Same title");
    expect(document.body.querySelector('[data-test="selected-disc"]')?.textContent).toContain("Artist B");
    expect(document.body.querySelector('[data-test="selected-disc"]')?.textContent).toContain("Rock");
    expect(document.body.querySelector('[data-test="selected-disc"]')?.textContent).toContain("9");
    galaxy.vm.$emit("select", "album-a");
    await vi.waitFor(() => expect(document.body.querySelector('[data-test="selected-disc"]')?.textContent).toContain("Sin género"));
    expect(document.body.querySelector('[data-test="selected-disc"]')?.textContent).toContain("Artista no disponible");

    document.body.querySelector("dialog")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await vi.waitFor(() => expect(document.body.querySelector("dialog")).toBeNull());
    expect(document.activeElement).toBe(openButton!.element);
  });

  it("cancels a pending galaxy request when the modal closes", async () => {
    let requestSignal: AbortSignal | undefined;
    getStatisticsSummary.mockResolvedValue(makeSummary());
    getStatisticsRatedDiscs.mockImplementation((_params, signal: AbortSignal) => {
      requestSignal = signal;
      return new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
      });
    });
    const view = mountView();
    await vi.waitFor(() => expect(view.text()).toContain("Actividad mensual"));
    const openButton = view.findAll("button").find((button) => button.text().includes("Abrir galaxia"))!;
    await openButton.trigger("click");
    await vi.waitFor(() => expect(getStatisticsRatedDiscs).toHaveBeenCalledOnce());
    expect(requestSignal?.aborted).toBe(false);
    (document.body.querySelector('[aria-label="Cerrar galaxia musical"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(requestSignal?.aborted).toBe(true));
  });

  it("shows galaxy errors separately and retries the same year", async () => {
    getStatisticsSummary.mockResolvedValue(makeSummary());
    getStatisticsRatedDiscs.mockRejectedValueOnce(new Error("unavailable"))
      .mockRejectedValueOnce(new Error("unavailable"))
      .mockResolvedValueOnce([]);
    const view = mountView();
    await vi.waitFor(() => expect(view.text()).toContain("Actividad mensual"));
    const openButton = view.findAll("button").find((button) => button.text().includes("Abrir galaxia"))!;
    await openButton.trigger("click");
    await vi.waitFor(() => expect(document.body.querySelector('[data-test="galaxy-dialog"]')?.textContent).toContain("No se pudo cargar la galaxia"), { timeout: 4000 });
    expect(getStatisticsRatedDiscs).toHaveBeenCalledTimes(2);
    (document.body.querySelector('[role="alert"] button') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(document.body.textContent).toContain("No hay discos con puntuación vigente para este año."));
    expect(getStatisticsRatedDiscs).toHaveBeenCalledTimes(3);
    expect(document.body.textContent).not.toContain("network failure");
  });

  it("mounts the activity and EST-FE-4 visualizations from one summary query, without mounting the galaxy", async () => {
    getStatisticsSummary.mockResolvedValue(makeSummary({
      scoredDiscs: 11,
      scoreDistribution: Array.from({ length: 11 }, (_, score) => ({ score, scoredDiscCount: score === 9 ? 1 : 0 })),
      topDiscOverall: {
        id: "featured-2026", name: "Current-year record", rate: 9.5, image: null,
        artist: null, genre: null,
      },
      mostControversial: [{
        id: "controversial-2026", name: "Current-year split", image: null,
        userRate: 9, communityAverage: 6.9, diff: 2.1, artist: null, genre: null,
      }],
    }));
    const view = mountView();
    await vi.waitFor(() => expect(view.text()).toContain("Actividad mensual"));
    expect(view.text()).toContain("Calendario de actividad");
    expect(view.text()).toContain("Géneros representativos");
    expect(view.text()).not.toContain("asignaciones");
    expect(view.text()).toContain("No hay votos en ningún mes de 2026.");
    expect(view.text()).toContain("No hay discos con actividad en 2026.");
    expect(view.text()).toContain("No hay actividad asociada a géneros en 2026.");
    expect(view.text()).toContain("Discos puntuados 2026");
    expect(view.text()).toContain("9 hasta menos de 10");
    expect(view.text()).toContain("Current-year record");
    expect(view.text()).toContain("Current-year split");
    expect(view.text()).toContain("+2,10");
    expect(view.text()).not.toContain("Exploración opcional");
    expect(view.text()).toContain("Abrir galaxia de géneros");
    expect(getStatisticsSummary).toHaveBeenCalledOnce();
    expect(getStatisticsRatedDiscs).not.toHaveBeenCalled();
    expect(view.findComponent({ name: "GenreGalaxyModal" }).exists()).toBe(false);
    expect(view.get("#genre-activity-title").text()).toBe("Géneros representativos");
    const genreCard = view.get("#genre-activity-title").element.closest("article");
    expect(genreCard?.querySelector('button[aria-haspopup="dialog"]')?.textContent).toContain("Abrir galaxia de géneros");

    const summaryAndFeatured = view.get('[aria-label="Resumen anual y disco destacado"]');
    expect(summaryAndFeatured.classes()).toContain("lg:grid-cols-[minmax(0,2fr)_minmax(17rem,1fr)]");
    expect(summaryAndFeatured.element.children[0]?.getAttribute("aria-label")).toBe("Resumen anual");
    expect(summaryAndFeatured.element.children[1]?.tagName).toBe("ARTICLE");

    const source = await import("node:fs").then(({ readFileSync }) => readFileSync("src/views/statistics/Statistics.vue", "utf8"));
    expect(source).not.toContain("@services/rates/rates");
    expect(source).toContain('<GenreGalaxyModal v-if="isGalaxyOpen"');
    for (const file of [
      "src/views/statistics/components/ScoreDistributionChart.vue",
      "src/views/statistics/components/FeaturedDiscCard.vue",
      "src/views/statistics/components/ControversialDiscsList.vue",
    ]) {
      const componentSource = await import("node:fs").then(({ readFileSync }) => readFileSync(file, "utf8"));
      expect(componentSource).not.toContain("@services/rates/rates");
    }
  });

  it("does not keep a previous year's featured or controversial discs after changing year", async () => {
    getStatisticsSummary.mockImplementation(async ({ year, timeZone }) => makeSummary({
      year,
      timeZone,
      activityCount: 1,
      topDiscOverall: {
        id: `featured-${year}`, name: `Featured ${year}`, rate: 8, image: null, artist: null, genre: null,
      },
      mostControversial: [{
        id: `controversial-${year}`, name: `Controversial ${year}`, image: null,
        userRate: 8, communityAverage: 6, diff: 2, artist: null, genre: null,
      }],
    }));
    const view = mountView();
    await vi.waitFor(() => expect(view.text()).toContain("Featured 2026"));

    await view.get(".ss-trigger").trigger("click");
    await view.get("[role=listbox]").trigger("keydown", { key: "ArrowDown" });
    await view.get('[role="option"][data-option-index="1"]').trigger("keydown", { key: "Enter" });
    await vi.waitFor(() => expect(view.text()).toContain("Featured 2025"));
    expect(view.text()).toContain("Controversial 2025");
    expect(view.text()).not.toContain("Featured 2026");
    expect(view.text()).not.toContain("Controversial 2026");
    expect(getStatisticsSummary).toHaveBeenCalledTimes(2);
    expect(getStatisticsRatedDiscs).not.toHaveBeenCalled();
  });

  it("passes monthly, daily and genre contract values through unchanged", async () => {
    getStatisticsSummary.mockResolvedValue(makeSummary({
      activityByMonth: [{ month: "2026-03", activityCount: 7, topDisc: null }],
      activityByDay: [{ date: "2026-03-12", activityCount: 2, discs: [
        { discId: "daily-disc-1", title: "Daily album", artist: null, rate: null, date: "2026-03-12" },
        { discId: "daily-disc-2", title: "Daily album 2", artist: "Artist", rate: 8, date: "2026-03-12" },
      ] }],
      activityByGenre: [{ genre: "Post-rock", activityCount: 5, topDisc: null }],
      activityWithoutGenre: 2,
      activityBasis: "set_events",
    }));
    const view = mountView();

    await vi.waitFor(() => expect(view.text()).toContain("Géneros representativos"));
    expect(view.text()).toContain("2026");
    expect(view.text()).toContain("marzo");
    expect(view.text()).toContain("Post-rock");
    expect(view.text()).toContain("Sin género");
    expect(view.text()).toContain("7 votos");
    expect(view.text()).toContain("12 de marzo de 2026: 2 discos con actividad");
    expect(view.text()).not.toContain("sumen 8 votos");
    expect(getStatisticsSummary).toHaveBeenCalledOnce();
    expect(getStatisticsRatedDiscs).not.toHaveBeenCalled();
  });

  it("shows subtotal discrepancies without changing the annual summary or received values", async () => {
    getStatisticsSummary.mockResolvedValue(makeSummary({
      activityCount: 7,
      activityByMonth: [{ month: "2026-03", activityCount: 5, topDisc: null }],
      activityByDay: [{ date: "2026-03-12", activityCount: 1, discs: [
        { discId: "daily-disc-1", title: "Daily album", artist: null, rate: null, date: "2026-03-12" },
      ] }],
      activityByGenre: [{ genre: "Rock", activityCount: 7, topDisc: null }],
    }));
    const view = mountView();

    await vi.waitFor(() => expect(view.text()).toContain("Los meses suman 5 votos y el resumen anual indica 7."));
    expect(view.text()).toContain("Las fechas suman 1 registro de disco con actividad");
    expect(view.get('[aria-label="Resumen anual"]').text()).toContain("7");
    expect(view.text()).toContain("marzo");
    expect(getStatisticsSummary).toHaveBeenCalledOnce();
  });
});
