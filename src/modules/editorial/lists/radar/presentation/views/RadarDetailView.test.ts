// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RadarDetailView from "./RadarDetailView.vue";
import { getListDetails, updateList } from "@services/list/list";
import SwalService from "@services/swal/SwalService";
import { useAuthStore } from "@/modules/identity/auth";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("vue-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("vue-router")>();
  return {
    ...actual,
    useRoute: () => ({ params: { id: "radar-1" } }),
    useRouter: () => ({ push }),
  };
});

vi.mock("@services/list/list", () => ({
  getListDetails: vi.fn(),
  updateList: vi.fn(),
  deleteList: vi.fn(),
}));

vi.mock("@services/swal/SwalService", () => ({
  default: { error: vi.fn(), success: vi.fn(), confirm: vi.fn() },
}));

vi.mock("@stores/asignation/asignation", () => ({
  useAsignationStore: () => ({ loadAsignations: vi.fn() }),
}));

vi.mock("@stores/user/users", () => ({
  useUserStore: () => ({ loadRvUsers: vi.fn() }),
}));

const radar = {
  id: "radar-1",
  name: "Radar semanal",
  description: "Obsoleto de List, ignorado por esta vista",
  type: "week",
  status: "new",
  releaseDate: "2026-10-09T00:00:00.000Z",
  listDate: "2026-10-12",
  closeDate: "2026-10-15",
  wpWeeklyPosts: [],
};

let pinia: ReturnType<typeof createPinia>;
let queryClient: QueryClient;

describe("RadarDetailView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pinia = createPinia();
    setActivePinia(pinia);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    useAuthStore().$patch({
      authStatus: "authenticated",
      isAuthenticated: true,
      userId: "editor-1",
      token: "token",
      role: "riffvalley",
      authSessionGeneration: 1,
    });
    vi.mocked(getListDetails).mockResolvedValue({ ...radar });
    vi.mocked(updateList).mockResolvedValue({});
  });

  it("no presenta un control para editar la descripción de List", async () => {
    const wrapper = mount(RadarDetailView, {
      global: {
        plugins: [pinia, [VueQueryPlugin, { queryClient }]],
        stubs: { RadarAssignments: true, RadarDiscCatalog: true },
      },
    });
    await flushPromises();

    expect(wrapper.find('input[placeholder="Añade una descripción..."]').exists()).toBe(false);
    expect(wrapper.findAll("input")).toHaveLength(7);
    expect(wrapper.find(".radar-mobile-dates").exists()).toBe(true);
    expect(wrapper.find(".radar-mobile-dates summary").text()).toContain("Fechas editoriales");
    expect(wrapper.findComponent({ name: "RadarAssignments" }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: "RadarAssignments" }).props("listId")).toBe("radar-1");
    expect(wrapper.findComponent({ name: "RadarDiscCatalog" }).props("listId")).toBe("radar-1");

    wrapper.unmount();
  });

  it("mantiene los PATCH de nombre, estado y fechas sin enviar description", async () => {
    const wrapper = mount(RadarDetailView, {
      global: {
        plugins: [pinia, [VueQueryPlugin, { queryClient }]],
        stubs: { RadarAssignments: true, RadarDiscCatalog: true },
      },
    });
    await flushPromises();

    const name = wrapper.get('input[placeholder="Nombre de la lista"]');
    await name.setValue("Radar actualizado");
    await flushPromises();

    await wrapper.get("select").setValue("assigned");
    await flushPromises();

    const dates = wrapper.findAll('.hidden input[type="date"]');
    await dates[0].setValue("2026-10-10");
    await flushPromises();
    await dates[1].setValue("2026-10-13");
    await flushPromises();
    await dates[2].setValue("2026-10-16");
    await flushPromises();

    expect(updateList).toHaveBeenNthCalledWith(1, "radar-1", { name: "Radar actualizado" });
    expect(updateList).toHaveBeenNthCalledWith(2, "radar-1", { status: "assigned" });
    expect(updateList).toHaveBeenNthCalledWith(3, "radar-1", { releaseDate: "2026-10-10" });
    expect(updateList).toHaveBeenNthCalledWith(4, "radar-1", { listDate: "2026-10-13" });
    expect(updateList).toHaveBeenNthCalledWith(5, "radar-1", { closeDate: "2026-10-16" });
    for (const [, payload] of vi.mocked(updateList).mock.calls) {
      expect(payload).not.toHaveProperty("description");
    }

    wrapper.unmount();
  });

  it("sigue mostrando un error cuando falla el guardado", async () => {
    vi.mocked(updateList).mockRejectedValueOnce(new Error("Request failed"));
    const wrapper = mount(RadarDetailView, {
      global: {
        plugins: [pinia, [VueQueryPlugin, { queryClient }]],
        stubs: { RadarAssignments: true, RadarDiscCatalog: true },
      },
    });
    await flushPromises();

    const name = wrapper.get('input[placeholder="Nombre de la lista"]');
    await name.setValue("Radar actualizado");
    await flushPromises();

    expect(updateList).toHaveBeenCalledWith("radar-1", { name: "Radar actualizado" });
    expect(SwalService.error).toHaveBeenCalledWith("No se pudo guardar el cambio");

    wrapper.unmount();
  });

  it("bloquea una fecha editorial vacía o inválida y conserva el valor anterior", async () => {
    const wrapper = mount(RadarDetailView, {
      global: {
        plugins: [pinia, [VueQueryPlugin, { queryClient }]],
        stubs: { RadarAssignments: true, RadarDiscCatalog: true },
      },
    });
    await flushPromises();

    const input = wrapper.findAll('input[aria-label="Fecha de publicación obligatoria"]')[0];
    input.element.value = "";
    await input.trigger("change");

    expect(updateList).not.toHaveBeenCalled();
    expect(SwalService.error).toHaveBeenCalledWith("La fecha de publicación es obligatoria.");
    expect((input.element as HTMLInputElement).value).toBe("2026-10-09");

    Object.defineProperty(input.element, "validity", {
      configurable: true,
      value: { badInput: true },
    });
    input.element.value = "2026-02-30";
    await input.trigger("change");

    expect(updateList).not.toHaveBeenCalled();
    expect(SwalService.error).toHaveBeenLastCalledWith("La fecha de publicación no es válida.");
    expect((input.element as HTMLInputElement).value).toBe("2026-10-09");

    wrapper.unmount();
  });

  it("no guarda una fecha editorial sin cambios y envía null al vaciar fechas opcionales", async () => {
    const wrapper = mount(RadarDetailView, {
      global: {
        plugins: [pinia, [VueQueryPlugin, { queryClient }]],
        stubs: { RadarAssignments: true, RadarDiscCatalog: true },
      },
    });
    await flushPromises();

    const releaseDate = wrapper.findAll('input[aria-label="Fecha de publicación obligatoria"]')[0];
    await releaseDate.trigger("change");
    expect(updateList).not.toHaveBeenCalled();

    const listDate = wrapper.findAll('input[aria-label="Fecha de lista"]')[0];
    listDate.element.value = "";
    await listDate.trigger("change");
    await flushPromises();
    expect(updateList).toHaveBeenCalledWith("radar-1", { listDate: null });

    const closeDate = wrapper.findAll('input[aria-label="Fecha de cierre"]')[0];
    closeDate.element.value = "";
    await closeDate.trigger("change");
    await flushPromises();
    expect(updateList).toHaveBeenCalledWith("radar-1", { closeDate: null });

    wrapper.unmount();
  });
});
