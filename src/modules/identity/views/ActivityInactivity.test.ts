// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, h } from "vue";
import { createRouter, createMemoryHistory } from "vue-router";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";

const getActivityInactivity = vi.hoisted(() => vi.fn());
vi.mock("@/modules/identity/api/activity", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/identity/api/activity")>();
  return { ...actual, getActivityInactivity };
});

import { useAuthStore } from "@/modules/identity/stores/auth";
import type {
  ActivityInactivityResponse,
  ActivityInactivityUser,
} from "@/modules/identity/types/activityInactivity";
import ActivityInactivity from "./ActivityInactivity.vue";

function user(overrides: Partial<ActivityInactivityUser> = {}): ActivityInactivityUser {
  return {
    userId: "u-known",
    username: "Banda Escuchada",
    role: "user",
    isActive: true,
    lastVoteAt: "2026-10-04T21:40:00.000Z",
    daysSinceLastVote: 20,
    inactivityGroup: "14_29_days",
    lastPresenceAt: "2026-10-24",
    lastRatingModifiedAt: "2026-10-24T22:12:00.000",
    currentRatings: 13,
    ...overrides,
  };
}

function response(overrides: Partial<ActivityInactivityResponse> = {}): ActivityInactivityResponse {
  return {
    asOf: "2026-10-24",
    timezone: "Europe/Madrid",
    totalUsers: 3,
    groups: {
      "0_2_days": 0,
      "3_6_days": 0,
      "7_13_days": 0,
      "14_29_days": 1,
      "30_59_days": 0,
      "60_plus_days": 0,
      never_voted: 1,
      insufficient_history: 1,
    },
    coverage: {
      status: "partial",
      captureStartedAt: "2026-10-22T10:00:00.000Z",
      captureDataSince: "2026-10-22",
      interpretation: "Los eventos set son fiables desde el inicio de captura.",
    },
    limit: 20,
    offset: 0,
    sortBy: "daysSinceLastVote",
    sortOrder: "desc",
    data: [
      user(),
      user({
        userId: "u-never", username: "Persona nueva", lastVoteAt: null, daysSinceLastVote: null,
        inactivityGroup: "never_voted", lastPresenceAt: null, lastRatingModifiedAt: null, currentRatings: 0,
      }),
      user({
        userId: "u-unknown", username: "Historia antigua", lastVoteAt: null, daysSinceLastVote: null,
        inactivityGroup: "insufficient_history", lastPresenceAt: null, lastRatingModifiedAt: null, currentRatings: 0,
      }),
    ],
    ...overrides,
  };
}

