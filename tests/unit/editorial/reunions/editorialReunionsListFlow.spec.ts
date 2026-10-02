// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, shallowMount } from "@vue/test-utils";
import ListReunion from "../../../../src/views/reunions/ListReunion.vue";
import ReunionTable from "../../../../src/views/reunions/components/ReunionTable.vue";
import { reunionsKey } from "../../../../src/modules/editorial/reunions/presentation/reunionsKey";
import type { ReunionsPort } from "../../../../src/modules/editorial/reunions/application/reunionsPort";

const {
  getReunions, getReunionDetails, updateReunionPoint, createReunionPoint,
  deleteReunionPoint, deleteReunion, confirm, success, error, getRvUsers,
} = vi.hoisted(() => ({
  getReunions: vi.fn(),
  getReunionDetails: vi.fn(),
  updateReunionPoint: vi.fn(),
  createReunionPoint: vi.fn(),
  deleteReunionPoint: vi.fn(),
  deleteReunion: vi.fn(),
  confirm: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  getRvUsers: vi.fn(),
}));

vi.mock("@services/users/users", () => ({ getRvUsers }));
vi.mock("@services/contents/contents", () => ({ createContent: vi.fn() }));
vi.mock("@services/swal/SwalService", () => ({ default: { confirm, success, error } }));

const reunionsPort: ReunionsPort = {
  getReunions,
  getReunionDetails,
  updateReunion: vi.fn(),
  deleteReunion,
  createReunionPoint,
  updateReunionPoint,
  deleteReunionPoint,
};

const reunion = {
  id: "meeting-1", title: "Asamblea", date: "2026-10-02T18:00:00.000Z",
  points: [{ id: "point-1", titulo: "Acta", content: "Texto", done: false }],
  createdAt: "created", updatedAt: "updated",
};

afterEach(() => vi.clearAllMocks());
beforeEach(() => { reunion.points[0].done = false; });

function provideReunions() {
  return { [reunionsKey as symbol]: reunionsPort };
}

describe("Editorial meeting list and points flow", () => {
  it("loads the meeting list through the composed port", async () => {
    getReunions.mockResolvedValue([reunion]);
    getRvUsers.mockResolvedValue([]);
    const view = shallowMount(ListReunion, { global: { provide: provideReunions() } });
    await flushPromises();

    expect(getReunions).toHaveBeenCalledOnce();
    expect(view.vm.reuniones).toEqual([reunion]);
    view.unmount();
  });

  it("preserves the list load error message", async () => {
    getReunions.mockRejectedValue(new Error("offline"));
    getRvUsers.mockResolvedValue([]);
    const view = shallowMount(ListReunion, { global: { provide: provideReunions() } });
    await flushPromises();

    expect(error).toHaveBeenCalledWith("No se pudieron obtener las reuniones.");
    view.unmount();
  });

  it("routes table point updates, creation, reload and deletion through the port", async () => {
    getReunionDetails.mockResolvedValue(reunion);
    createReunionPoint.mockResolvedValue(reunion.points[0]);
    updateReunionPoint.mockResolvedValue(undefined);
    deleteReunionPoint.mockResolvedValue(undefined);
    confirm.mockResolvedValue({ isConfirmed: true });
    const view = shallowMount(ReunionTable, {
      props: { title: "Actuales", reuniones: [reunion] },
      global: { provide: provideReunions() },
    });

    await view.vm.togglePointDone("meeting-1", reunion.points[0]);
    expect(updateReunionPoint).toHaveBeenCalledWith("point-1", { done: true });
    expect(reunion.points[0].done).toBe(true);

    view.vm.openAddPointModal("meeting-1");
    view.vm.pointForm = { titulo: "Acuerdos", content: "Notas", done: false };
    await view.vm.savePoint();
    expect(createReunionPoint).toHaveBeenCalledWith({
      titulo: "Acuerdos", content: "Notas", reunionId: "meeting-1",
    });
    expect(getReunionDetails).toHaveBeenCalledWith("meeting-1");

    await view.vm.confirmDeletePoint("meeting-1", reunion.points[0]);
    expect(deleteReunionPoint).toHaveBeenCalledWith("point-1");
    expect(getReunionDetails).toHaveBeenCalledTimes(2);
    view.unmount();
  });

  it("preserves update errors and routes meeting deletion through the port", async () => {
    updateReunionPoint.mockRejectedValue(new Error("offline"));
    confirm.mockResolvedValue({ isConfirmed: true });
    deleteReunion.mockResolvedValue(undefined);
    const view = shallowMount(ReunionTable, {
      props: { title: "Actuales", reuniones: [reunion] },
      global: { provide: provideReunions() },
    });

    await view.vm.togglePointDone("meeting-1", reunion.points[0]);
    expect(error).toHaveBeenCalledWith("No se pudo actualizar el estado");
    expect(reunion.points[0].done).toBe(false);
    await view.vm.confirmDeleteReunion(reunion);
    expect(deleteReunion).toHaveBeenCalledWith("meeting-1");
    view.unmount();
  });
});
