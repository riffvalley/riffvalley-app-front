// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import CreateList from "../../src/views/list/CreateList.vue";
import { listCreationKey } from "../../src/modules/editorial/lists/presentation/listCreationKey";
import type { ListCreationPort } from "../../src/modules/editorial/lists/application/listCreationPort";

const { createList, success, error, push } = vi.hoisted(() => ({
  createList: vi.fn(), success: vi.fn(), error: vi.fn(), push: vi.fn(),
}));

vi.mock("vue-router", () => ({ useRouter: () => ({ push }) }));
vi.mock("@services/swal/SwalService", () => ({ default: { success, error } }));

const listCreationPort: ListCreationPort = { createList };

function mountCreateList() {
  return mount(CreateList, {
    global: { provide: { [listCreationKey as symbol]: listCreationPort } },
  });
}

afterEach(() => vi.clearAllMocks());

describe("CreateList Editorial flow", () => {
  it("keeps required fields and submits a weekly list with the existing date and status values", async () => {
    createList.mockResolvedValue({ id: "list-1" });
    const view = mountCreateList();
    expect(view.get("#name").attributes("required")).toBeDefined();
    expect(view.get("#type").attributes("required")).toBeDefined();

    await view.get("#name").setValue("Lista semanal");
    await view.get("#type").setValue("week");
    await view.get("#specialDate").setValue("2026-10-02");
    await view.get("#releaseDate").setValue("2026-10-09");
    await view.get("form").trigger("submit");
    await flushPromises();

    expect(createList).toHaveBeenCalledWith({
      name: "Lista semanal", type: "week", listDate: "2026-10-02T00:00:00.000Z",
      releaseDate: "2026-10-09T00:00:00.000Z", status: "new",
    });
    expect(success).toHaveBeenCalledWith("Lista creada correctamente");
    expect(push).toHaveBeenCalledWith({ name: "ListDefault" });
    view.unmount();
  });

  it("submits an empty monthly date as null", async () => {
    createList.mockResolvedValue(undefined);
    const view = mountCreateList();
    await view.get("#name").setValue("Lista mensual");
    await view.get("#type").setValue("month");
    await view.get("form").trigger("submit");
    await flushPromises();

    expect(createList).toHaveBeenCalledWith({
      name: "Lista mensual", type: "month", listDate: null, releaseDate: null, status: "new",
    });
    view.unmount();
  });

  it("preserves the current error message and does not navigate after a failed create", async () => {
    createList.mockRejectedValue(new Error("offline"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const view = mountCreateList();
    await view.get("#name").setValue("Lista semanal");
    await view.get("#type").setValue("week");
    await view.get("form").trigger("submit");
    await flushPromises();

    expect(error).toHaveBeenCalledWith("No se pudo crear la lista. Por favor, inténtalo de nuevo.");
    expect(push).not.toHaveBeenCalled();
    log.mockRestore();
    view.unmount();
  });
});
