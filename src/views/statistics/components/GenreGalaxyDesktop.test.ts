// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import GenreGalaxyDesktop from "./GenreGalaxyDesktop.vue";

const disc = { id: "disc-1", name: "Record", rate: 8, artist: null, genre: null };

describe("GenreGalaxyDesktop", () => {
  afterEach(() => vi.restoreAllMocks());

  it("selects a star on touch without relying on hover", async () => {
    const gradient = { addColorStop: vi.fn() };
    const context = {
      save: vi.fn(), scale: vi.fn(), createRadialGradient: vi.fn(() => gradient), fillRect: vi.fn(),
      beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn(), stroke: vi.fn(), restore: vi.fn(),
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "setPointerCapture").mockImplementation(() => {});
    const wrapper = mount(GenreGalaxyDesktop, { props: { discs: [disc], selectedDiscId: null } });
    const canvas = wrapper.get("canvas");
    vi.spyOn(canvas.element, "getBoundingClientRect").mockReturnValue({
      x: 20, y: 30, left: 20, top: 30, right: 20, bottom: 30, width: 0, height: 0, toJSON: () => ({}),
    });

    await canvas.trigger("pointerdown", { pointerId: 1, pointerType: "touch", button: 0, buttons: 1, clientX: 20, clientY: 30 });
    await canvas.trigger("pointerup", { pointerId: 1, pointerType: "touch", button: 0, buttons: 0, clientX: 20, clientY: 30 });

    expect(wrapper.emitted("select")).toEqual([["disc-1"]]);
    wrapper.unmount();
  });
});
