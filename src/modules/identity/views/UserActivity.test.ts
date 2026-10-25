// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, h, nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";

const { getGlobalActivity, getActivityUserDetail, errorToast } = vi.hoisted(() => ({
  getGlobalActivity: vi.fn(),
  getActivityUserDetail: vi.fn(),
  errorToast: vi.fn(),
}));

vi.mock("@/modules/identity/api/users", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/identity/api/users")>();
  return { ...actual, getGlobalActivity };
});
vi.mock("@/modules/identity/api/activity", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/identity/api/activity")>();
  return { ...actual, getActivityUserDetail };
});
vi.mock("vue-chartjs", () => ({ Line: defineComponent({ setup: (_props, { attrs }) => () => h("div", attrs) }) }));
vi.mock("@services/swal/SwalService", () => ({ default: { error: errorToast } }));

import { observePrivateQueryCache } from "@/app/privateQueryCache";
import { useAuthStore } from "@/modules/identity/stores/auth";
import { adminUsersQueryKeyForSession } from "@/modules/identity/composables/useAdminUsersQuery";
import { activityUserDetailQueryKeyForSession } from "@/modules/identity/composables/useActivityStatisticsQueries";
import type { ActivityUserDetailResponse } from "@/modules/identity/types/activity";
import type { AdminUser, GlobalActivityResponse } from "@/modules/identity/types/users";
import ActivityUserDailyCharts from "@/modules/identity/components/ActivityUserDailyCharts.vue";
import UserActivity from "./UserActivity.vue";

const users: AdminUser[] = [
  { id: "target-a", username: "Member A", email: "a@example.test", role: "user", createdAt: "2025-01-01", notes: null, isActive: true },
  { id: "target-b", username: "Member B", email: "b@example.test", role: "user", createdAt: "2025-01-01", notes: null, isActive: true },
];

const globalActivity: GlobalActivityResponse = {
  totalItems: 1,
  totalPages: 2,
  currentPage: 1,
  limit: 20,
  data: [{
    id: "vote-a",
    rate: 5,
    cover: 3,
    createdAt: "2025-03-04T12:30:00.000Z",
    editedAt: null,
    user: { id: "target-a", username: "Member A", image: "" },
    disc: { id: "disc-1", name: "Release A" },
  }],
};

const detailResponse = (userId: string): ActivityUserDetailResponse => ({
  userId,
  lastActiveDate: "2026-10-22",
  activeDays7: 2,
  activeDays30: 8,
  activeDates: ["2026-10-20", "2026-10-22"],
  presenceByDay: [
    { date: "2026-10-20", present: true },
    { date: "2026-10-21", present: false },
    { date: "2026-10-22", present: null },
  ],
  activityDataSince: "2026-10-20",
  activityCoverage: { status: "incomplete", dataSince: "2026-10-20" },
  currentVotes: 11,
  newVotes7: 2,
  newVotes30: 5,
  newVotesRecorded: 12,
  changedVotes7: 1,
  changedVotes30: 4,
  changedVotesRecorded: 9,
  lastVoteEventAt: "2026-10-22T12:00:00.000Z",
  voteDataSince: "2026-10-18",
  voteCoverage: { status: "incomplete", dataSince: "2026-10-18" },
  newVotesByDay: [
    { date: "2026-10-20", count: 1 },
    { date: "2026-10-21", count: 0 },
    { date: "2026-10-22", count: null },
  ],
  changedVotesByDay: [
    { date: "2026-10-20", count: 1 },
    { date: "2026-10-21", count: 0 },
    { date: "2026-10-22", count: null },
  ],
});

