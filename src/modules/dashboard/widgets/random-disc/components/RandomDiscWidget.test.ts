// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dashboardWidgetDefaults } from "@/app/dashboardWidgetRegistry";

const { getDiscs, getRandomDiscs } = vi.hoisted(() => ({
  getDiscs: vi.fn(),
  getRandomDiscs: vi.fn(),
}));

vi.mock("@services/discs/discs", () => ({ getDiscs, getRandomDiscs }));
vi.mock("@components/DiscCardComponent.vue", () => ({
  default: {
    name: "DiscCard",
    props: ["id", "name", "artistName", "link", "genreName", "rateCount"],
    template: '<a data-test="disc-card" :href="link">{{ artistName }} — {{ name }}</a>',
  },
}));

import type { Disc, DiscsResponse } from "@services/discs/discs";
import DashboardWidgetGrid from "../../../components/DashboardWidgetGrid.vue";
import RandomDiscWidget from "./RandomDiscWidget.vue";

const firstDisc = (id = "disc-1"): Disc => ({
  id,
  name: "Album de prueba",
  description: "Descripción",
  image: "https://images.test/cover.jpg",
  releaseDate: "2020-01-01",
  artist: {
    id: "artist-1",
    name: "Artista de prueba",
    description: "",
    image: "",
    country: { id: "country-1", name: "España" },
  },
  verified: true,
  EP: false,
  ep: false,
  debut: false,
  link: `https://riffvalley.es/disc/${id}`,
  genre: { id: "genre-1", name: "Rock", color: "#123456" },
  averageRate: 7.5,
  averageCover: 8,
  voteCount: 6,
  commentCount: 2,
  userRate: null,
});

const freeResponse = (disc = firstDisc()): DiscsResponse => ({
  totalItems: 4,
  totalPages: 4,
  currentPage: 1,
  limit: 1,
  data: [disc],
});

function mountWidget() {
  return mount(RandomDiscWidget);
}

