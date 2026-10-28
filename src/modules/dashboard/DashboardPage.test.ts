// @vitest-environment happy-dom
import { shallowMount } from "@vue/test-utils";
import { readFileSync } from "node:fs";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, getTopRatedOrFeaturedAndStats, getDiscs, getRandomDiscs, getDailyCoverFeatured, getUserHistoryService } =
  vi.hoisted(() => ({
    get: vi.fn(),
    getTopRatedOrFeaturedAndStats: vi.fn(),
    getDiscs: vi.fn(),
    getRandomDiscs: vi.fn(),
    getDailyCoverFeatured: vi.fn(),
    getUserHistoryService: vi.fn(),
  }));

vi.mock("@services/api/api", () => ({ default: { get } }));
vi.mock("@services/discs/discs", () => ({ getTopRatedOrFeaturedAndStats, getDiscs, getRandomDiscs, getDailyCoverFeatured }));
vi.mock("@services/rates/rates", () => ({
  getUserHistoryService,
  getRatesDashboardSummary: vi.fn(),
  getRatesHomeInsights: vi.fn(),
  postRateService: vi.fn(),
  updateRateService: vi.fn(),
}));
vi.mock("@/composables/useDashboardConfig", () => ({
  useDashboardConfig: () => ({ isEnabled: () => false, orderOf: () => 0, modules: { value: [] } }),
}));
vi.mock("@/composables/useIsMobileViewport", () => ({
  useIsMobileViewport: () => ({ value: false }),
}));
vi.mock("@helpers/dateConstants", () => ({ getAvailableYears: () => [2025, 2026] }));

import { observePrivateQueryCache } from "@/app/privateQueryCache";
import { useAuthStore } from "@/modules/identity/auth";
import DashboardPage from "./DashboardPage.vue";

const summary = {
  personal: {
    totalRatedDiscs: 8316,
    totalExploredGenres: 18,
    totalActiveDays: 312,
    currentStreak: 0,
    year: { ratedDiscs: 42, exploredGenres: 9, activeDays: 70 },
    month: { ratedDiscs: null, exploredGenres: 1, activeDays: 0 },
  },
  catalog: { totalDiscs: 2487, discsThisYear: 126, discsThisMonth: 14 },
};

function mountDashboard(authenticated: boolean) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const authStore = useAuthStore();
  if (authenticated) {
    authStore.$patch({
      token: "memory-only-token",
      authStatus: "authenticated",
      userId: "user-a",
      role: "user",
    });
  }
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, throwOnError: false },
      mutations: { retry: false },
    },
  });
  const stopObserving = observePrivateQueryCache(authStore, queryClient);
  const wrapper = shallowMount(DashboardPage, {
    global: {
      plugins: [pinia, [VueQueryPlugin, { queryClient }]],
      stubs: { CircleFlags: true, DashboardWelcomeBanner: false },
    },
  });

  return { authStore, queryClient, stopObserving, wrapper };
}

