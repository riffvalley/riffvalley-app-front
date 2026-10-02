// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import ReunionEditModal from "../../src/views/reunions/components/ReunionEditModal.vue";
import { reunionsKey } from "../../src/modules/editorial/presentation/reunionsKey";
import type { ReunionsPort } from "../../src/modules/editorial/application/reunionsPort";

const { getReunionDetails, updateReunion, deleteReunion, createReunionPoint,
  updateReunionPoint, deleteReunionPoint, confirm, success, error } = vi.hoisted(() => ({
  getReunionDetails: vi.fn(),
  updateReunion: vi.fn(),
  deleteReunion: vi.fn(),
  createReunionPoint: vi.fn(),
  updateReunionPoint: vi.fn(),
  deleteReunionPoint: vi.fn(),
  confirm: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@services/swal/SwalService", () => ({ default: { confirm, success, error } }));

const reunionsPort: ReunionsPort = {
  getReunions: vi.fn(),
  getReunionDetails,
  updateReunion,
  deleteReunion,
  createReunionPoint,
  updateReunionPoint,
  deleteReunionPoint,
};

const meeting = () => ({
  id: "meeting-1", title: "Asamblea", date: "2026-10-02T18:30:00.000Z",
  points: [{ id: "point-1", titulo: "Acta", content: "Primera línea\nSegunda línea", done: false }],
  createdAt: "created", updatedAt: "updated",
});

afterEach(() => vi.clearAllMocks());

function mountModal(show = true) {
  return mount(ReunionEditModal, {
    props: { show, reunionId: "meeting-1" },
    global: { provide: { [reunionsKey as symbol]: reunionsPort } },
  });
}

describe("ReunionEditModal Editorial flow", () => {
  it("loads the reunion and points from the provided meeting resource", async () => {
    getReunionDetails.mockResolvedValue(meeting());
    const view = mountModal();
    await flushPromises();

    expect(getReunionDetails).toHaveBeenCalledWith("meeting-1");
    expect(view.get("h1").text()).toBe("Asamblea");
    view.vm.toggleEditReunionForm();
    await view.vm.$nextTick();
    expect((view.get("#title-reunion").element as HTMLInputElement).value).toBe("Asamblea");
    expect((view.get("#date-reunion").element as HTMLInputElement).value).toBe("2026-10-02T18:30");
    expect(view.vm.points).toEqual([{ ...meeting().points[0], showContent: false }]);
    expect(view.find("#new-titulo").exists()).toBe(false);
    view.unmount();
  });

  it("retains required fields and does not submit before user input", async () => {
    getReunionDetails.mockResolvedValue(meeting());
    const view = mountModal();
    await flushPromises();
    view.vm.toggleEditReunionForm();
    await view.vm.$nextTick();

    const titleInput = view.get("#title-reunion").element as HTMLInputElement;
    const dateInput = view.get("#date-reunion").element as HTMLInputElement;
    titleInput.value = "";
    expect(titleInput.required).toBe(true);
    expect(dateInput.required).toBe(true);
    expect((view.get("form").element as HTMLFormElement).checkValidity()).toBe(false);
    expect(updateReunion).not.toHaveBeenCalled();
    view.unmount();
  });

  it("saves the same editable title/date fields and emits the existing events", async () => {
    getReunionDetails.mockResolvedValue(meeting());
    updateReunion.mockResolvedValue(undefined);
    const view = mountModal();
    await flushPromises();
    view.vm.toggleEditReunionForm();
    view.vm.reunion.title = "Asamblea actualizada";
    view.vm.reunion.date = "2026-10-03T19:00";

    await view.vm.updateReunionFunction();

    expect(updateReunion).toHaveBeenCalledWith("meeting-1", {
      title: "Asamblea actualizada", date: "2026-10-03T19:00",
    });
    expect(success).toHaveBeenCalledWith("Reunión actualizada con éxito.");
    expect(view.vm.showEditReunionForm).toBe(false);
    expect(view.emitted("updated")).toHaveLength(1);
    view.unmount();
  });

  it("preserves load and update error messages", async () => {
    getReunionDetails.mockRejectedValueOnce(new Error("load failed"));
    const loadView = mountModal();
    await flushPromises();
    expect(error).toHaveBeenCalledWith("No se pudo cargar la reunión.");
    loadView.unmount();

    getReunionDetails.mockResolvedValueOnce(meeting());
    updateReunion.mockRejectedValueOnce(new Error("save failed"));
    const updateView = mountModal();
    await flushPromises();
    await updateView.vm.updateReunionFunction();
    expect(error).toHaveBeenCalledWith("No se pudo actualizar la reunión.");
    expect(updateView.emitted("updated")).toBeUndefined();
    updateView.unmount();
  });

  it("routes point operations through Editorial while preserving HTML formatting", async () => {
    getReunionDetails.mockResolvedValue(meeting());
    const createdPoint = { id: "point-2", titulo: "Acuerdos", content: "Notas", done: false };
    createReunionPoint.mockResolvedValue(createdPoint);
    updateReunionPoint.mockResolvedValue(undefined);
    deleteReunionPoint.mockResolvedValue(undefined);
    const view = mountModal();
    await flushPromises();

    expect(view.vm.formatContent("Primera línea\nSegunda línea")).toBe("Primera línea<br>Segunda línea");
    view.vm.newPoint = { titulo: "Acuerdos", content: "Notas" };
    await view.vm.addPoint();
    expect(createReunionPoint).toHaveBeenCalledWith({
      titulo: "Acuerdos", content: "Notas", reunionId: "meeting-1",
    });
    expect(view.vm.points[1]).toEqual({ ...createdPoint, showContent: false });

    view.vm.editPointData = { titulo: "Acta corregida", content: "Texto" };
    await view.vm.updatePointReunion("point-1", 0);
    expect(updateReunionPoint).toHaveBeenCalledWith("point-1", {
      titulo: "Acta corregida", content: "Texto",
    });
    await view.vm.togglePointDone("point-1", true);
    expect(updateReunionPoint).toHaveBeenLastCalledWith("point-1", { done: true });

    view.vm.deletePointConfirm(view.vm.points[0]);
    await view.vm.confirmDelete();
    expect(deleteReunionPoint).toHaveBeenCalledWith("point-1");
    view.unmount();
  });
});
