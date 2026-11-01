// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RadarListsView from "./RadarListsView.vue";
import RadarListCard from "../components/RadarListCard.vue";
import type { ListSummary } from "@services/list/list";

const { getCurrentWeeklyLists, getPastWeeklyLists, push } = vi.hoisted(() => ({
  getCurrentWeeklyLists: vi.fn(),
  getPastWeeklyLists: vi.fn(),
  push: vi.fn(),
}));
vi.mock("@services/list/list", () => ({ getCurrentWeeklyLists, getPastWeeklyLists }));
vi.mock("vue-router", () => ({ useRouter: () => ({ push }) }));

import { useAuthStore } from "@/modules/identity/auth";

const currentRadar: ListSummary = {
  id: "radar-1",
  name: "Radar semanal",
  type: "week",
  status: "new",
  listDate: new Date().toISOString(),
};

describe("Radar list view", () => {
  let queryClient: QueryClient;
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    useAuthStore().$patch({
      authStatus: "authenticated",
      token: "token",
      userId: "user-a",
      role: "riffvalley",
      authSessionGeneration: 3,
    });
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    getCurrentWeeklyLists.mockResolvedValue([currentRadar]);
    getPastWeeklyLists.mockResolvedValue([]);
  });

  function mountView() {
    return mount(RadarListsView, {
      global: {
        plugins: [[VueQueryPlugin, { queryClient }]],
        stubs: { CollapsibleSection: { template: "<section><slot /></section>" } },
      },
    });
  }

  it("loads current and past lists with a valid initial year and month", async () => {
    mountView();
    await flushPromises();
    const now = new Date();
    expect(getCurrentWeeklyLists).toHaveBeenCalledOnce();
    expect(getPastWeeklyLists).toHaveBeenCalledWith(
      now.getFullYear(),
      now.getMonth() + 1,
      expect.any(AbortSignal)
    );
  });

  it("shows loading before a successful empty historical response", async () => {
    let resolve!: (lists: ListSummary[]) => void;
    getPastWeeklyLists.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      })
    );
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain("Cargando listas…");
    expect(wrapper.text()).not.toContain("Sin radares este mes");
    resolve([]);
    await vi.waitFor(() => expect(wrapper.text()).toContain("Sin radares este mes"));
  });

  it("queries each selected year and month without replacing the Radar filters", async () => {
    const wrapper = mountView();
    await flushPromises();
    const [yearSelect, monthSelect] = wrapper.findAll("select");
    await yearSelect!.setValue("2025");
    await flushPromises();
    await monthSelect!.setValue("4");
    await flushPromises();
    expect(getPastWeeklyLists).toHaveBeenNthCalledWith(
      2,
      2025,
      new Date().getMonth() + 1,
      expect.any(AbortSignal)
    );
    expect(getPastWeeklyLists).toHaveBeenLastCalledWith(2025, 4, expect.any(AbortSignal));
  });

  it("does not show a previous month while the selected Radar month is loading", async () => {
    let resolveNewPeriod!: (lists: ListSummary[]) => void;
    getPastWeeklyLists.mockResolvedValueOnce([
      { id: "old-period", name: "Radares de noviembre", type: "week", listDate: "2026-11-06" },
    ]);
    getPastWeeklyLists.mockReturnValueOnce(
      new Promise((done) => {
        resolveNewPeriod = done;
      })
    );
    const wrapper = mountView();
    await vi.waitFor(() => expect(wrapper.text()).toContain("Radares de noviembre"));

    await wrapper.findAll("select")[1]!.setValue("4");
    await flushPromises();
    expect(wrapper.text()).toContain("Cargando listas…");
    expect(wrapper.text()).not.toContain("Radares de noviembre");

    resolveNewPeriod([
      { id: "new-period", name: "Radares de abril", type: "week", listDate: "2026-04-03" },
    ]);
    await vi.waitFor(() => expect(wrapper.text()).toContain("Radares de abril"));
  });

  it("shows an error instead of an empty state and allows retry", async () => {
    getPastWeeklyLists.mockRejectedValue(new Error("offline"));
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain("Reintentando consulta…");
    await vi.waitFor(() => expect(wrapper.text()).toContain("No se pudieron cargar las listas."), {
      timeout: 3000,
    });
    expect(wrapper.text()).toContain("No se pudieron cargar las listas.");
    expect(wrapper.text()).not.toContain("Sin radares este mes");
    getPastWeeklyLists.mockResolvedValueOnce([
      { id: "past-1", name: "Radar anterior", type: "week", listDate: "2025-04-04" },
    ]);
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Reintentar"))!
      .trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("Radar anterior");
    expect(getPastWeeklyLists).toHaveBeenCalledTimes(3);
  });

  it("navigates to Radar details", async () => {
    const wrapper = mountView();
    await flushPromises();
    await wrapper.findComponent(RadarListCard).trigger("click");
    expect(push).toHaveBeenCalledWith("/discos/radar/radar-1");
  });
});