describe("ActivityInactivity view", () => {
  let queryClient: QueryClient;
  let pinia: ReturnType<typeof createPinia>;
  let router: ReturnType<typeof createRouter>;
  let wrappers: ReturnType<typeof mount>[];

  beforeEach(async () => {
    vi.clearAllMocks();
    wrappers = [];
    pinia = createPinia();
    setActivePinia(pinia);
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    useAuthStore().$patch({
      authStatus: "authenticated",
      token: "memory-token",
      userId: "admin-1",
      username: "admin",
      role: "superadmin",
      authSessionGeneration: 7,
    });
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/users/stats/inactivity", name: "UserStatsInactivity", component: ActivityInactivity },
        { path: "/users/stats/users", name: "UserStatsUsers", component: defineComponent(() => () => h("div", "Detalle individual")) },
      ],
    });
    await router.push("/users/stats/inactivity");
    await router.isReady();
  });

  afterEach(() => {
    wrappers.forEach((wrapper) => wrapper.unmount());
    queryClient.clear();
    vi.restoreAllMocks();
  });

  function render() {
    const wrapper = mount(ActivityInactivity, {
      global: { plugins: [pinia, router, [VueQueryPlugin, { queryClient }]] },
    });
    wrappers.push(wrapper);
    return wrapper;
  }

  function dispose(wrapper: ReturnType<typeof mount>) {
    wrappers = wrappers.filter((item) => item !== wrapper);
    wrapper.unmount();
  }

  it("shows all exclusive groups, distinguishes unknown history, and preserves nulls", async () => {
    getActivityInactivity.mockImplementation(async (params) => response({
      asOf: params.asOf,
      offset: params.offset,
    }));
    const wrapper = render();

    await vi.waitFor(() => expect(wrapper.text()).toContain("Persona nueva"));
    expect(wrapper.text()).toContain("14–29 días");
    expect(wrapper.text()).toContain("20 días");
    expect(wrapper.text()).toContain("Nunca ha votado");
    expect(wrapper.text()).toContain("Historial insuficiente");
    expect(wrapper.text()).toContain("Sin dato histórico");
    expect(wrapper.text()).toContain("13");
    expect(wrapper.text()).not.toContain("20 días sin voto");
    expect(wrapper.text()).not.toContain("%");
    expect(wrapper.text()).toContain("Los eventos set son fiables desde el inicio de captura.");
  });

  it("sends the exact filters and resets offset when population filters change", async () => {
    getActivityInactivity.mockImplementation(async (params) => response({
      asOf: params.asOf,
      offset: params.offset,
      totalUsers: 41,
      groups: {
        "0_2_days": 0,
        "3_6_days": 0,
        "7_13_days": 0,
        "14_29_days": 39,
        "30_59_days": 0,
        "60_plus_days": 0,
        never_voted: 1,
        insufficient_history: 1,
      },
    }));
    const wrapper = render();
    await vi.waitFor(() => expect(getActivityInactivity).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(wrapper.text()).toContain("Banda Escuchada"));

    const asOfInput = wrapper.find('input[type="date"]');
    await asOfInput.setValue("2026-10-23");
    await vi.waitFor(() => expect(getActivityInactivity).toHaveBeenLastCalledWith(
      expect.objectContaining({ asOf: "2026-10-23", limit: 20, offset: 0, sortBy: "daysSinceLastVote", sortOrder: "desc" }),
      expect.any(AbortSignal),
    ));
    await vi.waitFor(() => expect(wrapper.text()).toContain("Página 1 de 3"));

    await wrapper.get("button.pagination-next").trigger("click");
    await vi.waitFor(() => expect(getActivityInactivity).toHaveBeenLastCalledWith(
      expect.objectContaining({ asOf: "2026-10-23", offset: 20 }),
      expect.any(AbortSignal),
    ));
    await vi.waitFor(() => expect(wrapper.text()).toContain("Página 2 de 3"));

    const selects = wrapper.findAll("select");
    await selects[0]!.setValue("collaborator");
    await vi.waitFor(() => expect(getActivityInactivity).toHaveBeenLastCalledWith(
      expect.objectContaining({ asOf: "2026-10-23", role: "collaborator", offset: 0 }),
      expect.any(AbortSignal),
    ));

    await selects[1]!.setValue("false");
    await vi.waitFor(() => expect(getActivityInactivity).toHaveBeenLastCalledWith(
      expect.objectContaining({ isActive: "false", offset: 0 }),
      expect.any(AbortSignal),
    ));

    await selects[2]!.setValue("currentRatings");
    await vi.waitFor(() => expect(getActivityInactivity).toHaveBeenLastCalledWith(
      expect.objectContaining({ sortBy: "currentRatings", offset: 0 }),
      expect.any(AbortSignal),
    ));
    await selects[3]!.setValue("asc");
    await vi.waitFor(() => expect(getActivityInactivity).toHaveBeenLastCalledWith(
      expect.objectContaining({ sortOrder: "asc", offset: 0 }),
      expect.any(AbortSignal),
    ));
  });

  it("links a user to the existing individual activity route with its identifier", async () => {
    getActivityInactivity.mockResolvedValue(response());
    const wrapper = render();
    await vi.waitFor(() => expect(wrapper.text()).toContain("Banda Escuchada"));

    await wrapper.get('a[aria-label="Ver actividad de Banda Escuchada"]').trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("UserStatsUsers");
    expect(router.currentRoute.value.query.userId).toBe("u-known");
  });

  it("shows distinct empty, HTTP error, and incompatible contract states", async () => {
    getActivityInactivity.mockResolvedValueOnce(response({ totalUsers: 0, groups: {
      "0_2_days": 0, "3_6_days": 0, "7_13_days": 0, "14_29_days": 0,
      "30_59_days": 0, "60_plus_days": 0, never_voted: 0, insufficient_history: 0,
    }, data: [] }));
    const emptyView = render();
    await vi.waitFor(() => expect(emptyView.text()).toContain("No hay usuarios en la población seleccionada."));
    dispose(emptyView);

    queryClient.clear();
    getActivityInactivity.mockRejectedValueOnce({ response: { status: 403 } });
    const forbiddenView = render();
    await vi.waitFor(() => expect(forbiddenView.text()).toContain("Acceso no autorizado"));
    dispose(forbiddenView);

    queryClient.clear();
    getActivityInactivity.mockResolvedValueOnce({ ...response(), groups: { invalid: 3 } });
    const incompatibleView = render();
    await vi.waitFor(() => expect(incompatibleView.text()).toContain("Backend incompatible"));
    expect(incompatibleView.text()).toContain("Actualiza el backend");
  });

  it("distinguishes a stale empty page from an empty population and reports an expired session", async () => {
    getActivityInactivity.mockResolvedValueOnce(response({
      totalUsers: 21,
      offset: 20,
      groups: {
        "0_2_days": 0, "3_6_days": 0, "7_13_days": 0, "14_29_days": 19,
        "30_59_days": 0, "60_plus_days": 0, never_voted: 1, insufficient_history: 1,
      },
      data: [],
    }));
    const pageView = render();
    await vi.waitFor(() => expect(pageView.text()).toContain("Esta página no contiene resultados."));
    dispose(pageView);

    queryClient.clear();
    getActivityInactivity.mockRejectedValueOnce({ response: { status: 401 } });
    const expiredView = render();
    await vi.waitFor(() => expect(expiredView.text()).toContain("Sesión caducada"));
    expect(expiredView.text()).toContain("Inicia sesión de nuevo");
  });
});
