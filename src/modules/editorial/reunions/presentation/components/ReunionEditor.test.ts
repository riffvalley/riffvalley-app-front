// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getReunionDetails } from "../../api/reunionsApi";
import type { Reunion } from "../../types/reunions";
import { reunionsQueryKeys } from "../../application/reunionsQueries";
import ReunionEditor from "./ReunionEditor.vue";

vi.mock("../../api/reunionsApi", () => ({
  getReunionDetails: vi.fn(),
  getReunions: vi.fn(),
  createPoint: vi.fn(),
  updatePoint: vi.fn(),
  deletePoint: vi.fn(),
  createReunion: vi.fn(),
  updateReunion: vi.fn(),
  deleteReunion: vi.fn(),
}));

const current: Reunion = {
  id: "meeting-1",
  title: "Original",
  date: "2026-11-01T12:30:00.000Z",
  description: null,
  points: [
    {
      id: "point-1",
      title: "Agenda",
      content: "Original notes",
      done: false,
      createdAt: "2026-11-01T00:00:00.000Z",
    },
  ],
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
};

afterEach(() => vi.clearAllMocks());

describe("Reunion editor drafts", () => {
  it("preserves dirty fields and an open form through remote HTTP refetches", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const auth = (await import("@/modules/identity/auth")).useAuthStore();
    auth.$patch({
      userId: "user-a",
      role: "riffvalley",
      token: "token-a",
      authStatus: "authenticated",
      authSessionGeneration: 2,
    });
    let response = current;
    vi.mocked(getReunionDetails).mockImplementation(async () => response);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    const wrapper = mount(ReunionEditor, {
      props: { id: current.id },
      global: { plugins: [pinia, [VueQueryPlugin, { queryClient }]] },
    });
    await flushPromises();
    await wrapper.get('[aria-label="Editar reunión"]').trigger("click");
    const title = wrapper.get("#reunion-title");
    await title.setValue("Mi borrador local");

    response = {
      ...current,
      title: "Título remoto",
      points: [{ ...current.points[0]!, title: "Punto actualizado por otra persona" }],
    };
    await queryClient.invalidateQueries({
      queryKey: reunionsQueryKeys.root("user-a", 2, "riffvalley"),
    });
    await flushPromises();

    expect(wrapper.get("#reunion-title").element).toHaveProperty("value", "Mi borrador local");
    expect(wrapper.get("h1").text()).toBe("Título remoto");
    expect(wrapper.text()).toContain("Punto actualizado por otra persona");
    expect(wrapper.find("form").exists()).toBe(true);
    wrapper.unmount();
    queryClient.clear();
  });

  it("keeps an edited Point draft visible if the Point is deleted remotely", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const auth = (await import("@/modules/identity/auth")).useAuthStore();
    auth.$patch({
      userId: "user-a",
      role: "riffvalley",
      token: "token-a",
      authStatus: "authenticated",
      authSessionGeneration: 2,
    });
    let response = current;
    vi.mocked(getReunionDetails).mockImplementation(async () => response);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    const wrapper = mount(ReunionEditor, {
      props: { id: current.id },
      global: { plugins: [pinia, [VueQueryPlugin, { queryClient }]] },
    });
    await flushPromises();
    await wrapper.get('[aria-label="Editar Agenda"]').trigger("click");
    await wrapper.get("#point-title-point-1").setValue("Borrador sin guardar");

    response = { ...current, points: [] };
    await queryClient.invalidateQueries({
      queryKey: reunionsQueryKeys.root("user-a", 2, "riffvalley"),
    });
    await flushPromises();

    expect(wrapper.get("#orphan-point-title").element).toHaveProperty(
      "value",
      "Borrador sin guardar"
    );
    expect(wrapper.text()).toContain("Tu borrador se conserva");
    expect(wrapper.find("#point-title-point-1").exists()).toBe(false);
    wrapper.unmount();
    queryClient.clear();
  });

  it("labels the modal and restores keyboard focus when it closes", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const auth = (await import("@/modules/identity/auth")).useAuthStore();
    auth.$patch({
      userId: "user-a",
      role: "riffvalley",
      token: "token-a",
      authStatus: "authenticated",
      authSessionGeneration: 2,
    });
    vi.mocked(getReunionDetails).mockResolvedValue(current);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    const wrapper = mount(ReunionEditor, {
      props: { id: current.id, modal: true, show: false },
      attachTo: document.body,
      global: { plugins: [pinia, [VueQueryPlugin, { queryClient }]] },
    });

    await wrapper.setProps({ show: true });
    await flushPromises();
    expect(wrapper.get('[role="dialog"]').attributes("aria-modal")).toBe("true");
    expect(document.activeElement).toBe(wrapper.get('[aria-label="Cerrar"]').element);
    await wrapper.setProps({ show: false });
    await flushPromises();
    expect(document.activeElement).toBe(trigger);

    wrapper.unmount();
    trigger.remove();
    queryClient.clear();
  });
});