describe("UserActivity Query view", () => {
  let queryClient: QueryClient;
  let pinia: ReturnType<typeof createPinia>;
  let activityRouter: ReturnType<typeof createRouter>;
  let stopPrivateCacheObserver: (() => void) | undefined;
  let wrappers: ReturnType<typeof mount>[];

  beforeEach(async () => {
    vi.clearAllMocks();
    wrappers = [];
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    pinia = createPinia();
    setActivePinia(pinia);
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 60_000, gcTime: Infinity } } });
    activityRouter = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/users/stats/users", name: "UserStatsUsers", component: UserActivity }],
    });
    await activityRouter.push("/users/stats/users");
    await activityRouter.isReady();
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
  });

  afterEach(() => {
    wrappers.forEach((wrapper) => wrapper.unmount());
    stopPrivateCacheObserver?.();
    queryClient.clear();
    vi.restoreAllMocks();
  });

  function render(router: ReturnType<typeof createRouter> = activityRouter) {
    const plugins = [pinia, router, [VueQueryPlugin, { queryClient }] as const];
    const wrapper = mount(UserActivity, { global: { plugins } });
    wrappers.push(wrapper);
    return wrapper;
  }

  function primeUserList() {
    queryClient.setQueryData(adminUsersQueryKeyForSession("admin-a", 3), users);
  }

  it("keeps the global feed and pagination while replacing the selected-user detail with the new endpoint", async () => {
    primeUserList();
    getGlobalActivity.mockResolvedValue(globalActivity);
    getActivityUserDetail.mockImplementation(async (userId: string) => detailResponse(userId));
    const wrapper = render();

    await vi.waitFor(() => expect(wrapper.text()).toContain("Release A"));
    expect(getGlobalActivity).toHaveBeenCalledWith(20, 0, expect.any(AbortSignal));
    expect(wrapper.find("select").text()).toContain("Member A");
    expect(wrapper.find("select").text()).toContain("Member B");

    await wrapper.findAll("button").find((button) => button.text().includes("Member A"))!.trigger("click");
    await vi.waitFor(() => expect(wrapper.text()).toContain("Valoraciones actuales"));
    expect(getActivityUserDetail).toHaveBeenCalledWith("target-a", expect.objectContaining({ from: expect.any(String), to: expect.any(String) }), expect.any(AbortSignal));
    expect(wrapper.text()).toContain("Votos nuevos · set");
    expect(wrapper.text()).toContain("Modificaciones · change");
    expect(wrapper.text()).toContain("12 registrados desde el inicio de captura");
    expect(wrapper.text()).toContain("9 registradas desde el inicio de captura");
    expect(wrapper.text()).toContain("11");
    expect(wrapper.text()).toContain("parcial");
    expect(getGlobalActivity).toHaveBeenCalledTimes(1);

    await wrapper.find("select").setValue("target-b");
    await vi.waitFor(() => expect(getActivityUserDetail).toHaveBeenLastCalledWith("target-b", expect.any(Object), expect.any(AbortSignal)));
    expect(wrapper.text()).toContain("Actividad de Member B");
    const [, targetBRange] = getActivityUserDetail.mock.calls.at(-1)!;
    expect(queryClient.getQueryData(activityUserDetailQueryKeyForSession("target-b", targetBRange, "admin-a", 3)))
      .toMatchObject({ userId: "target-b" });
  });

  it("opens the individual detail when a userId is supplied by the administrative route", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/users/stats/users", name: "UserStatsUsers", component: UserActivity }],
    });
    await router.push({ name: "UserStatsUsers", query: { userId: "target-a" } });
    await router.isReady();
    primeUserList();
    getActivityUserDetail.mockImplementation(async (userId: string) => detailResponse(userId));
    const wrapper = render(router);

    await vi.waitFor(() => expect(wrapper.text()).toContain("Actividad de Member A"));
    expect(getActivityUserDetail).toHaveBeenCalledWith(
      "target-a",
      expect.objectContaining({ from: expect.any(String), to: expect.any(String) }),
      expect.any(AbortSignal),
    );
    expect(wrapper.text()).not.toContain("Release A");
  });

  it("sends preset and custom ranges and pauses requests while custom dates are incomplete", async () => {
    primeUserList();
    getGlobalActivity.mockResolvedValue(globalActivity);
    getActivityUserDetail.mockImplementation(async (userId: string) => detailResponse(userId));
    const wrapper = render();
    await vi.waitFor(() => expect(wrapper.text()).toContain("Release A"));
    await wrapper.find("select").setValue("target-a");
    await vi.waitFor(() => expect(getActivityUserDetail).toHaveBeenCalledOnce());

    await wrapper.findAll("button").find((button) => button.text() === "7 días")!.trigger("click");
    await vi.waitFor(() => expect(getActivityUserDetail).toHaveBeenCalledTimes(2));
    expect(getActivityUserDetail.mock.calls[1]?.[1]).toMatchObject({ from: expect.any(String), to: expect.any(String) });

    await wrapper.findAll("button").find((button) => button.text() === "Personalizado")!.trigger("click");
    await nextTick();
    const afterPreset = getActivityUserDetail.mock.calls.length;
    const dateInputs = wrapper.findAll('input[type="date"]');
    await dateInputs[0]!.setValue("2026-10-01");
    await nextTick();
    expect(getActivityUserDetail).toHaveBeenCalledTimes(afterPreset);
    await dateInputs[1]!.setValue("2026-10-07");
    await vi.waitFor(() => expect(getActivityUserDetail).toHaveBeenCalledTimes(afterPreset + 1));
    expect(getActivityUserDetail).toHaveBeenLastCalledWith("target-a", { from: "2026-10-01", to: "2026-10-07" }, expect.any(AbortSignal));
  });

  it("presents the three daily series without converting unknowns or covered zeroes", async () => {
    primeUserList();
    getGlobalActivity.mockResolvedValue(globalActivity);
    getActivityUserDetail.mockResolvedValue(detailResponse("target-a"));
    const wrapper = render();
    await vi.waitFor(() => expect(wrapper.text()).toContain("Release A"));
    await wrapper.find("select").setValue("target-a");
    await vi.waitFor(() => expect(wrapper.text()).toContain("Presencia diaria en App"));

    const charts = wrapper.findComponent(ActivityUserDailyCharts);
    expect(charts.props("activity").presenceByDay).toEqual([
      { date: "2026-10-20", present: true },
      { date: "2026-10-21", present: false },
      { date: "2026-10-22", present: null },
    ]);
    expect(charts.props("activity").newVotesByDay.map(({ count }: { count: number | null }) => count)).toEqual([1, 0, null]);
    expect(charts.props("activity").changedVotesByDay.map(({ count }: { count: number | null }) => count)).toEqual([1, 0, null]);
    expect(wrapper.text()).toContain("los valores no representan todo el rango");
  });

  it("shows 404, incompatible-contract and no-activity states with recovery where applicable", async () => {
    primeUserList();
    getGlobalActivity.mockResolvedValue(globalActivity);
    getActivityUserDetail.mockRejectedValueOnce({ response: { status: 404 } });
    const wrapper = render();
    await vi.waitFor(() => expect(wrapper.text()).toContain("Release A"));
    await wrapper.find("select").setValue("target-a");
    await vi.waitFor(() => expect(wrapper.get('[role="alert"]').text()).toContain("Usuario no encontrado"));

    getActivityUserDetail.mockResolvedValueOnce({ ...detailResponse("target-a"), newVotes7: undefined });
    await wrapper.get('[role="alert"] button').trigger("click");
    await vi.waitFor(() => expect(wrapper.get('[role="alert"]').text()).toContain("Backend incompatible"));

    getActivityUserDetail.mockResolvedValueOnce({
      ...detailResponse("target-a"),
      lastActiveDate: null,
      activeDays7: null,
      activeDays30: null,
      activeDates: [],
      currentVotes: 0,
      newVotes7: null,
      newVotes30: null,
      newVotesRecorded: 0,
      changedVotes7: null,
      changedVotes30: null,
      changedVotesRecorded: 0,
      lastVoteEventAt: null,
      presenceByDay: [{ date: "2026-10-20", present: null }],
      newVotesByDay: [{ date: "2026-10-20", count: null }],
      changedVotesByDay: [{ date: "2026-10-20", count: null }],
      activityCoverage: { status: "unavailable", dataSince: null },
      voteCoverage: { status: "unavailable", dataSince: null },
    });
    await wrapper.get('[role="alert"] button').trigger("click");
    await vi.waitFor(() => expect(wrapper.text()).toContain("No hay actividad registrada"));
    expect(wrapper.text()).toContain("no disponible");
    expect(wrapper.text()).toContain("Total de votos nuevos capturados: sin cobertura");
    expect(wrapper.text()).toContain("Total de modificaciones capturadas: sin cobertura");
    expect(wrapper.text()).not.toContain("0 registrados desde el inicio de captura");
  });

  it("does not execute either administrative query without a superadmin session", async () => {
    useAuthStore().$patch({ role: "user" });
    primeUserList();
    const wrapper = render();

    await wrapper.find("select").setValue("target-a");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(getGlobalActivity).not.toHaveBeenCalled();
    expect(getActivityUserDetail).not.toHaveBeenCalled();
  });

  it("clears the individual view when its administrative session expires", async () => {
    primeUserList();
    getGlobalActivity.mockResolvedValue(globalActivity);
    getActivityUserDetail.mockResolvedValue(detailResponse("target-a"));
    const wrapper = render();
    await vi.waitFor(() => expect(wrapper.text()).toContain("Release A"));
    await wrapper.find("select").setValue("target-a");
    await vi.waitFor(() => expect(wrapper.text()).toContain("Valoraciones actuales"));

    useAuthStore().clearSessionLocally();
    await vi.waitFor(() => expect(wrapper.get('[role="alert"]').text()).toContain("Sesión caducada"));
    expect(wrapper.text()).not.toContain("Valoraciones actuales");
  });

  it("treats an unauthorized detail response as an expired session", async () => {
    primeUserList();
    getGlobalActivity.mockResolvedValue(globalActivity);
    getActivityUserDetail.mockRejectedValueOnce({ response: { status: 401 } });
    const wrapper = render();
    await vi.waitFor(() => expect(wrapper.text()).toContain("Release A"));
    await wrapper.find("select").setValue("target-a");

    await vi.waitFor(() => expect(wrapper.get('[role="alert"]').text()).toContain("Sesión caducada"));
    expect(wrapper.text()).toContain("Inicia sesión de nuevo");
  });

  it("keeps global pagination and empty feed behavior", async () => {
    primeUserList();
    getGlobalActivity.mockImplementation(async (_limit: number, offset: number) => ({
      ...globalActivity,
      currentPage: offset / 20 + 1,
      data: offset === 0 ? globalActivity.data : [],
    }));
    const wrapper = render();
    await vi.waitFor(() => expect(wrapper.text()).toContain("Página 1 / 2"));
    await wrapper.findAll("button").filter((button) => button.classes().includes("page-btn")).at(1)!.trigger("click");
    await vi.waitFor(() => expect(wrapper.text()).toContain("Página 2 / 2"));
    expect(getActivityUserDetail).not.toHaveBeenCalled();
  });
});
