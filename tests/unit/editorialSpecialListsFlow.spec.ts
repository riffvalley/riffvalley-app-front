// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, shallowMount } from "@vue/test-utils";
import ListsList from "../../src/views/list/ListsList.vue";
import { specialListsKey } from "../../src/modules/editorial/lists/presentation/specialListsKey";
import type { SpecialListsPort } from "../../src/modules/editorial/lists/application/specialListsPort";

const { getSpecialLists, createSpecialList, deleteSpecialList, confirm, success, error, push } = vi.hoisted(() => ({
  getSpecialLists: vi.fn(),
  createSpecialList: vi.fn(),
  deleteSpecialList: vi.fn(),
  confirm: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  push: vi.fn(),
}));

vi.mock("vue-router", () => ({ useRouter: () => ({ push }) }));
vi.mock("@services/swal/SwalService", () => ({ default: { confirm, success, error } }));

const specialListsPort: SpecialListsPort = { getSpecialLists, createSpecialList, deleteSpecialList };

function mountLists() {
  return shallowMount(ListsList, {
    global: { provide: { [specialListsKey as symbol]: specialListsPort } },
  });
}

afterEach(() => vi.clearAllMocks());

describe("ListsList Editorial special lists flow", () => {
  it("loads and displays the special lists returned by Editorial", async () => {
    getSpecialLists.mockResolvedValue([{ id: "list-1", name: "Favoritas", specialType: "web" }]);
    const view = mountLists();
    await flushPromises();

    expect(getSpecialLists).toHaveBeenCalledOnce();
    expect(view.text()).toContain("Favoritas");
    expect(view.text()).toContain("web");
    view.unmount();
  });

  it("creates with the existing payload, shows success and refreshes the list", async () => {
    getSpecialLists.mockResolvedValue([]);
    createSpecialList.mockResolvedValue(undefined);
    const view = mountLists();
    await flushPromises();
    await view.findAll("button")[0].trigger("click");
    await view.find("input").setValue("Selección web");
    await view.find("select").setValue("web");
    await view.findAll("button").find((button) => button.text().includes("Crear Lista"))!.trigger("click");
    await flushPromises();

    expect(createSpecialList).toHaveBeenCalledWith({
      name: "Selección web", type: "special", specialType: "web",
    });
    expect(success).toHaveBeenCalledWith("Lista creada correctamente");
    expect(getSpecialLists).toHaveBeenCalledTimes(2);
    view.unmount();
  });

  it("preserves the delete confirmation and does not delete when canceled", async () => {
    getSpecialLists.mockResolvedValue([{ id: "list-1", name: "Favoritas", specialType: "web" }]);
    confirm.mockResolvedValue({ isConfirmed: false });
    const view = mountLists();
    await flushPromises();
    await view.find('button[title="Eliminar"]').trigger("click");
    await flushPromises();

    expect(confirm).toHaveBeenCalledWith(
      "¿Estás seguro?",
      "Esta acción no se puede deshacer. Se eliminará la lista y sus asignaciones."
    );
    expect(deleteSpecialList).not.toHaveBeenCalled();
    view.unmount();
  });

  it("deletes after confirmation, shows success and refreshes the list", async () => {
    getSpecialLists.mockResolvedValue([{ id: "list-1", name: "Favoritas", specialType: "web" }]);
    confirm.mockResolvedValue({ isConfirmed: true });
    deleteSpecialList.mockResolvedValue(undefined);
    const view = mountLists();
    await flushPromises();
    await view.find('button[title="Eliminar"]').trigger("click");
    await flushPromises();

    expect(deleteSpecialList).toHaveBeenCalledWith("list-1");
    expect(success).toHaveBeenCalledWith("Lista eliminada");
    expect(getSpecialLists).toHaveBeenCalledTimes(2);
    view.unmount();
  });

  it("preserves the load, create and delete error messages", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    getSpecialLists.mockRejectedValueOnce(new Error("load"));
    const view = mountLists();
    await flushPromises();
    expect(error).toHaveBeenCalledWith("Error al cargar las listas");

    await view.findAll("button")[0].trigger("click");
    await view.find("input").setValue("Nueva lista");
    await view.find("select").setValue("web");
    createSpecialList.mockRejectedValueOnce(new Error("create"));
    await view.findAll("button").find((button) => button.text().includes("Crear Lista"))!.trigger("click");
    await flushPromises();
    expect(error).toHaveBeenCalledWith("No se pudo crear la lista");

    confirm.mockResolvedValue({ isConfirmed: true });
    deleteSpecialList.mockRejectedValueOnce(new Error("delete"));
    await (view.vm as unknown as { deleteItem(id: string): Promise<void> }).deleteItem("list-2");
    await flushPromises();
    expect(error).toHaveBeenCalledWith("No se pudo eliminar la lista");
    log.mockRestore();
    view.unmount();
  });
});
