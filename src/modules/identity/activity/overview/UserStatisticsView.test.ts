// @vitest-environment happy-dom
import { existsSync, readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";

const { getActivitySummary } = vi.hoisted(() => ({ getActivitySummary: vi.fn() }));

vi.mock("@/modules/identity/activity/api/activity", () => ({
  getActivitySummary,
  getActivityUsers: vi.fn(),
  getActivityUserDetail: vi.fn(),
}));
vi.mock("vue-chartjs", () => ({
  Line: { name: "Line", props: ["data", "options"], template: "<div data-chart />" },
}));

import { observePrivateQueryCache } from "@/app/privateQueryCache";
import { useAuthStore } from "@/modules/identity/auth/stores/auth";
import type { ActivityDashboardResponse, ActivitySummaryResponse } from "@/modules/identity/activity/types/activity";
import { Line } from "vue-chartjs";
import AdminStats from "./UserStatisticsView.vue";

const complete = { status: "complete" as const, dataSince: "2026-09-01" };
const dashboardFor = (): ActivityDashboardResponse => ({
  periods: {
    current: { from: "2026-09-25", to: "2026-10-24" },
    previous: { from: "2026-08-26", to: "2026-09-24" },
    baseline: { from: "2026-07-27", to: "2026-08-25" },
  },
  timezone: "Europe/Madrid",
  asOf: "2026-10-24T10:30:00.000Z",
  activityDataSince: "2026-09-01",
  voteDataSince: "2026-09-01",
  activeUsers: { current: 12, previous: 10, delta: 2, changePercent: 20, coverage: { current: complete, previous: complete } },
  newVotes: { current: 30, previous: 20, delta: 10, changePercent: 50, coverage: { current: complete, previous: complete } },
  votingUsers: { current: 8, previous: 6, delta: 2, changePercent: 33.333, coverage: { current: complete, previous: complete } },
  participationRate: { current: 40, previous: 30, delta: 10, changePercent: 33.333, coverage: { current: complete, previous: complete } },
  votesPerActiveUser: { current: 2.5, previous: 2, delta: 0.5, changePercent: 25, coverage: { current: complete, previous: complete } },
  returningUsers: { current: 5, previous: 4, delta: 1, changePercent: 25, coverage: { current: complete, previous: complete, baseline: complete } },
  retentionRate: { current: 50, previous: 40, delta: 10, changePercent: 25, coverage: { current: complete, previous: complete, baseline: complete } },
  currentRatings: {
    current: 17,
    previous: null,
    delta: null,
    changePercent: null,
    coverage: { current: complete, previous: { status: "unavailable", dataSince: null } },
    reason: "unavailable",
  },
  series: {
    current: [
      { date: "2026-09-25", dayIndex: 0, activeUsers: 2, newVotes: 4 },
      { date: "2026-09-26", dayIndex: 1, activeUsers: 3, newVotes: 0 },
    ],
    previous: [
      { date: "2026-08-26", dayIndex: 0, activeUsers: 1, newVotes: 2 },
      { date: "2026-08-27", dayIndex: 1, activeUsers: null, newVotes: 1 },
    ],
  },
});

const summaryFor = (dashboard = dashboardFor()): ActivitySummaryResponse => ({
  from: "2026-09-25",
  to: "2026-10-24",
  timezone: "Europe/Madrid",
  activityDataSince: "2026-09-01",
  voteDataSince: "2026-09-01",
  periods: {
    activeUsers7: null,
    activeUsers30: null,
    voteActions7: null,
    voteActions30: null,
    votingUsers7: null,
    votingUsers30: null,
  },
  series: [],
  dashboard,
});

describe("AdminStats dashboard", () => {
  let queryClient: QueryClient;
  let pinia: ReturnType<typeof createPinia>;
  let stopPrivateCacheObserver: (() => void) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    pinia = createPinia();
    setActivePinia(pinia);
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 60_000, gcTime: Infinity } } });
    const authStore = useAuthStore();
    authStore.$patch({
      authStatus: "authenticated",
      token: "memory-token",
      userId: "admin-a",
      username: "admin-a",
      role: "superadmin",
      authSessionGeneration: 3,
    });
    stopPrivateCacheObserver = observePrivateQueryCache(authStore, queryClient);
    getActivitySummary.mockResolvedValue(summaryFor());
  });

  afterEach(() => {
    stopPrivateCacheObserver?.();
    stopPrivateCacheObserver = undefined;
    queryClient.clear();
    vi.restoreAllMocks();
  });

  function render() {
    return mount(AdminStats, { global: { plugins: [pinia, [VueQueryPlugin, { queryClient }]] } });
  }

  it("renders all backend KPIs, period context and rate units", async () => {
    const wrapper = render();

    await vi.waitFor(() => expect(wrapper.findAll(".metric-card")).toHaveLength(8));
    expect(getActivitySummary).toHaveBeenCalledWith({ period: 30 }, expect.any(AbortSignal));
    expect(wrapper.text()).toContain("Votos nuevos");
    expect(wrapper.text()).toContain("Usuarios que votaron");
    expect(wrapper.text()).toContain("Participación");
    expect(wrapper.text()).toContain("Votos por usuario activo");
    expect(wrapper.text()).toContain("Usuarios recurrentes");
    expect(wrapper.text()).toContain("Retención");
    expect(wrapper.text()).toContain("Valoraciones actuales");
    expect(wrapper.text()).toContain("40 %");
    expect(wrapper.text()).toContain("+10 pp");
    expect(wrapper.text()).toContain("+33,33 %");
    expect(wrapper.text()).toContain("Anterior vs. base");
    expect(wrapper.text()).toContain("Sin snapshot histórico para comparar.");
    expect(wrapper.text()).toContain("Europe/Madrid");
    expect(wrapper.findAll(".metric-card")).toHaveLength(8);
    wrapper.unmount();
  });

  it("switches among presets and sends custom dates only when the range is complete", async () => {
    const wrapper = render();
    await vi.waitFor(() => expect(getActivitySummary).toHaveBeenCalledTimes(1));

    await wrapper.findAll("button").find((button) => button.text() === "7 días")!.trigger("click");
    await vi.waitFor(() => expect(getActivitySummary).toHaveBeenCalledTimes(2));
    await wrapper.findAll("button").find((button) => button.text() === "90 días")!.trigger("click");
    await vi.waitFor(() => expect(getActivitySummary).toHaveBeenCalledTimes(3));
    await wrapper.findAll("button").find((button) => button.text() === "Personalizado")!.trigger("click");
    expect(wrapper.text()).toContain("Selecciona las dos fechas");
    expect(getActivitySummary).toHaveBeenCalledTimes(3);

    await wrapper.get('input[aria-label="Fecha desde"]').setValue("2026-10-01");
    expect(getActivitySummary).toHaveBeenCalledTimes(3);
    await wrapper.get('input[aria-label="Fecha hasta"]').setValue("2026-10-07");
    await vi.waitFor(() => expect(getActivitySummary).toHaveBeenCalledTimes(4));
    expect(getActivitySummary).toHaveBeenLastCalledWith({ from: "2026-10-01", to: "2026-10-07" }, expect.any(AbortSignal));

    await wrapper.get('input[aria-label="Fecha desde"]').setValue("2026-10-10");
    expect(wrapper.text()).toContain("La fecha inicial debe ser anterior o igual a la final.");
    expect(getActivitySummary).toHaveBeenCalledTimes(4);
    wrapper.unmount();
  });

  it("plots current and previous series aligned by day while keeping null gaps", async () => {
    const wrapper = render();
    await vi.waitFor(() => expect(wrapper.findAllComponents(Line)).toHaveLength(2));

    const [activeUsersChart, newVotesChart] = wrapper.findAllComponents(Line);
    expect(activeUsersChart!.props("data").datasets[0].data).toEqual([2, 3]);
    expect(activeUsersChart!.props("data").datasets[1].data).toEqual([1, null]);
    expect(activeUsersChart!.props("data").datasets[1].spanGaps).toBe(false);
    expect(newVotesChart!.props("data").datasets[0].data).toEqual([4, 0]);
    expect(newVotesChart!.props("data").datasets[1].data).toEqual([2, 1]);
    expect(wrapper.text()).toContain("línea discontinua");
    wrapper.unmount();
  });

  it("keeps null values and partial historical coverage visible as unavailable", async () => {
    const dashboard = dashboardFor();
    dashboard.activeUsers.current = null;
    dashboard.activeUsers.previous = null;
    dashboard.activeUsers.delta = null;
    dashboard.activeUsers.changePercent = null;
    dashboard.activeUsers.coverage.current = { status: "incomplete", dataSince: "2026-10-03" };
    dashboard.activeUsers.coverage.previous = { status: "unavailable", dataSince: null };
    dashboard.series.current[0]!.activeUsers = null;
    dashboard.series.current[1]!.activeUsers = null;
    dashboard.series.previous[0]!.activeUsers = null;
    dashboard.series.previous[1]!.activeUsers = null;
    getActivitySummary.mockResolvedValueOnce(summaryFor(dashboard));
    const wrapper = render();

    await vi.waitFor(() => expect(wrapper.text()).toContain("Cobertura: actual: parcial desde 2026-10-03 · anterior: sin cobertura"));
    expect(wrapper.text()).toContain("No disponible");
    expect(wrapper.text()).toContain("No hay valores cubiertos para este indicador");
    wrapper.unmount();
  });

  it("shows a clear contract error and never requests or renders legacy statistics", async () => {
    const { dashboard: _dashboard, ...legacyOnly } = summaryFor();
    getActivitySummary.mockResolvedValueOnce(legacyOnly);
    const wrapper = render();

    await vi.waitFor(() => expect(wrapper.text()).toContain("Backend incompatible"));
    expect(wrapper.text()).toContain("bloque obligatorio de estadísticas «dashboard»");
    expect(wrapper.text()).not.toContain("Total usuarios");
    expect(getActivitySummary).toHaveBeenCalledOnce();
    expect(wrapper.text()).not.toContain("Nunca accedieron");
    wrapper.unmount();
  });

  it("shows HTTP errors inline and offers an explicit retry", async () => {
    getActivitySummary.mockRejectedValueOnce(new Error("offline"));
    const wrapper = render();
    await vi.waitFor(() => expect(wrapper.get('[role="alert"]').text()).toContain("Error al cargar las estadísticas"));
    getActivitySummary.mockResolvedValueOnce(summaryFor());

    await wrapper.get('[role="alert"] button').trigger("click");
    await vi.waitFor(() => expect(wrapper.text()).toContain("Usuarios activos"));
    expect(getActivitySummary).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it("hides cached dashboard data on downgrade and refetches after permission restoration", async () => {
    const wrapper = render();
    await vi.waitFor(() => expect(wrapper.text()).toContain("Usuarios activos"));
    const authStore = useAuthStore();
    const generation = authStore.authSessionGeneration;
    const identity = authStore.userId;

    // Equivalent session renewal updates credentials without clearing this view.
    authStore.$patch({ token: "renewed-token" });
    await flushPromises();
    expect(wrapper.text()).toContain("Usuarios activos");
    expect(getActivitySummary).toHaveBeenCalledOnce();

    authStore.$patch({ role: "user" });
    await vi.waitFor(() => expect(wrapper.text()).not.toContain("Usuarios activos"));
    expect(queryClient.getQueryCache().getAll().every((query) => query.state.data === undefined)).toBe(true);

    authStore.$patch({ role: "superadmin" });
    await vi.waitFor(() => expect(getActivitySummary).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(wrapper.text()).toContain("Usuarios activos"));
    expect(authStore.userId).toBe(identity);
    expect(authStore.authSessionGeneration).toBe(generation);

    authStore.clearSessionLocally();
    await vi.waitFor(() => expect(wrapper.find("main").exists()).toBe(false));
    wrapper.unmount();
  });

  it("does not query for a non-superadmin and contains no legacy frontend consumers", async () => {
    useAuthStore().$patch({ role: "user" });
    const wrapper = render();
    await flushPromises();

    expect(getActivitySummary).not.toHaveBeenCalled();
    wrapper.unmount();

  const viewSource = readFileSync("src/modules/identity/activity/overview/UserStatisticsView.vue", "utf8");
    const apiSource = readFileSync("src/modules/identity/users/api/users.ts", "utf8");
    const typesSource = readFileSync("src/modules/identity/users/types/users.ts", "utf8");
    const mutationsSource = readFileSync("src/modules/identity/users/composables/useAdminUserMutations.ts", "utf8");
    expect(viewSource).not.toContain("useAdminStatsQuery");
    expect(viewSource).not.toContain("getAdminStats");
    expect(apiSource).not.toContain("getAdminStats");
    expect(apiSource).not.toContain("/auth/users/admin-stats");
    expect(typesSource).not.toContain("AdminStatsResponse");
    expect(typesSource).not.toContain("AdminStatsParams");
    expect(mutationsSource).not.toContain("adminStatsQueryKey");
    expect(existsSync("src/modules/identity/composables/useAdminStatsQuery.ts")).toBe(false);
  });
});
