// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia } from "pinia";
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { nextTick, ref } from "vue";
import type { FeedbackEntry, FeedbackListResponse } from "../../types/feedback";

const sampleEntry = {
  id: "entry-1", title: "Bug title", description: "Details", type: "bug" as const,
  status: "in_progress" as const, priority: "medium" as const, rejectionReason: null,
  userId: "user-1", user: { id: "user-1", username: "Member" }, versionItemId: null,
  versionItem: null, createdAt: "2026-01-01", updatedAt: "2026-01-01",
};
const versionedEntry: FeedbackEntry = {
  ...sampleEntry,
  id: "entry-2",
  title: "Keyboard shortcuts",
  type: "suggestion",
  status: "done",
  userId: null,
  user: null,
  versionItemId: "version-item-1",
  versionItem: {
    id: "version-item-1",
    type: "feat",
    description: "Add keyboard shortcuts",
    state: "done",
  },
};
const emptyResponse: FeedbackListResponse = {
  data: [],
  counts: { in_progress: 0, done: 0, rejected: 0 },
};
const state = vi.hoisted(() => ({
  query: undefined as unknown as ReturnType<typeof makeQuery>,
  filters: [] as Array<{ value: string }>,
  versionEnabled: undefined as (() => boolean) | undefined,
  versionQuery: undefined as unknown as ReturnType<typeof makeVersionQuery>,
  create: vi.fn(), update: vi.fn(), reopen: vi.fn(), reject: vi.fn(), complete: vi.fn(), remove: vi.fn(),
  confirm: vi.fn(), success: vi.fn(), error: vi.fn(),
}));
function makeQuery() {
  return {
    data: ref<FeedbackListResponse | undefined>({
      data: [sampleEntry, versionedEntry],
      counts: { in_progress: 1, done: 1, rejected: 0 },
    }),
    isPending: ref(false),
    isError: ref(false),
    refetch: vi.fn(),
    queryKey: ref(["feedback", "admin", "admin-1", 1, "all", "in_progress"]),
  };
}
function makeVersionQuery() {
  return { data: ref([{ id: "version-item-1", type: "feat", description: "Item description" }]), isPending: ref(false), isError: ref(false), refetch: vi.fn() };
}
vi.mock("../../application/useFeedback", () => ({
  useAdminFeedbackQuery: (type: { value: string }, status: { value: string }) => {
    state.filters = [type, status];
    return state.query;
  },
  useCurrentFeedbackVersionItemsQuery: (enabled: () => boolean) => {
    state.versionEnabled = enabled;
    return state.versionQuery;
  },
  useFeedbackMutations: () => ({
    create: { mutateAsync: state.create, isPending: ref(false) },
    update: { mutateAsync: state.update, isPending: ref(false) },
    reopen: { mutateAsync: state.reopen, isPending: ref(false) },
    reject: { mutateAsync: state.reject, isPending: ref(false) },
    complete: { mutateAsync: state.complete, isPending: ref(false) },
    remove: { mutateAsync: state.remove, isPending: ref(false) },
  }),
}));
vi.mock("@services/swal/SwalService", () => ({ default: {
  confirm: state.confirm, success: state.success, error: state.error,
} }));

import FeedbackManagementView from "./FeedbackManagementView.vue";

