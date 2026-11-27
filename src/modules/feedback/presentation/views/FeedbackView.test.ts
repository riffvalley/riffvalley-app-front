// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick, ref } from "vue";
import { existsSync, readFileSync } from "node:fs";

const state = vi.hoisted(() => ({
  query: undefined as unknown as ReturnType<typeof makeQuery>,
  create: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
function makeQuery() {
  return {
    data: ref(
      undefined as
        | { data: unknown[]; counts: { in_progress: number; done: number; rejected: number } }
        | undefined
    ),
    isPending: ref(false),
    isError: ref(false),
    refetch: vi.fn(),
  };
}
vi.mock("../../application/useFeedback", () => ({
  useMyFeedbackQuery: () => state.query,
  useFeedbackMutations: () => {
    const isPending = ref(false);
    return {
      create: {
        isPending,
        mutateAsync: async (payload: unknown) => {
          isPending.value = true;
          try {
            return await state.create(payload);
          } finally {
            isPending.value = false;
          }
        },
      },
    };
  },
}));
vi.mock("@services/swal/SwalService", () => ({
  default: { success: state.success, error: state.error },
}));

import FeedbackView from "./FeedbackView.vue";

describe("FeedbackView submission flow", () => {
  let wrapper: ReturnType<typeof mount> | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    state.query = makeQuery();
    state.create.mockResolvedValue({ id: "created" });
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
  });

  function modalElement(selector: string): HTMLElement {
    const element = document.body.querySelector<HTMLElement>(selector);
    if (!element) throw new Error(`Expected element ${selector} in the document`);
    return element;
  }

  it("opens the single modal with a clean default and restores focus when cancelled", async () => {
    wrapper = mount(FeedbackView, { attachTo: document.body });
    expect(document.body.querySelector("[role=dialog]")).toBeNull();
    const openButton = wrapper.get("button");
    openButton.element.focus();
    await openButton.trigger("click");

    expect(modalElement("[role=dialog]").textContent).toContain("Enviar feedback");
    expect((modalElement("#feedback-form-type-suggestion") as HTMLInputElement).checked).toBe(true);
    expect((modalElement("#feedback-form-category") as HTMLSelectElement).value).toBe("");
    expect(document.activeElement).toBe(modalElement("#feedback-form-type-suggestion"));

    const titleInput = modalElement("#feedback-form-title-input") as HTMLInputElement;
    titleInput.value = "Draft";
    titleInput.dispatchEvent(new Event("input", { bubbles: true }));
    await modalElement("[role=dialog] button:not([aria-label])").click();
    await nextTick();
    expect(document.body.querySelector("[role=dialog]")).toBeNull();
    await vi.waitFor(() => expect(document.activeElement).toBe(openButton.element));

    openButton.element.focus();
    await openButton.trigger("click");
    expect((modalElement("#feedback-form-title-input") as HTMLInputElement).value).toBe("");
    expect((modalElement("#feedback-form-type-suggestion") as HTMLInputElement).checked).toBe(true);
  });

  it("submits a categorized payload, closes on success, and keeps the existing history", async () => {
    state.query.data.value = {
      data: [
        {
          id: "old",
          title: "Histórico",
          description: "Detalle",
          type: "bug",
          category: null,
          status: "rejected",
          priority: "medium",
          rejectionReason: "Duplicado",
          versionItem: null,
          createdAt: "2026-01-01",
        },
      ],
      counts: { in_progress: 0, done: 0, rejected: 1 },
    };
    wrapper = mount(FeedbackView, { attachTo: document.body });
    await wrapper.get("button").trigger("click");

    (modalElement("#feedback-form-category") as HTMLSelectElement).value = "events";
    await modalElement("#feedback-form-category").dispatchEvent(
      new Event("change", { bubbles: true })
    );
    (modalElement("#feedback-form-title-input") as HTMLInputElement).value = "Festival filter";
    await modalElement("#feedback-form-title-input").dispatchEvent(
      new Event("input", { bubbles: true })
    );
    (modalElement("#feedback-form-description") as HTMLTextAreaElement).value = "Añadir un filtro";
    await modalElement("#feedback-form-description").dispatchEvent(
      new Event("input", { bubbles: true })
    );
    await modalElement("[role=dialog] form").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    expect(state.create).toHaveBeenCalledWith({
      title: "Festival filter",
      description: "Añadir un filtro",
      type: "suggestion",
      category: "events",
    });
    await vi.waitFor(() => expect(document.body.querySelector("[role=dialog]")).toBeNull());
    expect(state.success).toHaveBeenCalledWith("Enviado correctamente");
    expect(wrapper.text()).toContain("Histórico");
    expect(wrapper.text()).toContain("Duplicado");
  });

  it("keeps the modal and entered values when creation fails", async () => {
    state.create.mockRejectedValueOnce({ response: { data: { message: "Server message" } } });
    wrapper = mount(FeedbackView, { attachTo: document.body });
    await wrapper.get("button").trigger("click");
    (modalElement("#feedback-form-category") as HTMLSelectElement).value = "other";
    await modalElement("#feedback-form-category").dispatchEvent(
      new Event("change", { bubbles: true })
    );
    (modalElement("#feedback-form-title-input") as HTMLInputElement).value = "Again";
    await modalElement("#feedback-form-title-input").dispatchEvent(
      new Event("input", { bubbles: true })
    );
    (modalElement("#feedback-form-description") as HTMLTextAreaElement).value = "Details";
    await modalElement("#feedback-form-description").dispatchEvent(
      new Event("input", { bubbles: true })
    );
    await modalElement("[role=dialog] form").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await vi.waitFor(() =>
      expect(modalElement("#feedback-form-error").textContent).toContain("Server message")
    );
    expect((modalElement("#feedback-form-category") as HTMLSelectElement).value).toBe("other");
    expect((modalElement("#feedback-form-title-input") as HTMLInputElement).value).toBe("Again");
    expect((modalElement("#feedback-form-description") as HTMLTextAreaElement).value).toBe(
      "Details"
    );
    expect(state.error).not.toHaveBeenCalled();

    await vi.waitFor(() =>
      expect(
        (modalElement("[role=dialog] button[type=submit]") as HTMLButtonElement).disabled
      ).toBe(false)
    );
    modalElement("[role=dialog] form").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
    await vi.waitFor(() => expect(document.body.querySelector("[role=dialog]")).toBeNull());
    expect(state.create).toHaveBeenCalledTimes(2);
  });

  it("distinguishes own-list errors from a successful empty result and retries", async () => {
    state.query.isError.value = true;
    wrapper = mount(FeedbackView);
    expect(wrapper.text()).toContain("No se pudieron cargar tus envíos.");
    expect(wrapper.text()).not.toContain("Sin envíos todavía");
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Reintentar"))
      ?.trigger("click");
    expect(state.query.refetch).toHaveBeenCalledOnce();

    state.query.isError.value = false;
    state.query.data.value = { data: [], counts: { in_progress: 0, done: 0, rejected: 0 } };
    await nextTick();
    expect(wrapper.text()).toContain("Sin envíos todavía");
  });

  it("renders categorized and historical entries with their existing details", () => {
    state.query.data.value = {
      data: [
        {
          id: "old",
          title: "Histórico",
          description: "Detalle",
          type: "bug",
          category: null,
          status: "rejected",
          priority: "medium",
          rejectionReason: "Duplicado",
          versionItem: null,
          createdAt: "2026-01-01",
        },
        {
          id: "new",
          title: "Idea",
          description: "Mejora",
          type: "suggestion",
          category: "other",
          status: "in_progress",
          priority: "medium",
          rejectionReason: null,
          versionItem: null,
          createdAt: "2026-01-01",
        },
      ],
      counts: { in_progress: 1, done: 0, rejected: 1 },
    };
    wrapper = mount(FeedbackView);
    expect(wrapper.text()).toContain("Sin categorizar");
    expect(wrapper.text()).toContain("General / Otros");
    expect(wrapper.text()).toContain("Duplicado");
  });

  it("has no active view or service imports from the removed legacy locations", () => {
    const root = process.cwd();
    const view = readFileSync(
      `${root}/src/modules/feedback/presentation/views/FeedbackView.vue`,
      "utf8"
    );
    const adminView = readFileSync(
      `${root}/src/modules/feedback/presentation/views/FeedbackManagementView.vue`,
      "utf8"
    );
    const api = readFileSync(`${root}/src/modules/feedback/api/feedback.ts`, "utf8");
    expect(existsSync(`${root}/src/services/suggestions/suggestions.ts`)).toBe(false);
    expect(existsSync(`${root}/src/views/suggestions/SuggestionsPage.vue`)).toBe(false);
    expect(existsSync(`${root}/src/views/suggestions/SuggestionsManagement.vue`)).toBe(false);
    expect(view + adminView).not.toContain("@services/suggestions/suggestions");
    expect(view + adminView).not.toMatch(/\baxios\b/i);
    expect(api).toContain("@services/api/api");
  });
});
