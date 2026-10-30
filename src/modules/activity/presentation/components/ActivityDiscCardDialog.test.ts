// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/modules/identity/auth";
import type { Disc } from "@services/discs/discs";
import type { DiscRate } from "@services/rates/rates";
import ActivityDiscCardDialog from "./ActivityDiscCardDialog.vue";

const { getDiscById, getDiscRates } = vi.hoisted(() => ({
  getDiscById: vi.fn(),
  getDiscRates: vi.fn(),
}));
vi.mock("@services/discs/discs", () => ({ getDiscById }));
vi.mock("@services/rates/rates", () => ({ getDiscRates }));

const DiscCardStub = defineComponent({
  name: "DiscCardComponent",
  props: ["id", "name", "artistName", "rate", "favoriteId", "pendingId"],
  template: "<div data-test=\"disc-card\">{{ name }} · {{ artistName }}</div>",
});

function setup() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const auth = useAuthStore(pinia);
  auth.authStatus = "authenticated";
  auth.token = "token";
  auth.userId = "user-a";
  auth.authSessionGeneration = 4;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = mount(ActivityDiscCardDialog, {
    attachTo: document.body,
    props: { discId: "disc-1" },
    global: {
      plugins: [pinia, [VueQueryPlugin, { queryClient }]],
      stubs: { DiscCard: DiscCardStub },
    },
  });
  return { wrapper, queryClient };
}

describe("ActivityDiscCardDialog", () => {
  beforeEach(() => {
    getDiscById.mockReset();
    getDiscRates.mockReset();
  });

  it("loads the catalog disc by id, fills DiscCard props and closes without replacing the timeline", async () => {
    const disc: Disc = {
      id: "disc-1",
      name: "Disco cargado",
      description: "",
      image: "cover.jpg",
      releaseDate: "2020-01-01",
      artist: { id: "artist-1", name: "Artista", description: "", image: "" },
      verified: true,
    };
    const rates = [{ id: "rate-1", rate: "8", cover: null, user: { id: "user-a" } }] as DiscRate[];
    getDiscById.mockResolvedValue(disc);
    getDiscRates.mockResolvedValue(rates);
    const { wrapper, queryClient } = setup();
    await flushPromises();

    expect(getDiscById).toHaveBeenCalledWith("disc-1", expect.any(AbortSignal));
    expect(getDiscRates).toHaveBeenCalledWith("disc-1", expect.any(AbortSignal));
    expect(wrapper.get('[role="dialog"]').attributes("aria-modal")).toBe("true");
    expect(wrapper.get('[data-test="disc-card"]').text()).toContain("Disco cargado");
    expect(wrapper.findComponent(DiscCardStub).props()).toMatchObject({
      id: "disc-1",
      name: "Disco cargado",
      artistName: "Artista",
      rate: 8,
    });
    expect(document.activeElement).toBe(wrapper.get('[aria-label="Cerrar ficha del disco"]').element);
    await wrapper.get('[aria-label="Cerrar ficha del disco"]').trigger("click");
    expect(wrapper.emitted("close")).toHaveLength(1);
    wrapper.unmount();
    queryClient.clear();
  });

  it("shows a retryable error when the disc lookup fails", async () => {
    getDiscById.mockRejectedValue(new Error("not found"));
    const { wrapper, queryClient } = setup();
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toContain("No se pudo cargar la ficha del disco");
    expect(wrapper.findComponent(DiscCardStub).exists()).toBe(false);
    wrapper.unmount();
    queryClient.clear();
  });
});