describe("DashboardPage DashboardSummary activation", () => {
  beforeEach(() => {
    get.mockReset();
    getTopRatedOrFeaturedAndStats.mockReset().mockResolvedValue({
      totalDiscs: 10,
      totalVotes: 0,
      topUsersByRates: [],
      topUsersByCover: [],
      ratingDistribution: [],
      discs: [],
    });
    getDiscs.mockReset().mockResolvedValue({ data: [], totalItems: 0 });
    getUserHistoryService.mockReset();
  });

  it("leaves random-disc state, timers, and roll handler to its widget", () => {
    const source = readFileSync("src/modules/dashboard/DashboardPage.vue", "utf8");

    for (const dashboardOwnedName of [
      "rollDice",
      "diceRolled",
      "diceRolling",
      "unvotedDiscCount",
      "diceInterval",
      "hoverInterval",
    ]) {
      expect(source).not.toContain(dashboardOwnedName);
    }
  });

  it("composes the cover widget through the existing grid and leaves its fetch out of the page", () => {
    const source = readFileSync("src/modules/dashboard/DashboardPage.vue", "utf8");

    expect(source).toContain('<DashboardWidgetGrid :modules="dashboardModules">');
    expect(source).toContain("<template #portadaDia>");
    expect(source).toContain("<DashboardCoverOfDayWidget />");
    expect(source).not.toContain("daily-cover-featured");
    expect(source).not.toContain("coverOfDayStarted");
    expect(source).not.toContain("dayMs");
    expect(source).toContain("useDashboardSummaryQuery()");
    expect(source).toContain("dashboardSummaryQuery.refetch()");
  });

  it("composes Community through its existing slot without owning its state or request", () => {
    const source = readFileSync("src/modules/dashboard/DashboardPage.vue", "utf8");

    expect(source).toContain("<template #comunidad>");
    expect(source).toContain("<DashboardCommunityWidget />");
    expect(source).not.toContain("fetchStats");
    expect(source).not.toContain("topUsersByRates");
    expect(source).not.toContain("selectedStatsYear");
  });

  it("composes the two Top 3 periods and leaves their requests to their own component instances", () => {
    const source = readFileSync("src/modules/dashboard/DashboardPage.vue", "utf8");

    expect(source).toContain('<template #top3semana>\n        <DashboardTop3Widget period="week" />');
    expect(source).toContain('<template #top3mes>\n        <DashboardTop3Widget period="month" />');
    expect(source).not.toContain("getTopRatedOrFeaturedAndStats");
    expect(source).not.toContain("fetchTopDiscs");
    expect(source).not.toContain("loadingTopDiscs");
    expect(source).not.toContain("topWeekDiscs");
    expect(source).not.toContain("topMonthDiscs");
  });

  it("composes Latest Votes as a widget and removes the legacy Rates request from the page", () => {
    const source = readFileSync("src/modules/dashboard/DashboardPage.vue", "utf8");

    expect(source).toContain("<template #ultimosVotos>");
    expect(source).toContain("<DashboardLatestVotesWidget />");
    expect(source).not.toContain("getRatesByUser");
    expect(source).not.toContain("fetchRecentVotes");
    expect(source).not.toContain("recentVotesLoading");
    expect(source).not.toContain("recentVotes");
  });

  it("composes Cemetery without owning catalog requests or selection state", () => {
    const source = readFileSync("src/modules/dashboard/DashboardPage.vue", "utf8");

    expect(source).toContain("<template #cementerio>");
    expect(source).toContain("<DashboardCemeteryWidget />");
    expect(source).not.toContain("fetchCemeteryDiscs");
    expect(source).not.toContain("cemeteryDiscs");
    expect(source).not.toContain("getDiscs(");
    expect(source).not.toContain("unratedByCommunity");
  });

  it("composes the NewsFeed directly and leaves its card, requests, and interactions to the widget", () => {
    const source = readFileSync("src/modules/dashboard/DashboardPage.vue", "utf8");

    expect(source).toContain("<template #novedades>\n        <NewsFeed />\n      </template>");
    expect(source).not.toContain("getNewsFeed");
    expect(source).not.toContain("getSourceFeed");
    expect(source).not.toContain("activeFilter");
    expect(source).not.toContain("selectedNews");
    expect(source).not.toContain("Novedades Riff Valley");
  });


  it("composes Musical World and Favorite Artists independently", () => {
    const source = readFileSync("src/modules/dashboard/DashboardPage.vue", "utf8");

    expect(source).toContain("<template #mundoMusical>");
    expect(source).toContain("<DashboardMusicalWorldWidget />");
    expect(source).toContain("<template #artistas>");
    expect(source).toContain("<DashboardFavoriteArtistsWidget />");
    expect(source).not.toContain("musicMapData");
    expect(source).not.toContain("musicMapLoading");
    expect(source).not.toContain("COUNTRY_ABBR");
    expect(source).not.toContain("getRatesHomeInsights");
    expect(source).not.toContain("getRatesTopArtists");
  });

  it("requests the summary once when an authenticated Dashboard mounts", async () => {
    get.mockResolvedValue({ data: summary });
    const { queryClient, stopObserving, wrapper } = mountDashboard(true);

    await vi.waitFor(() => expect(get).toHaveBeenCalledOnce());
    await vi.waitFor(() => {
      expect(wrapper.get('[data-test="banner-period-year"]').text()).toContain('42discos votados');
    });
    expect(get).toHaveBeenCalledWith("/app/dashboard-summary", { signal: expect.any(AbortSignal) });
    expect(getTopRatedOrFeaturedAndStats).not.toHaveBeenCalled();
    expect(getDiscs).not.toHaveBeenCalled();
    expect(getRandomDiscs).not.toHaveBeenCalled();
    expect(getUserHistoryService).not.toHaveBeenCalled();
    expect(wrapper.findAll('[data-test^="banner-period-"]')).toHaveLength(3);
    expect(wrapper.get('[data-test="banner-streak"]').exists()).toBe(true);
    expect(wrapper.get('[data-test="banner-content"]').classes()).toContain('lg:flex-row');
    expect(wrapper.get('[data-test="banner-period-month"]').text()).toContain('—discos votados');
    expect(wrapper.get('[data-test="banner-period-month"]').text()).toContain('14 discos');
    expect(wrapper.get('[data-test="banner-period-year"]').text()).toContain('9 géneros');
    expect(wrapper.get('[data-test="banner-period-history"]').text()).toContain('8.316discos votados');
    expect(wrapper.get('[data-test="banner-period-history"]').text()).toContain('2.487 discos');
    expect(wrapper.get('[data-test="banner-streak"]').text()).toContain('¡Vota un disco y empieza tu racha!');
    expect(wrapper.exists()).toBe(true);

    wrapper.unmount();
    stopObserving();
    queryClient.clear();
  });

  it("does not request the summary without a valid session", async () => {
    const { queryClient, stopObserving, wrapper } = mountDashboard(false);
    await Promise.resolve();

    expect(get).not.toHaveBeenCalled();
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find('[data-test="banner-stats"]').exists()).toBe(false);

    wrapper.unmount();
    stopObserving();
    queryClient.clear();
  });

  it("cancels the pending request when the Dashboard unmounts", async () => {
    let requestSignal: AbortSignal | undefined;
    get.mockImplementation((_url: string, config: { signal: AbortSignal }) => {
      requestSignal = config.signal;
      return new Promise(() => undefined);
    });
    const { queryClient, stopObserving, wrapper } = mountDashboard(true);

    await vi.waitFor(() => expect(get).toHaveBeenCalledOnce());
    wrapper.unmount();

    expect(requestSignal?.aborted).toBe(true);
    stopObserving();
    queryClient.clear();
  });

  it("keeps the Dashboard mounted when the summary request fails", async () => {
    const failure = new Error("summary unavailable");
    get.mockRejectedValueOnce(failure).mockResolvedValueOnce({ data: summary });
    const { queryClient, stopObserving, wrapper } = mountDashboard(true);

    await vi.waitFor(() => {
      const summaryQuery = queryClient
        .getQueryCache()
        .getAll()
        .find((query) => query.queryKey[1] === "dashboard-summary");
      expect(summaryQuery?.state.status).toBe("error");
    });
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.get('[data-test="banner-period-month"]').text()).toContain('—discos votados');
    expect(wrapper.get('[role="status"]').text()).toContain('No se pudieron cargar');
    await wrapper.get('[role="status"] button').trigger('click');
    await vi.waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(wrapper.get('[data-test="banner-period-history"]').text()).toContain('8.316discos votados'));

    wrapper.unmount();
    stopObserving();
    queryClient.clear();
  });

  it("updates visible banner metrics after invalidating the existing summary query", async () => {
    get.mockResolvedValueOnce({ data: summary }).mockResolvedValueOnce({
      data: {
        ...summary,
        personal: { ...summary.personal, month: { ...summary.personal.month, ratedDiscs: 9 } },
      },
    });
    const { queryClient, stopObserving, wrapper } = mountDashboard(true);
    await vi.waitFor(() => expect(get).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(wrapper.get('[data-test="banner-period-month"]').text()).toContain('—discos votados'));

    await queryClient.invalidateQueries({ queryKey: ["app", "dashboard-summary"] });
    await vi.waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(wrapper.get('[data-test="banner-period-month"]').text()).toContain('9discos votados'));

    wrapper.unmount();
    stopObserving();
    queryClient.clear();
  });
});
