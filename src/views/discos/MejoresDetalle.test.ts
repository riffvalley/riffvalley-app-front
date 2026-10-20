// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MejoresDetalle from "./MejoresDetalle.vue";
import { getListDetails, updateList } from "@services/list/list";
import SwalService from "@services/swal/SwalService";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("vue-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("vue-router")>();
  return {
    ...actual,
    useRoute: () => ({ params: { id: "best-1" } }),
    useRouter: () => ({ push }),
  };
});

vi.mock("@services/list/list", () => ({
  getListDetails: vi.fn(),
  updateList: vi.fn(),
  generateBestDiscsWpPost: vi.fn(),
}));

vi.mock("@services/swal/SwalService", () => ({
  default: { error: vi.fn(), success: vi.fn(), confirm: vi.fn() },
}));

vi.mock("sweetalert2", () => ({ default: { fire: vi.fn() } }));

vi.mock("@stores/asignation/asignation", () => ({
  useAsignationStore: () => ({ asignations: [], loadAsignations: vi.fn() }),
}));

vi.mock("@stores/user/users", () => ({
  useUserStore: () => ({ loadRvUsers: vi.fn() }),
}));

const bestList = {
  id: "best-1",
  name: "Mejores del mes",
  type: "month",
  status: "new",
  releaseDate: "2026-10-01T00:00:00.000Z",
  listDate: "2026-10-01T00:00:00.000Z",
  closeDate: null,
};

describe("MejoresDetalle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getListDetails).mockResolvedValue({ ...bestList });
    vi.mocked(updateList).mockResolvedValue({});
  });

  it("muestra la fecha editorial obligatoria y conserva la fecha opcional de la lista", async () => {
    const wrapper = mount(MejoresDetalle, {
      global: { stubs: { DiscsByDate: true, MejoresAsignationList: true, MisVotosMes: true } },
    });
    await flushPromises();

    expect(wrapper.get('input[aria-label="Fecha de publicación obligatoria"]').element.value).toBe("2026-10-01");
    expect(wrapper.get('input[aria-label="Fecha de lista (opcional)"]').element.value).toBe("2026-10-01");
    expect(wrapper.findAll('input[type="date"]')).toHaveLength(2);

    wrapper.unmount();
  });

  it("envía el releaseDate válido y null solo al vaciar la fecha opcional", async () => {
    const wrapper = mount(MejoresDetalle, {
      global: { stubs: { DiscsByDate: true, MejoresAsignationList: true, MisVotosMes: true } },
    });
    await flushPromises();

    await wrapper.get('input[aria-label="Fecha de publicación obligatoria"]').setValue("2026-10-03");
    await flushPromises();
    expect(updateList).toHaveBeenNthCalledWith(1, "best-1", { releaseDate: "2026-10-03" });

    const optionalDate = wrapper.get('input[aria-label="Fecha de lista (opcional)"]');
    optionalDate.element.value = "";
    await optionalDate.trigger("change");
    await flushPromises();
    expect(updateList).toHaveBeenNthCalledWith(2, "best-1", { listDate: null });

    wrapper.unmount();
  });

  it("bloquea fecha editorial vacía o inválida, muestra validación y restaura el valor anterior", async () => {
    const wrapper = mount(MejoresDetalle, {
      global: { stubs: { DiscsByDate: true, MejoresAsignationList: true, MisVotosMes: true } },
    });
    await flushPromises();

    const input = wrapper.get('input[aria-label="Fecha de publicación obligatoria"]');
    input.element.value = "";
    await input.trigger("change");
    expect(updateList).not.toHaveBeenCalled();
    expect(SwalService.error).toHaveBeenCalledWith("La fecha de publicación es obligatoria.");
    expect((input.element as HTMLInputElement).value).toBe("2026-10-01");

    Object.defineProperty(input.element, "validity", {
      configurable: true,
      value: { badInput: true },
    });
    input.element.value = "";
    await input.trigger("change");
    expect(updateList).not.toHaveBeenCalled();
    expect(SwalService.error).toHaveBeenLastCalledWith("La fecha de publicación no es válida.");
    expect((input.element as HTMLInputElement).value).toBe("2026-10-01");

    wrapper.unmount();
  });

  it("no envía una fecha editorial sin cambios y restaura el valor tras un error de guardado", async () => {
    const wrapper = mount(MejoresDetalle, {
      global: { stubs: { DiscsByDate: true, MejoresAsignationList: true, MisVotosMes: true } },
    });
    await flushPromises();

    const input = wrapper.get('input[aria-label="Fecha de publicación obligatoria"]');
    await input.trigger("change");
    expect(updateList).not.toHaveBeenCalled();

    vi.mocked(updateList).mockRejectedValueOnce(new Error("Request failed"));
    await input.setValue("2026-10-04");
    await flushPromises();

    expect(updateList).toHaveBeenCalledWith("best-1", { releaseDate: "2026-10-04" });
    expect(SwalService.error).toHaveBeenCalledWith("No se pudo guardar el cambio");
    expect((input.element as HTMLInputElement).value).toBe("2026-10-01");

    wrapper.unmount();
  });
});
