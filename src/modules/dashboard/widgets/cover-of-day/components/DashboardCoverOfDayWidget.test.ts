// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { h } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { dashboardWidgetDefaults } from "@/app/dashboardWidgetRegistry";

const { getDailyCoverFeatured, postRateService, updateRateService } = vi.hoisted(() => ({
  getDailyCoverFeatured: vi.fn(),
  postRateService: vi.fn(),
  updateRateService: vi.fn(),
}));

vi.mock("@services/discs/discs", () => ({ getDailyCoverFeatured }));
vi.mock("@services/rates/rates", () => ({ postRateService, updateRateService }));

import { useAuthStore } from "@/modules/identity/auth";
import DashboardWidgetGrid from "../../../components/DashboardWidgetGrid.vue";
import DashboardCoverOfDayWidget from "./DashboardCoverOfDayWidget.vue";

const firstCover = (overrides: Record<string, unknown> = {}) => ({
  id: "8d286d5a-4436-4faf-a59a-eef95a94929a",
  name: "Álbum destacado",
  description: "Descripción completa del disco",
  image: "https://images.test/featured-cover.jpg",
  releaseDate: "2024-01-01",
  artist: {
    id: "43ac81d0-ad4a-4d1f-a0aa-fb9f81b55aad",
    name: "Artista destacado",
    description: "Descripción de artista",
    image: "https://images.test/artist.jpg",
  },
  verified: true,
  EP: false,
  averageRate: 7.5,
  averageCover: 8.2,
  coverVoteCount: 6,
  voteCount: 42,
  commentCount: 2,
  userRate: null,
  ...overrides,
});

function mountWidget({ authenticated = true } = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const authStore = useAuthStore();
  if (authenticated) {
    authStore.$patch({
      token: "memory-only-token",
      authStatus: "authenticated",
      userId: "user-a",
      role: "user",
      authSessionGeneration: 1,
    });
  }
  const wrapper = mount(DashboardCoverOfDayWidget, { global: { plugins: [pinia] } });
  return { authStore, pinia, wrapper };
}

