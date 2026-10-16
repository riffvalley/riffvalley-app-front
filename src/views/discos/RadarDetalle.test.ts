// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RadarDetalle from "./RadarDetalle.vue";
import { getListDetails, updateList } from "@services/list/list";
import SwalService from "@services/swal/SwalService";

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
  listDate: "2026-10-12",
  closeDate: "2026-10-15",
  wpWeeklyPosts: [],
};

describe("RadarDetalle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getListDetails).mockResolvedValue({ ...radar });
    vi.mocked(updateList).mockResolvedValue({});
  });

  it("no presenta un control para editar la descripción de List", async () => {
    const wrapper = mount(RadarDetalle, {
      global: { stubs: { AsignationList: true, DiscsByDate: true } },
    });
    await flushPromises();

    expect(wrapper.find('input[placeholder="Añade una descripción..."]').exists()).toBe(false);
    expect(wrapper.findAll("input")).toHaveLength(3);
    expect(wrapper.findComponent({ name: "AsignationList" }).exists()).toBe(true);

    wrapper.unmount();
  });

  it("mantiene los PATCH de nombre, estado y fechas sin enviar description", async () => {
    const wrapper = mount(RadarDetalle, {
      global: { stubs: { AsignationList: true, DiscsByDate: true } },
    });
    await flushPromises();

    const name = wrapper.get('input[placeholder="Nombre de la lista"]');
    await name.setValue("Radar actualizado");
    await flushPromises();

    await wrapper.get("select").setValue("assigned");
    await flushPromises();

    const dates = wrapper.findAll('input[type="date"]');
    await dates[0].setValue("2026-10-13");
    await flushPromises();
    await dates[1].setValue("2026-10-16");
    await flushPromises();

    expect(updateList).toHaveBeenNthCalledWith(1, "radar-1", { name: "Radar actualizado" });
    expect(updateList).toHaveBeenNthCalledWith(2, "radar-1", { status: "assigned" });
    expect(updateList).toHaveBeenNthCalledWith(3, "radar-1", { listDate: "2026-10-13" });
    expect(updateList).toHaveBeenNthCalledWith(4, "radar-1", { closeDate: "2026-10-16" });
    for (const [, payload] of vi.mocked(updateList).mock.calls) {
      expect(payload).not.toHaveProperty("description");
    }

    wrapper.unmount();
  });

  it("sigue mostrando un error cuando falla el guardado", async () => {
    vi.mocked(updateList).mockRejectedValueOnce(new Error("Request failed"));
    const wrapper = mount(RadarDetalle, {
      global: { stubs: { AsignationList: true, DiscsByDate: true } },
    });
    await flushPromises();

    const name = wrapper.get('input[placeholder="Nombre de la lista"]');
    await name.setValue("Radar actualizado");
    await flushPromises();

    expect(updateList).toHaveBeenCalledWith("radar-1", { name: "Radar actualizado" });
    expect(SwalService.error).toHaveBeenCalledWith("No se pudo guardar el cambio");

    wrapper.unmount();
  });
});