describe("RandomDiscWidget", () => {
  beforeEach(() => {
    getDiscs.mockReset().mockResolvedValue(freeResponse());
    getRandomDiscs.mockReset().mockResolvedValue([firstDisc()]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts in Libre without making a request and keeps the dice interaction", async () => {
    vi.useFakeTimers();
    const wrapper = mountWidget();
    const baselineTimerCount = vi.getTimerCount();

    expect(wrapper.get('[aria-pressed="true"]').text()).toBe("Libre");
    expect(
      wrapper
        .get('[role="group"][aria-label="Modo de selección del disco"]')
        .findAll("button")
        .map((button) => button.get("img").attributes("src"))
    ).toEqual(["/doomguy/5.png", "/doomguy/1.png", "/doomguy/3.png", "/doomguy/42.png"]);
    expect(wrapper.get('[data-test="random-disc-description"]').text()).toContain(
      "Cualquier disco que aún no hayas votado"
    );
    expect(getDiscs).not.toHaveBeenCalled();
    expect(getRandomDiscs).not.toHaveBeenCalled();
    expect(wrapper.get('[data-test="roll-dice"]').text()).toContain("Tira los dados");

    await wrapper.get('[data-test="roll-dice"]').trigger("mouseenter");
    expect(wrapper.find(".dice-wobble").exists()).toBe(true);
    await wrapper.get('[data-test="roll-dice"]').trigger("mouseleave");
    expect(wrapper.find(".dice-wobble").exists()).toBe(false);
    await wrapper.get('[data-test="roll-dice"]').trigger("focus");
    expect(wrapper.find(".dice-wobble").exists()).toBe(true);
    await wrapper.get('[data-test="roll-dice"]').trigger("blur");
    expect(wrapper.find(".dice-wobble").exists()).toBe(false);
    await wrapper.get('[data-test="roll-dice"]').trigger("mouseenter");
    expect(vi.getTimerCount()).toBe(baselineTimerCount + 1);
    wrapper.unmount();
    expect(vi.getTimerCount()).toBe(baselineTimerCount);
  });

  it("uses the existing voted=false filter in Libre and displays the selected disc and link", async () => {
    const wrapper = mountWidget();

    await wrapper.get('[data-test="roll-dice"]').trigger("click");
    await flushPromises();

    expect(getDiscs).toHaveBeenCalledTimes(2);
    for (const call of getDiscs.mock.calls) {
      expect(call.slice(0, 9)).toEqual([
        1,
        expect.any(Number),
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        false,
        undefined,
      ]);
      expect(call[9]).toBeInstanceOf(AbortSignal);
    }
    expect(getRandomDiscs).not.toHaveBeenCalled();
    expect(wrapper.get('[data-test="disc-card"]').attributes("href")).toBe(
      "https://riffvalley.es/disc/disc-1"
    );
    expect(wrapper.text()).toContain("Artista de prueba");
    expect(wrapper.get('[data-test="random-disc-result-phrase"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it.each([
    ["Fácil", "easy"],
    ["Normal", "normal"],
    ["Difícil", "hard"],
  ] as const)("makes one difficulty request for %s", async (label, difficulty) => {
    const wrapper = mountWidget();

    await wrapper.get(`button`).trigger("click");
    const modeButton = wrapper.findAll("button").find((button) => button.text() === label);
    expect(modeButton).toBeDefined();
    await modeButton!.trigger("click");
    expect(getDiscs).not.toHaveBeenCalled();
    expect(getRandomDiscs).not.toHaveBeenCalled();

    await wrapper.get('[data-test="roll-dice"]').trigger("click");
    await flushPromises();

    expect(getRandomDiscs).toHaveBeenCalledOnce();
    expect(getRandomDiscs).toHaveBeenCalledWith(
      { difficulty, limit: 1 },
      { signal: expect.any(AbortSignal) }
    );
    expect(getDiscs).not.toHaveBeenCalled();
    expect(wrapper.get('[data-test="disc-card"]').exists()).toBe(true);
    expect(wrapper.findComponent({ name: "DiscCard" }).props("id")).toBe("disc-1");
    wrapper.unmount();
  });

  it("sends the previous result for the same difficulty and updates it after a successful roll", async () => {
    getRandomDiscs
      .mockResolvedValueOnce([firstDisc("disc-1")])
      .mockResolvedValueOnce([firstDisc("disc-2")]);
    const wrapper = mountWidget();

    await wrapper.get("button").trigger("click");
    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Fácil")!
      .trigger("click");
    await wrapper.get('[data-test="roll-dice"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-test="roll-dice"]').trigger("click");
    await flushPromises();

    expect(getRandomDiscs).toHaveBeenNthCalledWith(
      2,
      { difficulty: "easy", limit: 1, previousDiscId: "disc-1" },
      { signal: expect.any(AbortSignal) }
    );
    expect(wrapper.get('[data-test="disc-card"]').attributes("href")).toContain("disc-2");
    wrapper.unmount();
  });

  it("shows a specific empty result and allows another roll", async () => {
    getRandomDiscs.mockResolvedValueOnce([]).mockResolvedValueOnce([firstDisc()]);
    const wrapper = mountWidget();
    await wrapper.get("button").trigger("click");
    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Normal")!
      .trigger("click");
    await wrapper.get('[data-test="roll-dice"]').trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-test="random-disc-empty"]').text()).toBe(
      "No hay discos disponibles para esta dificultad."
    );
    expect(wrapper.get('[data-test="roll-dice"]').text()).toContain("Intentar de nuevo");
    await wrapper.get('[data-test="roll-dice"]').trigger("click");
    await flushPromises();
    expect(getRandomDiscs).toHaveBeenCalledTimes(2);
    expect(wrapper.get('[data-test="disc-card"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("shows request errors and permits retry without treating them as empty", async () => {
    getRandomDiscs
      .mockRejectedValueOnce(new Error("server error"))
      .mockResolvedValueOnce([firstDisc()]);
    const wrapper = mountWidget();
    await wrapper.get("button").trigger("click");
    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Difícil")!
      .trigger("click");
    await wrapper.get('[data-test="roll-dice"]').trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-test="random-disc-error"]').text()).toContain("No se pudo obtener");
    expect(wrapper.find('[data-test="random-disc-empty"]').exists()).toBe(false);
    await wrapper.get('[data-test="roll-dice"]').trigger("click");
    await flushPromises();
    expect(getRandomDiscs).toHaveBeenCalledTimes(2);
    expect(wrapper.get('[data-test="disc-card"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("explains when Catalog returns a disc without its required ID", async () => {
    getRandomDiscs.mockResolvedValueOnce([{ ...firstDisc(), id: "" }]);
    const wrapper = mountWidget();
    await wrapper.get("button").trigger("click");
    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Fácil")!
      .trigger("click");
    await wrapper.get('[data-test="roll-dice"]').trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-test="random-disc-error"]').text()).toContain(
      "Catalog no incluyó el identificador del disco"
    );
    expect(wrapper.find('[data-test="disc-card"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("guards double rolls while a request is pending and animates until it settles", async () => {
    let resolveRequest: ((discs: Disc[]) => void) | undefined;
    getRandomDiscs.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        })
    );
    vi.useFakeTimers();
    const wrapper = mountWidget();
    await wrapper.get("button").trigger("click");
    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Fácil")!
      .trigger("click");

    await wrapper.get('[data-test="roll-dice"]').trigger("click");
    const rollButton = wrapper.get('[data-test="roll-dice"]');
    await rollButton.trigger("click");
    expect(getRandomDiscs).toHaveBeenCalledOnce();
    expect(rollButton.attributes("disabled")).toBeDefined();
    expect(rollButton.text()).toContain("Lanzando");
    await vi.advanceTimersByTimeAsync(80);
    expect(
      rollButton
        .find("i")
        .classes()
        .some((className) => className.startsWith("fa-dice-"))
    ).toBe(true);

    resolveRequest?.([firstDisc()]);
    await flushPromises();
    vi.useRealTimers();
    wrapper.unmount();
  });

  it("cancels and ignores a request when the mode changes", async () => {
    let resolveRequest: ((discs: Disc[]) => void) | undefined;
    let requestSignal: AbortSignal | undefined;
    getRandomDiscs.mockImplementation((_params, options) => {
      requestSignal = options.signal;
      return new Promise((resolve) => {
        resolveRequest = resolve;
      });
    });
    const wrapper = mountWidget();
    await wrapper.get("button").trigger("click");
    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Normal")!
      .trigger("click");
    await wrapper.get('[data-test="roll-dice"]').trigger("click");

    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Difícil")!
      .trigger("click");
    expect(requestSignal?.aborted).toBe(true);
    resolveRequest?.([firstDisc("stale-disc")]);
    await flushPromises();

    expect(wrapper.find('[data-test="disc-card"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="roll-dice"]').text()).toContain("Tira los dados");
    wrapper.unmount();
  });

  it("aborts a pending request on unmount", async () => {
    vi.useFakeTimers();
    let requestSignal: AbortSignal | undefined;
    getRandomDiscs.mockImplementation((_params, options) => {
      requestSignal = options.signal;
      return new Promise(() => undefined);
    });
    const wrapper = mountWidget();
    await wrapper.get("button").trigger("click");
    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Difícil")!
      .trigger("click");
    await wrapper.get('[data-test="roll-dice"]').trigger("click");
    wrapper.unmount();

    expect(requestSignal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not request while disabled in the existing widget grid", async () => {
    const widget = defineComponent({
      setup: () => () => h(RandomDiscWidget),
    });
    const module = dashboardWidgetDefaults.find(({ id }) => id === "discoAleatorio")!;
    const wrapper = mount(DashboardWidgetGrid, {
      props: { modules: [{ ...module, enabled: false }] },
      slots: { discoAleatorio: () => h(widget) },
    });

    await flushPromises();
    expect(getDiscs).not.toHaveBeenCalled();
    expect(getRandomDiscs).not.toHaveBeenCalled();
    expect(wrapper.find("[data-widget-id='discoAleatorio']").exists()).toBe(false);
    wrapper.unmount();
  });
});