describe("DashboardCoverOfDayWidget", () => {
  beforeEach(() => {
    getDailyCoverFeatured.mockReset().mockResolvedValue(firstCover());
    postRateService.mockReset().mockResolvedValue(undefined);
    updateRateService.mockReset().mockResolvedValue(undefined);
  });

  it("requests the featured cover once when mounted with an authenticated session", async () => {
    const { wrapper } = mountWidget();

    await flushPromises();

    expect(getDailyCoverFeatured).toHaveBeenCalledOnce();
    expect(getDailyCoverFeatured).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) });
    expect(wrapper.get('[data-test="cover-of-day-widget"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("does not request while the grid slot is disabled and aborts when it is disabled during loading", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    useAuthStore().$patch({
      token: "memory-only-token",
      authStatus: "authenticated",
      userId: "user-a",
      role: "user",
      authSessionGeneration: 1,
    });
    let requestSignal: AbortSignal | undefined;
    getDailyCoverFeatured.mockImplementation(({ signal }: { signal: AbortSignal }) => {
      requestSignal = signal;
      return new Promise(() => undefined);
    });
    const module = { ...dashboardWidgetDefaults.find(({ id }) => id === "portadaDia")!, enabled: false };
    const wrapper = mount(DashboardWidgetGrid, {
      props: { modules: [module] },
      slots: { portadaDia: () => h(DashboardCoverOfDayWidget) },
      global: { plugins: [pinia] },
    });

    expect(getDailyCoverFeatured).not.toHaveBeenCalled();
    await wrapper.setProps({ modules: [{ ...module, enabled: true }] });
    expect(getDailyCoverFeatured).toHaveBeenCalledOnce();
    await wrapper.setProps({ modules: [{ ...module, enabled: false }] });
    expect(requestSignal?.aborted).toBe(true);
    wrapper.unmount();
  });

  it("renders the community average and cover vote count instead of musical voteCount", async () => {
    const { wrapper } = mountWidget();

    await flushPromises();

    expect(wrapper.get("img").attributes("src")).toBe("https://images.test/featured-cover.jpg");
    expect(wrapper.text()).toContain("Álbum destacado");
    expect(wrapper.text()).toContain("Artista destacado");
    expect(wrapper.get('[data-test="cover-community-rating"]').text()).toBe(
      "8,2 / 10 · 6 votos de portada",
    );
    expect(wrapper.get('[data-test="cover-community-rating"]').text()).not.toContain("42");
    wrapper.unmount();
  });

  it("creates a cover vote without changing the musical rating and waits for discovery action", async () => {
    const { wrapper } = mountWidget();
    await flushPromises();
    await wrapper.get('input[type="number"]').setValue(9.5);
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(postRateService).toHaveBeenCalledWith({
      discId: "8d286d5a-4436-4faf-a59a-eef95a94929a",
      rate: null,
      cover: 9.5,
    });
    expect(updateRateService).not.toHaveBeenCalled();
    expect(getDailyCoverFeatured).toHaveBeenCalledOnce();
    expect(wrapper.get('[role="status"]').text()).toContain("Valoraste esta portada con 9.5");
    expect(wrapper.get('[data-test="cover-community-rating"]').text()).toContain("7 votos de portada");
    expect(wrapper.get('[data-test="cover-community-rating"]').text()).toContain("8,4 / 10");
    expect(wrapper.get('button').text()).toContain("Descubrir otra portada");
    wrapper.unmount();
  });

  it("updates an existing rate while preserving its musical score", async () => {
    getDailyCoverFeatured.mockResolvedValueOnce(
      firstCover({
        userRate: {
          id: "10718274-8f20-40f1-a2b2-0ac43b3f7b11",
          rate: "6.75",
          cover: null,
        },
      }),
    );
    const { wrapper } = mountWidget();
    await flushPromises();
    await wrapper.get('input[type="number"]').setValue(8);
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(updateRateService).toHaveBeenCalledWith("10718274-8f20-40f1-a2b2-0ac43b3f7b11", {
      discId: "8d286d5a-4436-4faf-a59a-eef95a94929a",
      rate: 6.75,
      cover: 8,
    });
    expect(postRateService).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("requests another cover only when the user chooses to discover one", async () => {
    getDailyCoverFeatured
      .mockResolvedValueOnce(firstCover())
      .mockResolvedValueOnce(firstCover({
        id: "27658d39-cd30-42ee-a035-885323bf633b",
        name: "Siguiente portada",
      }));
    const { wrapper } = mountWidget();
    await flushPromises();
    await wrapper.get('input[type="number"]').setValue(9);
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(getDailyCoverFeatured).toHaveBeenCalledOnce();
    await wrapper.get("button").trigger("click");
    await flushPromises();

    expect(getDailyCoverFeatured).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain("Siguiente portada");
    expect(wrapper.text()).not.toContain("Descubrir otra portada");
    wrapper.unmount();
  });

  it("does not expose a skip action before the current cover is voted", async () => {
    const { wrapper } = mountWidget();
    await flushPromises();

    expect(wrapper.text()).not.toContain("Descubrir otra portada");
    expect(wrapper.findAll("button").map((button) => button.text())).toEqual(["Votar portada"]);
    wrapper.unmount();
  });

  it("enforces the existing 1–10 range and half-point precision", async () => {
    const { wrapper } = mountWidget();
    await flushPromises();
    await wrapper.get('input[type="number"]').setValue(8.25);

    expect(wrapper.get('button[type="submit"]').attributes("disabled")).toBeDefined();
    await wrapper.get("form").trigger("submit");
    expect(postRateService).not.toHaveBeenCalled();
    expect(updateRateService).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("shows the empty state when the endpoint returns null", async () => {
    getDailyCoverFeatured.mockResolvedValueOnce(null);
    const { wrapper } = mountWidget();
    await flushPromises();

    expect(wrapper.get('[data-test="cover-empty-state"]').text()).toContain(
      "No quedan portadas destacadas pendientes de valorar",
    );
    expect(wrapper.find("form").exists()).toBe(false);
    wrapper.unmount();
  });

  it("shows a load error and retries through the same endpoint", async () => {
    getDailyCoverFeatured.mockRejectedValueOnce(new Error("network error")).mockResolvedValueOnce(firstCover());
    const { wrapper } = mountWidget();
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toContain("No se pudo cargar la portada destacada");
    await wrapper.get('[role="alert"] button').trigger("click");
    await flushPromises();

    expect(getDailyCoverFeatured).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain("Álbum destacado");
    wrapper.unmount();
  });

  it("keeps the cover and form available after a vote failure so the user can retry", async () => {
    postRateService.mockRejectedValueOnce(new Error("save failed")).mockResolvedValueOnce(undefined);
    const { wrapper } = mountWidget();
    await flushPromises();
    await wrapper.get('input[type="number"]').setValue(7.5);
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain("Álbum destacado");
    expect(wrapper.get('[role="alert"]').text()).toContain("No se pudo guardar tu valoración");
    expect(wrapper.find("form").exists()).toBe(true);
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(postRateService).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain("Valoraste esta portada con 7.5");
    wrapper.unmount();
  });

  it("prevents concurrent duplicate submissions", async () => {
    let resolveSave: (() => void) | undefined;
    postRateService.mockImplementation(
      () => new Promise<void>((resolve) => { resolveSave = resolve; }),
    );
    const { wrapper } = mountWidget();
    await flushPromises();
    await wrapper.get('input[type="number"]').setValue(8.5);
    const form = wrapper.get("form");
    await form.trigger("submit");
    await form.trigger("submit");

    expect(postRateService).toHaveBeenCalledOnce();
    resolveSave?.();
    await flushPromises();
    wrapper.unmount();
  });

  it("rejects a response without a valid UUID before showing voting actions", async () => {
    getDailyCoverFeatured.mockResolvedValueOnce(firstCover({ id: "" }));
    const { wrapper } = mountWidget();
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toContain("formato válido");
    expect(wrapper.find("form").exists()).toBe(false);
    expect(postRateService).not.toHaveBeenCalled();
    expect(updateRateService).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("aborts a pending read and ignores its result after unmount", async () => {
    let requestSignal: AbortSignal | undefined;
    let resolveRequest: ((value: ReturnType<typeof firstCover>) => void) | undefined;
    getDailyCoverFeatured.mockImplementation(({ signal }: { signal: AbortSignal }) => {
      requestSignal = signal;
      return new Promise((resolve) => { resolveRequest = resolve; });
    });
    const { wrapper } = mountWidget();
    wrapper.unmount();
    resolveRequest?.(firstCover());
    await flushPromises();

    expect(requestSignal?.aborted).toBe(true);
  });

  it("clears the old user's cover and fetches again when the session identity changes", async () => {
    let firstSignal: AbortSignal | undefined;
    let resolveFirst: ((value: ReturnType<typeof firstCover>) => void) | undefined;
    getDailyCoverFeatured
      .mockImplementationOnce(({ signal }: { signal: AbortSignal }) => {
        firstSignal = signal;
        return new Promise((resolve) => { resolveFirst = resolve; });
      })
      .mockResolvedValueOnce(firstCover({
        id: "27658d39-cd30-42ee-a035-885323bf633b",
        name: "Portada de usuario B",
      }));
    const { authStore, wrapper } = mountWidget();
    authStore.$patch({ userId: "user-b", authSessionGeneration: 2 });
    await flushPromises();
    resolveFirst?.(firstCover({ name: "Portada de usuario A" }));
    await flushPromises();

    expect(getDailyCoverFeatured).toHaveBeenCalledTimes(2);
    expect(firstSignal?.aborted).toBe(true);
    expect(wrapper.text()).toContain("Portada de usuario B");
    expect(wrapper.text()).not.toContain("Portada de usuario A");
    wrapper.unmount();
  });

  it("does not request personalized data without a session", async () => {
    const { wrapper } = mountWidget({ authenticated: false });
    await flushPromises();

    expect(getDailyCoverFeatured).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Inicia sesión para descubrir una portada");
    expect(wrapper.text()).not.toContain("No quedan portadas destacadas");
    wrapper.unmount();
  });
});
