// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia } from "pinia";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { nextTick, ref } from "vue";
import type { FeedbackEntry, FeedbackListResponse } from "../../types/feedback";

const pendingBug: FeedbackEntry = {
  id: "entry-1",
  title: "Bug title",
  description: "Details",
  type: "bug",
  status: "in_progress",
  priority: "medium",
  rejectionReason: null,
  category: null,
  userId: "user-1",
  user: { id: "user-1", username: "Member" },
  versionItemId: null,
  versionItem: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
const pendingSuggestion: FeedbackEntry = {
  ...pendingBug,
  id: "entry-3",
  title: "Suggestion",
  type: "suggestion",
  priority: "high",
  category: "albums",
  user: null,
  createdAt: "2026-01-03T00:00:00.000Z",
};
const resolvedEntry: FeedbackEntry = {
  ...pendingBug,
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
const baseResponse: FeedbackListResponse = {
  data: [pendingBug, resolvedEntry],
  counts: { in_progress: 4, done: 2, rejected: 3 },
};
const state = vi.hoisted(() => ({
  query: undefined as unknown as ReturnType<typeof makeQuery>,
  filters: [] as Array<{ value: string }>,
  versionEnabled: undefined as (() => boolean) | undefined,
  versionQuery: undefined as unknown as ReturnType<typeof makeVersionQuery>,
  create: vi.fn(),
  update: vi.fn(),
  reopen: vi.fn(),
  reject: vi.fn(),
  complete: vi.fn(),
  remove: vi.fn(),
  confirm: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
function makeQuery() {
  return {
    data: ref<FeedbackListResponse | undefined>(structuredClone(baseResponse)),
    isPending: ref(false),
    isError: ref(false),
    refetch: vi.fn(),
    queryKey: ref(["feedback", "admin", "admin-1", 1, "all", "in_progress", "all"]),
  };
}
function makeVersionQuery() {
  return {
    data: ref([{ id: "version-item-1", type: "feat", description: "Item description" }]),
    isPending: ref(false),
    isError: ref(false),
    refetch: vi.fn(),
  };
}
vi.mock("../../application/useFeedback", () => ({
  useAdminFeedbackQuery: (
    type: { value: string },
    status: { value: string },
    category: { value: string }
  ) => {
    state.filters = [type, status, category];
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
vi.mock("@services/swal/SwalService", () => ({
  default: {
    confirm: state.confirm,
    success: state.success,
    error: state.error,
  },
}));

import FeedbackManagementView from "./FeedbackManagementView.vue";
import FeedbackFormModal from "../components/FeedbackFormModal.vue";

enableAutoUnmount(afterEach);

describe("FeedbackManagementView", () => {
  let queryClient: QueryClient;
  beforeEach(() => {
    vi.clearAllMocks();
    state.query = makeQuery();
    state.versionQuery = makeVersionQuery();
    state.confirm.mockResolvedValue({ isConfirmed: true });
    state.create.mockResolvedValue({ id: "created" });
    state.update.mockResolvedValue(pendingBug);
    state.reopen.mockResolvedValue({ ...pendingBug, status: "in_progress" });
    state.reject.mockResolvedValue({ ...pendingBug, status: "rejected" });
    state.complete.mockResolvedValue({ ...pendingBug, status: "done" });
    state.remove.mockResolvedValue(undefined);
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  function mountPage() {
    queryClient.setQueryData(state.query.queryKey.value, state.query.data.value);
    return mount(FeedbackManagementView, {
      attachTo: document.body,
      global: { plugins: [createPinia(), [VueQueryPlugin, { queryClient }]] },
    });
  }
  function getSelect(wrapper: ReturnType<typeof mountPage>, label: string) {
    return wrapper
      .findAll("label")
      .find((item) => item.text().startsWith(label))!
      .get("select");
  }

  it("renders admin heading, shared create modal, loading/error/empty states and retries", async () => {
    state.query.data.value = undefined;
    state.query.isPending.value = true;
    const wrapper = mountPage();
    expect(wrapper.text()).toContain("Soporte");
    expect(wrapper.text()).not.toContain(
      "Gestiona las sugerencias y bugs enviados por los usuarios"
    );
    expect(wrapper.text()).toContain("Aportaciones");
    expect(wrapper.text()).toContain("Cargando aportaciones...");
    expect(wrapper.findComponent(FeedbackFormModal).exists()).toBe(true);
    state.query.isPending.value = false;
    state.query.isError.value = true;
    await nextTick();
    expect(wrapper.text()).toContain("No se pudieron cargar las aportaciones.");
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Reintentar"))!
      .trigger("click");
    expect(state.query.refetch).toHaveBeenCalledOnce();
    state.query.isError.value = false;
    state.query.data.value = { data: [], counts: { in_progress: 0, done: 0, rejected: 0 } };
    await nextTick();
    expect(wrapper.text()).toContain("Sin resultados");
    wrapper.unmount();
  });

  it("combines type, status and category server filters, defaults to pending and can reset all filters", async () => {
    const wrapper = mountPage();
    expect(state.filters.map((filter) => filter.value)).toEqual(["all", "in_progress", "all"]);
    await getSelect(wrapper, "Tipo").setValue("bug");
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Rechazados"))!
      .trigger("click");
    await getSelect(wrapper, "Apartado").setValue("uncategorized");
    await getSelect(wrapper, "Prioridad").setValue("low");
    await getSelect(wrapper, "Orden").setValue("oldest");
    expect(state.filters.map((filter) => filter.value)).toEqual([
      "bug",
      "rejected",
      "uncategorized",
    ]);
    expect(wrapper.text()).not.toContain("resultados visibles");
    const reset = wrapper
      .findAll("button")
      .find((button) => button.text() === "Restablecer filtros");
    await reset!.trigger("click");
    expect(state.filters.map((filter) => filter.value)).toEqual(["all", "in_progress", "all"]);
    expect((getSelect(wrapper, "Prioridad").element as HTMLSelectElement).value).toBe("all");
  });

  it("uses backend counters, pluralization, local priority filtering and deterministic priority/date ordering", async () => {
    state.query.data.value = {
      data: [
        pendingBug,
        {
          ...pendingBug,
          id: "entry-4",
          title: "Low",
          priority: "low",
          createdAt: "2026-01-04T00:00:00Z",
        },
        pendingSuggestion,
      ],
      counts: { in_progress: 4, done: 5, rejected: 2 },
    };
    const wrapper = mountPage();
    expect(wrapper.text()).toContain("Todas (11)");
    expect(
      wrapper
        .findAll("button")
        .find((button) => button.text().includes("Pendientes"))
        ?.attributes("aria-pressed")
    ).toBe("true");
    expect(wrapper.text()).toContain("Pendientes (4)");
    expect(wrapper.text()).toContain("Resueltos (5)");
    expect(wrapper.text()).toContain("Rechazados (2)");
    expect(
      wrapper
        .findAll("button")
        .find((button) => button.text().includes("Pendientes"))
        ?.classes()
    ).toContain("bg-yellow-600");
    const titles = () => wrapper.findAll("article h3").map((item) => item.text());
    expect(titles()).toEqual(["Suggestion", "Bug title", "Low"]);
    await getSelect(wrapper, "Prioridad").setValue("medium");
    expect(titles()).toEqual(["Bug title"]);
    expect(wrapper.text()).not.toContain("resultados visibles");
    await getSelect(wrapper, "Prioridad").setValue("all");
    await getSelect(wrapper, "Orden").setValue("newest");
    expect(titles()).toEqual(["Low", "Suggestion", "Bug title"]);
    state.query.data.value = {
      ...state.query.data.value!,
      counts: { in_progress: 1, done: 1, rejected: 1 },
    };
    await nextTick();
    expect(wrapper.text()).toContain("Pendiente (1)");
    expect(wrapper.text()).toContain("Resuelto (1)");
    expect(wrapper.text()).toContain("Rechazado (1)");
  });

  it("creates categorized suggestions and bugs through the approved shared modal", async () => {
    const wrapper = mountPage();
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Nueva aportación"))!
      .trigger("click");
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
    const typeBug = document.body.querySelector("#feedback-form-type-bug") as HTMLInputElement;
    typeBug.click();
    const category = document.body.querySelector("#feedback-form-category") as HTMLSelectElement;
    category.value = "artists";
    category.dispatchEvent(new Event("change", { bubbles: true }));
    const title = document.body.querySelector("#feedback-form-title-input") as HTMLInputElement;
    const description = document.body.querySelector(
      "#feedback-form-description"
    ) as HTMLTextAreaElement;
    title.value = "Admin bug";
    title.dispatchEvent(new Event("input", { bubbles: true }));
    description.value = "Details";
    description.dispatchEvent(new Event("input", { bubbles: true }));
    await flushPromises();
    await nextTick();
    await Array.from(document.body.querySelectorAll("button"))
      .find((button) => button.textContent?.includes("Comunicar bug"))!
      .click();
    await flushPromises();
    await nextTick();
    await nextTick();
    expect(state.create).toHaveBeenCalledWith({
      title: "Admin bug",
      description: "Details",
      type: "bug",
      category: "artists",
    });
    expect(state.success).toHaveBeenCalledWith("Enviado correctamente");
    expect(wrapper.findComponent(FeedbackFormModal).props("open")).toBe(false);
    wrapper.unmount();
  });

  it("sends null for uncategorized edits and supports explicit priority values with rollback", async () => {
    const wrapper = mountPage();
    const card = wrapper.findAll("article")[0];
    const actions = card.find("details");
    await actions
      .findAll("button")
      .find((button) => button.text() === "Cambiar categoría")!
      .trigger("click");
    (document.body.querySelector("#feedback-edit-value") as HTMLSelectElement).value =
      "uncategorized";
    document.body
      .querySelector("#feedback-edit-value")!
      .dispatchEvent(new Event("change", { bubbles: true }));
    await flushPromises();
    await Array.from(document.body.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Guardar")!
      .click();
    await flushPromises();
    expect(state.update).toHaveBeenCalledWith({ id: "entry-1", dto: { category: null } });

    const freshCard = wrapper.findAll("article")[0];
    await freshCard
      .find("details")
      .findAll("button")
      .find((button) => button.text() === "Cambiar prioridad")!
      .trigger("click");
    (document.body.querySelector("#feedback-edit-value") as HTMLSelectElement).value = "low";
    document.body
      .querySelector("#feedback-edit-value")!
      .dispatchEvent(new Event("change", { bubbles: true }));
    await flushPromises();
    state.update.mockRejectedValueOnce(new Error("offline"));
    await Array.from(document.body.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Guardar")!
      .click();
    await flushPromises();
    expect(state.update).toHaveBeenLastCalledWith({ id: "entry-1", dto: { priority: "low" } });
    expect(state.error).toHaveBeenCalledWith("No se pudo cambiar la prioridad");
    const cached = queryClient.getQueryData<FeedbackListResponse>(state.query.queryKey.value);
    expect(cached?.data.find((entry) => entry.id === "entry-1")?.priority).toBe("medium");
  });

  it("keeps status-based actions, resolution variants, rejection, reopen, read and confirmed delete", async () => {
    const wrapper = mountPage();
    const pending = wrapper.findAll("article")[0];
    expect(pending.text()).toContain("Resolver");
    expect(pending.text()).toContain("Rechazar");
    expect(pending.find("details").text()).toContain("Marcar como leído");
    expect(wrapper.findAll("article")[1].text()).toContain("Add keyboard shortcuts");
    expect(wrapper.findAll("article")[1].text()).toContain("Usuario eliminado");
    expect(wrapper.findAll("article")[1].find("details").text()).not.toContain("Marcar como leído");

    await pending
      .findAll("button")
      .find((button) => button.text().includes("Resolver"))!
      .trigger("click");
    expect(state.versionEnabled?.()).toBe(true);
    (document.body.querySelector("#feedback-version-item") as HTMLSelectElement).value =
      "version-item-1";
    document.body
      .querySelector("#feedback-version-item")!
      .dispatchEvent(new Event("change", { bubbles: true }));
    await flushPromises();
    await Array.from(document.body.querySelectorAll("button"))
      .find((button) => button.textContent?.includes("Confirmar resolución"))!
      .click();
    await flushPromises();
    expect(state.complete).toHaveBeenCalledWith({ id: "entry-1", versionItemId: "version-item-1" });

    await wrapper
      .findAll("article")[0]
      .findAll("button")
      .find((button) => button.text().includes("Resolver"))!
      .trigger("click");
    (document.body.querySelector("#feedback-internal-done") as HTMLInputElement).click();
    await flushPromises();
    await Array.from(document.body.querySelectorAll("button"))
      .find((button) => button.textContent?.includes("Confirmar resolución"))!
      .click();
    await flushPromises();
    expect(state.complete).toHaveBeenLastCalledWith({ id: "entry-1", versionItemId: undefined });

    const rejectActionButton = wrapper
      .findAll("article")[0]
      .findAll("button")
      .find((button) => button.text().includes("Rechazar"))!;
    (rejectActionButton.element as HTMLButtonElement).focus();
    await rejectActionButton.trigger("click");
    await nextTick();
    const rejectDialog = document
      .querySelector("#feedback-reject-reason")
      ?.closest("[role='dialog']");
    const rejectFocusable = Array.from(
      rejectDialog!.querySelectorAll<HTMLElement>("textarea, button:not([disabled])")
    );
    expect(rejectDialog!.contains(document.activeElement)).toBe(true);
    rejectFocusable.at(-1)!.focus();
    rejectFocusable
      .at(-1)!
      .dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    expect(document.activeElement).toBe(rejectFocusable[0]);
    const reason = document.body.querySelector("#feedback-reject-reason") as HTMLTextAreaElement;
    reason.value = "Duplicate";
    reason.dispatchEvent(new Event("input", { bubbles: true }));
    await flushPromises();
    await Array.from(rejectDialog!.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Rechazar")!
      .click();
    await flushPromises();
    expect(state.reject).toHaveBeenCalledWith({ id: "entry-1", rejectionReason: "Duplicate" });
    await nextTick();
    expect(document.activeElement).toBe(rejectActionButton.element);

    await wrapper
      .findAll("article")[0]
      .find("details")
      .findAll("button")
      .find((button) => button.text() === "Marcar como leído")!
      .trigger("click");
    await nextTick();
    expect(wrapper.findAll("article")[0].find("details").text()).not.toContain("Marcar como leído");

    state.query.data.value = {
      ...state.query.data.value!,
      data: [{ ...pendingBug, status: "rejected" }],
    };
    await nextTick();
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Reabrir"))!
      .trigger("click");
    await flushPromises();
    expect(state.reopen).toHaveBeenCalledWith("entry-1");
    await wrapper
      .findAll("article")[0]
      .find("details")
      .findAll("button")
      .find((button) => button.text() === "Eliminar")!
      .trigger("click");
    await flushPromises();
    expect(state.confirm).toHaveBeenCalledOnce();
    expect(state.remove).toHaveBeenCalledWith("entry-1");
    wrapper.unmount();
  });
});
