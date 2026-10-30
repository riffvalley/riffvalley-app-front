// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick, ref } from "vue";
import { existsSync, readFileSync } from "node:fs";

const state = vi.hoisted(() => ({
  query: undefined as unknown as ReturnType<typeof makeQuery>,
  create: vi.fn(), success: vi.fn(), error: vi.fn(),
}));
function makeQuery() {
  return {
    data: ref(undefined as { data: unknown[]; counts: { in_progress: number; done: number; rejected: number } } | undefined),
    isPending: ref(false), isError: ref(false), refetch: vi.fn(),
  };
}
vi.mock("../../application/useFeedback", () => ({
  useMyFeedbackQuery: () => state.query,
  useFeedbackMutations: () => ({ create: { mutateAsync: state.create, isPending: ref(false) } }),
}));
vi.mock("@services/swal/SwalService", () => ({ default: { success: state.success, error: state.error } }));

import FeedbackView from "./FeedbackView.vue";

describe("FeedbackView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.query = makeQuery();
    state.create.mockResolvedValue({ id: "created" });
  });

  it("creates bugs and suggestions with the existing required-field validation", async () => {
    const wrapper = mount(FeedbackView);
    await wrapper.find("form").trigger("submit");
    expect(state.create).not.toHaveBeenCalled();

    await wrapper.find("input").setValue("A bug");
    await wrapper.find("textarea").setValue("Details");
    await wrapper.findAll("button").find((button) => button.text().includes("Bug"))?.trigger("click");
    await wrapper.find("form").trigger("submit");
    expect(state.create).toHaveBeenCalledWith({ title: "A bug", description: "Details", type: "bug" });
    expect(state.success).toHaveBeenCalledWith("Enviado correctamente");
    expect((wrapper.find("input").element as HTMLInputElement).value).toBe("");
    expect((wrapper.find("textarea").element as HTMLTextAreaElement).value).toBe("");

    await wrapper.find("input").setValue("Idea");
    await wrapper.find("textarea").setValue("More details");
    await wrapper.find("form").trigger("submit");
    expect(state.create).toHaveBeenLastCalledWith({ title: "Idea", description: "More details", type: "suggestion" });
  });

  it("distinguishes own-list errors from a successful empty result and retries", async () => {
    state.query.isError.value = true;
    const wrapper = mount(FeedbackView);
    expect(wrapper.text()).toContain("No se pudieron cargar tus envíos.");
    expect(wrapper.text()).not.toContain("Sin envíos todavía");
    await wrapper.findAll("button").find((button) => button.text().includes("Reintentar"))?.trigger("click");
    expect(state.query.refetch).toHaveBeenCalledOnce();

    state.query.isError.value = false;
    state.query.data.value = { data: [], counts: { in_progress: 0, done: 0, rejected: 0 } };
    await nextTick();
    expect(wrapper.text()).toContain("Sin envíos todavía");
  });

  it("renders real own entries and submission errors", async () => {
    state.query.data.value = {
      data: [{ id: "entry-1", title: "A title", description: "A description", type: "bug", status: "rejected", priority: "medium", rejectionReason: "Duplicate", versionItem: null, createdAt: "2026-01-01" }],
      counts: { in_progress: 0, done: 0, rejected: 1 },
    };
    state.create.mockRejectedValueOnce({ response: { data: { message: "Server message" } } });
    const wrapper = mount(FeedbackView);
    expect(wrapper.text()).toContain("A title");
    expect(wrapper.text()).toContain("Duplicate");
    await wrapper.find("input").setValue("Again");
    await wrapper.find("textarea").setValue("Details");
    await wrapper.find("form").trigger("submit");
    expect(state.error).toHaveBeenCalledWith("Server message");
  });

  it("has no active view or service imports from the removed legacy locations", () => {
    const root = process.cwd();
    const view = readFileSync(`${root}/src/modules/feedback/presentation/views/FeedbackView.vue`, "utf8");
    const adminView = readFileSync(`${root}/src/modules/feedback/presentation/views/FeedbackManagementView.vue`, "utf8");
    const api = readFileSync(`${root}/src/modules/feedback/api/feedback.ts`, "utf8");
    expect(existsSync(`${root}/src/services/suggestions/suggestions.ts`)).toBe(false);
    expect(existsSync(`${root}/src/views/suggestions/SuggestionsPage.vue`)).toBe(false);
    expect(existsSync(`${root}/src/views/suggestions/SuggestionsManagement.vue`)).toBe(false);
    expect(view + adminView).not.toContain("@services/suggestions/suggestions");
    expect(view + adminView).not.toMatch(/\baxios\b/i);
    expect(api).toContain("@services/api/api");
  });
});
