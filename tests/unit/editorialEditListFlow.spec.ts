// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, shallowMount } from "@vue/test-utils";
import EditList from "../../src/views/list/EditList.vue";
import { listDetailsKey } from "../../src/modules/editorial/presentation/listDetailsKey";
import type { ListDetailsPort } from "../../src/modules/editorial/application/listDetailsPort";

const { getListDetails, updateList, loadAsignations, loadRvUsers, success, error, push } = vi.hoisted(() => ({
  getListDetails: vi.fn(),
  updateList: vi.fn(),
  loadAsignations: vi.fn(),
  loadRvUsers: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  push: vi.fn(),
}));

vi.mock("vue-router", () => ({ useRouter: () => ({ push }) }));
vi.mock("@stores/asignation/asignation", () => ({ useAsignationStore: () => ({ loadAsignations }) }));
vi.mock("@stores/user/users", () => ({ useUserStore: () => ({ loadRvUsers }) }));
vi.mock("@services/swal/SwalService", () => ({ default: { success, error } }));

const detailsPort: ListDetailsPort = { getListDetails, updateList };

function mountEditList() {
  return shallowMount(EditList, {
    props: { id: "list-1" },
    global: {
      provide: { [listDetailsKey as symbol]: detailsPort },
      stubs: {
        AsignationList: { props: ["type", "listId"], template: "<div />" },
        SpecialAsignationList: { props: ["listId", "asignations"], template: "<div />" },
        DiscsByDate: { props: ["date", "type", "listId"], template: "<div />" },
      },
    },
  });
}

afterEach(() => vi.clearAllMocks());

describe("EditList Editorial flow", () => {
  it("loads the list and saves the same editable payload", async () => {
    getListDetails.mockResolvedValue({
      id: "list-1", name: "Lista semanal", type: "week", status: "new",
      listDate: "2026-10-02", releaseDate: "", asignations: [],
    });
    updateList.mockResolvedValue({ updated: true });
    const view = mountEditList();
    await flushPromises();

    expect(getListDetails).toHaveBeenCalledWith("list-1");
    expect(view.get("#name").element.value).toBe("Lista semanal");
    await view.get("form").trigger("submit");
    await flushPromises();

    expect(updateList).toHaveBeenCalledWith("list-1", {
      name: "Lista semanal", type: "week", listDate: "2026-10-02",
      releaseDate: null, status: "new",
    });
    expect(success).toHaveBeenCalledWith("Lista actualizada");
    view.unmount();
  });

  it("preserves the load error message and exits the loading state", async () => {
    getListDetails.mockRejectedValue(new Error("offline"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const view = mountEditList();
    await flushPromises();

    expect(error).toHaveBeenCalledWith("No se pudieron cargar los detalles de la lista");
    expect(view.text()).toContain("Info de la Lista");
    log.mockRestore();
    view.unmount();
  });

  it("preserves the update error message", async () => {
    getListDetails.mockResolvedValue({
      id: "list-1", name: "Lista especial", type: "special", specialType: "web", status: "new",
    });
    updateList.mockRejectedValue(new Error("offline"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const view = mountEditList();
    await flushPromises();
    await view.get("form").trigger("submit");
    await flushPromises();

    expect(updateList).toHaveBeenCalledWith("list-1", {
      name: "Lista especial", type: "special", listDate: null,
      releaseDate: null, status: "new", specialType: "web",
    });
    expect(error).toHaveBeenCalledWith("No se pudo actualizar la lista");
    log.mockRestore();
    view.unmount();
  });
});
