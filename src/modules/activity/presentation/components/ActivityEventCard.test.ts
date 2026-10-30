// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises } from "@vue/test-utils";
import { useAuthStore } from "@/modules/identity/auth";
import type { ActivityHistoryEvent } from "../../types/activity";
import ActivityEventCard from "./ActivityEventCard.vue";

const { getDiscById, getDiscRates } = vi.hoisted(() => ({
  getDiscById: vi.fn(),
  getDiscRates: vi.fn(),
}));
vi.mock("@services/discs/discs", () => ({ getDiscById }));
vi.mock("@services/rates/rates", () => ({ getDiscRates }));

const ActivityDiscCardDialogStub = {
  name: "ActivityDiscCardDialog",
  props: ["discId"],
  emits: ["close"],
  template: "<div data-test=\"disc-card-dialog\">{{ discId }}<button @click=\"$emit('close')\">Cerrar</button></div>",
};

function event(overrides: Partial<ActivityHistoryEvent> = {}): ActivityHistoryEvent {
  return {
    id: "event-1",
    type: "set",
    occurredAt: "2026-10-31T23:30:00.123456Z",
    previousValue: null,
    newValue: 8,
    disc: {
      id: "disc-1",
      title: "Disco de prueba",
      artist: { id: "artist-1", name: "Artista de prueba" },
      coverUrl: "https://example.test/cover.jpg",
      genre: null,
    },
    ...overrides,
  };
}

function mountCard(value: ActivityHistoryEvent) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const auth = useAuthStore(pinia);
  auth.authStatus = "authenticated";
  auth.token = "token";
  auth.userId = "user-a";
  auth.authSessionGeneration = 4;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return mount(ActivityEventCard, {
    props: { event: value },
    global: {
      plugins: [pinia, [VueQueryPlugin, { queryClient }]],
      stubs: { ActivityDiscCardDialog: ActivityDiscCardDialogStub },
    },
  });
}

describe("ActivityEventCard", () => {
  beforeEach(() => {
    getDiscById.mockReset();
    getDiscRates.mockReset();
  });

  it("renders a set action, cover, artist and local time", () => {
    const wrapper = mountCard(event());
    expect(wrapper.text()).toContain("Voto");
    expect(wrapper.get("span").classes()).toContain("bg-green-100");
    expect(wrapper.text()).toContain("8/10");
    expect(wrapper.get(".tabular-nums").classes()).toContain("bg-emerald-100");
    expect(wrapper.text()).not.toContain("Valoraste este disco con");
    expect(wrapper.get("img").attributes("alt")).toBe("Portada de Disco de prueba");
    expect(wrapper.text()).toContain("Artista de prueba");
    expect(wrapper.get("article").classes()).toContain("grid-cols-[4rem_minmax(0,1fr)]");
    expect(wrapper.get("article").classes()).toContain("sm:grid-cols-[6rem_minmax(0,1fr)_7.5rem]");
    expect(wrapper.get("h3").classes()).toContain("break-words");
    expect(wrapper.get("button").classes()).toContain("sm:col-start-3");
    expect(wrapper.get("button").classes()).toContain("col-start-2");
    const expectedTime = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" })
      .format(new Date("2026-10-31T23:30:00.123456Z"));
    expect(wrapper.get("time").text()).toBe(expectedTime);
  });

  it("renders changes from historical values without substituting current ratings", () => {
    const wrapper = mountCard(event({ type: "change", previousValue: 8.99, newValue: 9.5 }));
    expect(wrapper.text()).toContain("Cambio");
    expect(wrapper.get("span").classes()).toContain("bg-purple-100");
    const scoreChips = wrapper.find('[role="group"]').findAll("span");
    expect(scoreChips[0]?.text()).toBe("8,99/10");
    expect(scoreChips[0]?.classes()).toContain("bg-emerald-100");
    expect(scoreChips[1]?.text()).toBe("9,5/10");
    expect(scoreChips[1]?.classes()).toContain("bg-green-700");
    expect(wrapper.text()).not.toContain("Cambiaste tu valoración de");
  });

  it("labels incomplete legacy values and events without a disc", () => {
    const unknownPrevious = mountCard(event({ type: "change", previousValue: null, newValue: 9 }));
    expect(unknownPrevious.text()).toContain("Anterior no disponible");
    expect(unknownPrevious.text()).toContain("9/10");
    unknownPrevious.unmount();

    const noDisc = mountCard(event({ type: "set", previousValue: null, newValue: null, disc: null }));
    expect(noDisc.text()).toContain("Disco no disponible");
    expect(noDisc.text()).toContain("Nota no disponible");
    expect(noDisc.get(".tabular-nums").classes()).toContain("bg-gray-100");
    expect(noDisc.find("button").exists()).toBe(false);
  });

  it("opens the full DiscCard from the event id, including incomplete legacy metadata", async () => {
    const wrapper = mountCard(event());
    await wrapper.get("button").trigger("click");
    expect(wrapper.get('[data-test="disc-card-dialog"]').text()).toContain("disc-1");
    expect(wrapper.findComponent(ActivityDiscCardDialogStub).props("discId")).toBe("disc-1");
    await wrapper.findComponent(ActivityDiscCardDialogStub).get("button").trigger("click");
    await nextTick();
    expect(wrapper.find('[data-test="disc-card-dialog"]').exists()).toBe(false);
    expect(wrapper.get("article").text()).toContain("8/10");
    wrapper.unmount();

    const incomplete = mountCard(event({ disc: { id: "disc-2", title: null, artist: null, coverUrl: null, genre: null } }));
    expect(incomplete.find("button").exists()).toBe(true);
  });

  it("prefetches the card on hover and keyboard focus without duplicating its request", async () => {
    getDiscById.mockResolvedValue({ id: "disc-1", name: "Disco precargado" });
    getDiscRates.mockResolvedValue([]);
    const wrapper = mountCard(event());
    const button = wrapper.get("button");

    await button.trigger("mouseenter");
    await button.trigger("focus");
    await flushPromises();

    expect(getDiscById).toHaveBeenCalledTimes(1);
    expect(getDiscRates).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });
});
