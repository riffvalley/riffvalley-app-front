// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BestListsView from "./BestListsView.vue";
import type { ListSummary } from "@services/list/list";

const { getCurrentMonthlyLists, getPastMonthlyLists, push } = vi.hoisted(() => ({
  getCurrentMonthlyLists: vi.fn(),
  getPastMonthlyLists: vi.fn(),
  push: vi.fn(),
}));
vi.mock("@services/list/list", () => ({ getCurrentMonthlyLists, getPastMonthlyLists }));
vi.mock("vue-router", () => ({ useRouter: () => ({ push }) }));

import { useAuthStore } from "@/modules/identity/auth";

const currentMonthlyList: ListSummary = {
  id: "best-1",
  name: "Mejores de noviembre",
  type: "month",
  status: "published",
  listDate: new Date().toISOString(),
};

describe("Best monthly lists view", () => {
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
    getCurrentMonthlyLists.mockResolvedValue([currentMonthlyList]);
    getPastMonthlyLists.mockResolvedValue([]);
  });

  function mountView() {
    return mount(BestListsView, {
      global: {
        plugins: [[VueQueryPlugin, { queryClient }]],
        stubs: { CollapsibleSection: { template: "<section><slot /></section>" } },
      },
    });
  }

  it("loads current and historical monthly lists using only the initial year", async () => {
    mountView();
    await flushPromises();
    expect(getCurrentMonthlyLists).toHaveBeenCalledOnce();
    expect(getPastMonthlyLists).toHaveBeenCalledWith(
      new Date().getFullYear(),
      expect.any(AbortSignal)
    );
  });

  it("shows loading before a successful empty current response", async () => {
    let resolve!: (lists: ListSummary[]) => void;
    getCurrentMonthlyLists.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      })
    );
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain("Cargando listas…");
    expect(wrapper.text()).not.toContain("No hay listas actuales");
    resolve([]);
    await vi.waitFor(() => expect(wrapper.text()).toContain("No hay listas actuales"));
  });

  it("reloads only the monthly historical year filter", async () => {
    const wrapper = mountView();
    await flushPromises();
    await wrapper.get("select").setValue("2025");
    await flushPromises();
    expect(getPastMonthlyLists).toHaveBeenLastCalledWith(2025, expect.any(AbortSignal));
    expect(getPastMonthlyLists).toHaveBeenCalledTimes(2);
    expect(wrapper.findAll("select")).toHaveLength(1);
  });

  it("does not show another year while the selected monthly year is loading", async () => {
    let resolveNewYear!: (lists: ListSummary[]) => void;
    getPastMonthlyLists.mockResolvedValueOnce([
      { id: "old-period", name: "Mejores de 2026", type: "month", listDate: "2026-10-01" },
    ]);
    getPastMonthlyLists.mockReturnValueOnce(
      new Promise((done) => {
        resolveNewYear = done;
      })
    );
    const wrapper = mountView();
    await vi.waitFor(() => expect(wrapper.text()).toContain("Mejores de 2026"));

    await wrapper.get("select").setValue("2025");
    await flushPromises();
    expect(wrapper.text()).toContain("Cargando listas…");
    expect(wrapper.text()).not.toContain("Mejores de 2026");

    resolveNewYear([
      { id: "new-period", name: "Mejores de 2025", type: "month", listDate: "2025-10-01" },
    ]);
    await vi.waitFor(() => expect(wrapper.text()).toContain("Mejores de 2025"));
  });

  it("does not render the empty state on error and retries", async () => {
    getCurrentMonthlyLists.mockRejectedValue(new Error("offline"));
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain("Reintentando consulta…");
    await vi.waitFor(() => expect(wrapper.text()).toContain("No se pudieron cargar las listas."), {
      timeout: 3000,
    });
    expect(wrapper.text()).toContain("No se pudieron cargar las listas.");
    expect(wrapper.text()).not.toContain("No hay listas actuales");
    getCurrentMonthlyLists.mockResolvedValueOnce([currentMonthlyList]);
    await wrapper.get("button").trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("Mejores de noviembre");
    expect(getCurrentMonthlyLists).toHaveBeenCalledTimes(3);
  });

  it("navigates to the selected monthly list detail", async () => {
    const wrapper = mountView();
    await flushPromises();
    const card = wrapper
      .findAll(".cursor-pointer")
      .find((element) => element.text().includes("Mejores de noviembre"));
    expect(card).toBeDefined();
    await card!.trigger("click");
    expect(push).toHaveBeenCalledWith("/discos/mejores/best-1");
  });
});
