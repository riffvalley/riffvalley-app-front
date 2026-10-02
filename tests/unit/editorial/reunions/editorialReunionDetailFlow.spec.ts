// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import EditReunion from "../../../../src/views/reunions/EditReunion.vue";
import { reunionsKey } from "../../../../src/modules/editorial/reunions/presentation/reunionsKey";
import type { ReunionsPort } from "../../../../src/modules/editorial/reunions/application/reunionsPort";

const { getReunionDetails, updateReunion, deleteReunion, createReunionPoint,
  updateReunionPoint, deleteReunionPoint, success, error } = vi.hoisted(() => ({
  getReunionDetails: vi.fn(),
  updateReunion: vi.fn(),
  deleteReunion: vi.fn(),
  createReunionPoint: vi.fn(),
  updateReunionPoint: vi.fn(),
  deleteReunionPoint: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@services/swal/SwalService", () => ({ default: { success, error } }));

const reunionsPort: ReunionsPort = {
  getReunions: vi.fn(),
  getReunionDetails,
  updateReunion,
  deleteReunion,
  createReunionPoint,
  updateReunionPoint,
  deleteReunionPoint,
};

const meeting = (points = [{
  id: "point-1", titulo: "Acta", content: "Primera línea\nSegunda línea", done: false,
}]) => ({
  id: "meeting-1", title: "Asamblea", date: "2026-10-02T18:30:00.000Z", points,
  createdAt: "created", updatedAt: "updated",
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

function mountDetail() {
  return mount(EditReunion, {
    props: { id: "meeting-1" },
    global: { provide: { [reunionsKey as symbol]: reunionsPort } },
  });
}

describe("Editorial meeting detail flow", () => {
  it("loads the meeting resource and preserves date and point presentation", async () => {
    getReunionDetails.mockResolvedValue(meeting());
    const view = mountDetail();
    await flushPromises();

    expect(getReunionDetails).toHaveBeenCalledWith("meeting-1");
    expect(view.get("h1").text()).toBe("Asamblea");
    view.vm.toggleEditReunionForm();
    await view.vm.$nextTick();
    expect((view.get("#date-reunion").element as HTMLInputElement).value).toBe("2026-10-02T18:30");
    expect(view.vm.points).toEqual([{ ...meeting().points[0], showContent: false }]);
    expect(view.vm.formatContent("Primera línea\nSegunda línea")).toBe("Primera línea<br>Segunda línea");
    view.unmount();
  });

  it("preserves the empty-points state", async () => {
    getReunionDetails.mockResolvedValue(meeting([]));
    const view = mountDetail();
    await flushPromises();

    expect(view.text()).toContain("No hay puntos en esta reunión");
    expect(view.vm.points).toEqual([]);
    view.unmount();
  });

  it("preserves the load error message", async () => {
    getReunionDetails.mockRejectedValue(new Error("offline"));
    const view = mountDetail();
    await flushPromises();

    expect(error).toHaveBeenCalledWith("No se pudo cargar la reunión.");
    view.unmount();
  });

  it("routes existing detail mutations through the Editorial port", async () => {
    getReunionDetails.mockResolvedValue(meeting());
    updateReunion.mockResolvedValue(undefined);
    createReunionPoint.mockResolvedValue({ id: "point-2", titulo: "Acuerdos", content: "Notas", done: false });
    updateReunionPoint.mockResolvedValue(undefined);
    deleteReunionPoint.mockResolvedValue(undefined);
    vi.stubGlobal("confirm", vi.fn(() => true));
    const view = mountDetail();
    await flushPromises();

    view.vm.reunion.title = "Asamblea actualizada";
    view.vm.reunion.date = "2026-10-03T19:00";
    await view.vm.updateReunionFunction();
    expect(updateReunion).toHaveBeenCalledWith("meeting-1", {
      title: "Asamblea actualizada", date: "2026-10-03T19:00",
    });
    expect(success).toHaveBeenCalledWith("Reunión actualizada con éxito.");

    view.vm.newPoint = { titulo: "Acuerdos", content: "Notas" };
    await view.vm.addPoint();
    expect(createReunionPoint).toHaveBeenCalledWith({
      titulo: "Acuerdos", content: "Notas", reunionId: "meeting-1",
    });
    view.vm.editPointData = { titulo: "Acta actualizada", content: "Contenido" };
    await view.vm.updatePointReunion("point-1", 0);
    expect(updateReunionPoint).toHaveBeenCalledWith("point-1", {
      titulo: "Acta actualizada", content: "Contenido",
    });
    await view.vm.togglePointDone("point-1", true);
    expect(updateReunionPoint).toHaveBeenLastCalledWith("point-1", { done: true });
    await view.vm.deletePoint("point-1");
    expect(deleteReunionPoint).toHaveBeenCalledWith("point-1");
    view.unmount();
  });

  it("preserves update errors", async () => {
    getReunionDetails.mockResolvedValue(meeting());
    updateReunion.mockRejectedValue(new Error("offline"));
    const view = mountDetail();
    await flushPromises();
    await view.vm.updateReunionFunction();

    expect(error).toHaveBeenCalledWith("No se pudo actualizar la reunión.");
    view.unmount();
  });
});