describe("FeedbackManagementView", () => {
  let queryClient: QueryClient;
  beforeEach(() => {
    vi.clearAllMocks();
    state.query = makeQuery();
    state.versionQuery = makeVersionQuery();
    state.confirm.mockResolvedValue({ isConfirmed: true });
    state.create.mockResolvedValue({ id: "created" });
    state.update.mockResolvedValue({ ...sampleEntry, priority: "high" });
    state.reopen.mockResolvedValue({ ...sampleEntry, status: "in_progress" });
    state.reject.mockResolvedValue({ ...sampleEntry, status: "rejected" });
    state.complete.mockResolvedValue({ ...sampleEntry, status: "done" });
    state.remove.mockResolvedValue(undefined);
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  function mountPage() {
    queryClient.setQueryData(state.query.queryKey.value, state.query.data.value);
    return mount(FeedbackManagementView, { global: { plugins: [createPinia(), [VueQueryPlugin, { queryClient }]] } });
  }

  it("shows list errors separately from empty results and retries", async () => {
    state.query.data.value = emptyResponse;
    state.query.isError.value = true;
    const wrapper = mountPage();
    expect(wrapper.text()).toContain("No se pudieron cargar las entradas de soporte.");
    expect(wrapper.text()).not.toContain("No hay bugs en este estado.");
    await wrapper.findAll("button").find((button) => button.text().includes("Reintentar"))?.trigger("click");
    expect(state.query.refetch).toHaveBeenCalledOnce();
    state.query.isError.value = false;
    await nextTick();
    expect(wrapper.text()).toContain("No hay entradas en este estado.");
  });

  it("shows loading separately from empty results", () => {
    state.query.data.value = undefined;
    state.query.isPending.value = true;
    const wrapper = mountPage();
    expect(wrapper.text()).toContain("Cargando...");
    expect(wrapper.text()).not.toContain("No hay entradas en este estado.");
  });

  it("renders multiple entries, nullable users and linked version items without exceptions", () => {
    const wrapper = mountPage();
    expect(wrapper.findAll("li")).toHaveLength(2);
    expect(wrapper.text()).toContain("Member");
    expect(wrapper.text()).toContain("Keyboard shortcuts");
    expect(wrapper.text()).toContain("Add keyboard shortcuts");
  });

  it("shows backend counts across statuses while the list is filtered by status", () => {
    state.query.data.value = {
      data: [sampleEntry],
      counts: { in_progress: 4, done: 2, rejected: 3 },
    };
    const wrapper = mountPage();
    const statusButtons = wrapper.findAll("button");
    expect(
      statusButtons.find((button) => button.text().includes("Pendientes"))?.text()
    ).toContain("(4)");
    expect(statusButtons.find((button) => button.text().includes("Hechas"))?.text()).toContain(
      "(2)"
    );
    expect(
      statusButtons.find((button) => button.text().includes("Rechazadas"))?.text()
    ).toContain("(3)");
    expect(statusButtons.find((button) => button.text().includes("Todas ("))?.text()).toContain(
      "(9)"
    );
  });

  it("filters and cycles priority optimistically while preserving the failure message", async () => {
    const wrapper = mountPage();
    const bugs = wrapper.findAll("button").find((button) => button.text().includes("Bugs"));
    await bugs?.trigger("click");
    expect(state.filters[0].value).toBe("bug");
    const rejected = wrapper.findAll("button").find((button) => button.text().includes("Rechazadas"));
    await rejected?.trigger("click");
    expect(state.filters[1].value).toBe("rejected");

    const priority = wrapper.get('button[title="Click para cambiar prioridad"]');
    await priority.trigger("click");
    await flushPromises();
    expect(state.update).toHaveBeenCalledWith({ id: "entry-1", dto: { priority: "high" } });
    expect(state.success).not.toHaveBeenCalled();
  });

  it("restores the previous priority and reports a failed update", async () => {
    state.update.mockRejectedValueOnce(new Error("offline"));
    const wrapper = mountPage();
    await wrapper.get('button[title="Click para cambiar prioridad"]').trigger("click");
    await flushPromises();
    const cached = queryClient.getQueryData<FeedbackListResponse>(state.query.queryKey.value);
    expect(cached?.data[0].priority).toBe("medium");
    expect(state.error).toHaveBeenCalledWith("Error al cambiar la prioridad");
  });

  it("preserves creation, rejection and reopen actions", async () => {
    const wrapper = mountPage();
    await wrapper.findAll("button").find((button) => button.text().includes("Nueva entrada"))?.trigger("click");
    const createTitle = document.body.querySelector('input[maxlength="200"]') as HTMLInputElement;
    const createDescription = document.body.querySelector("textarea") as HTMLTextAreaElement;
    createTitle.value = "Admin suggestion";
    createTitle.dispatchEvent(new Event("input", { bubbles: true }));
    createDescription.value = "Details";
    createDescription.dispatchEvent(new Event("input", { bubbles: true }));
    await flushPromises();
    await Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Crear")?.click();
    await flushPromises();
    expect(state.create).toHaveBeenCalledWith({ title: "Admin suggestion", description: "Details", type: "suggestion", priority: "medium" });
    expect(state.success).toHaveBeenCalledWith("Creado correctamente");

    state.query.data.value = {
      ...state.query.data.value,
      data: [{ ...sampleEntry, status: "rejected" }],
    };
    await nextTick();
    await wrapper.findAll("button").find((button) => button.text().includes("Volver a pendiente"))?.trigger("click");
    await flushPromises();
    expect(state.reopen).toHaveBeenCalledWith("entry-1");
  });

  it("rejects with a reason, completes with a version or internally, and confirms deletion", async () => {
    const wrapper = mountPage();
    await wrapper.findAll("button").find((button) => button.text().includes("Rechazar"))?.trigger("click");
    const reason = document.body.querySelector("textarea") as HTMLTextAreaElement;
    await Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Rechazar")?.click();
    await flushPromises();
    expect(state.reject).not.toHaveBeenCalled();
    reason.value = "Duplicate";
    reason.dispatchEvent(new Event("input", { bubbles: true }));
    await flushPromises();
    await Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Rechazar")?.click();
    await flushPromises();
    expect(state.reject).toHaveBeenCalledWith({ id: "entry-1", rejectionReason: "Duplicate" });

    state.query.data.value = { ...state.query.data.value, data: [sampleEntry] };
    await wrapper.findAll("button").find((button) => button.text().includes("Marcar como hecho"))?.trigger("click");
    expect(state.versionEnabled?.()).toBe(true);
    expect(document.body.textContent).toContain("Item description");
    const select = document.body.querySelector("select") as HTMLSelectElement;
    select.value = "version-item-1";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await flushPromises();
    await Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Confirmar")?.click();
    await flushPromises();
    expect(state.complete).toHaveBeenCalledWith({ id: "entry-1", versionItemId: "version-item-1" });

    await wrapper.findAll("button").find((button) => button.text().includes("Marcar como hecho"))?.trigger("click");
    const checkbox = document.body.querySelector('input[type="checkbox"]') as HTMLInputElement;
    checkbox.click();
    await flushPromises();
    await Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Confirmar")?.click();
    await flushPromises();
    expect(state.complete).toHaveBeenLastCalledWith({ id: "entry-1", versionItemId: undefined });

    await wrapper.findAll("button").find((button) => button.text().includes("Eliminar"))?.trigger("click");
    await flushPromises();
    expect(state.confirm).toHaveBeenCalledWith("¿Eliminar esta entrada?", "Esta acción no se puede deshacer.", "Sí, eliminar", "Cancelar");
    expect(state.remove).toHaveBeenCalledWith("entry-1");
  });

  it("marks pending entries as read in the existing local support store", async () => {
    const pinia = createPinia();
    const wrapper = mount(FeedbackManagementView, { global: { plugins: [pinia, [VueQueryPlugin, { queryClient }]] } });
    await wrapper.findAll("button").find((button) => button.text().includes("Marcar como leído"))?.trigger("click");
    const { useSupportStore } = await import("@stores/support/support");
    expect(useSupportStore(pinia).isRead("entry-1")).toBe(true);
  });
});
