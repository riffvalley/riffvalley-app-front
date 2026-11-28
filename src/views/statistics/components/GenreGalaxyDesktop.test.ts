// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import GenreGalaxyDesktop from "./GenreGalaxyDesktop.vue";

const disc = { id: "disc-1", name: "Record", rate: 8, artist: null, genre: null };

describe("GenreGalaxyDesktop", () => {
  afterEach(() => vi.restoreAllMocks());

  function mockCanvas() {
    const gradient = { addColorStop: vi.fn() };
    const context = {
      save: vi.fn(), scale: vi.fn(), createRadialGradient: vi.fn(() => gradient), fillRect: vi.fn(),
      beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn(), stroke: vi.fn(), restore: vi.fn(),
      moveTo: vi.fn(), lineTo: vi.fn(), strokeText: vi.fn(), fillText: vi.fn(),
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as unknown as CanvasRenderingContext2D);
    // Sin animación de entrada: las estrellas están en su sitio desde el principio.
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);
    return context;
  }

  it("shows the main genres and expands the rest of the legend on demand", async () => {
    mockCanvas();
    const discs = Array.from({ length: 10 }, (_, index) => ({
      id: `disc-${index}`, name: `Disco ${index}`, rate: 7, artist: null,
      genre: { name: `Género ${index}`, color: "#ff0000" },
    }));
    const wrapper = mount(GenreGalaxyDesktop, { props: { discs, selectedDiscId: null } as never });
    const legend = () => wrapper.get('[role="group"][aria-label="Resaltar un género en la galaxia"]');
    const toggle = () => legend().findAll("button").at(-1)!;

    // «Todos» + 7 géneros + botón para desplegar los 3 restantes.
    expect(legend().findAll("button")).toHaveLength(9);
    expect(toggle().text()).toBe("+3 géneros");
    expect(toggle().attributes("aria-expanded")).toBe("false");

    await toggle().trigger("click");
    expect(legend().findAll("button")).toHaveLength(12);
    expect(toggle().text()).toBe("Ver menos");
    expect(toggle().attributes("aria-expanded")).toBe("true");
    wrapper.unmount();
  });

  it("shows a tooltip with the disc data when hovering a star with the mouse", async () => {
    mockCanvas();
    const wrapper = mount(GenreGalaxyDesktop, {
      props: { discs: [{ ...disc, artist: { name: "Banda" } }], selectedDiscId: null } as never,
    });
    vi.spyOn(wrapper.get(".galaxy-stage").element, "clientWidth", "get").mockReturnValue(400);
    const canvas = wrapper.get("canvas");
    vi.spyOn(canvas.element, "getBoundingClientRect").mockReturnValue({
      x: 20, y: 30, left: 20, top: 30, right: 20, bottom: 30, width: 0, height: 0, toJSON: () => ({}),
    });

    await canvas.trigger("pointermove", { pointerId: 1, pointerType: "mouse", buttons: 0, clientX: 20, clientY: 30 });
    expect(wrapper.get('[data-test="galaxy-tooltip"]').text()).toContain("Record");
    expect(wrapper.get('[data-test="galaxy-tooltip"]').text()).toContain("Banda");

    await canvas.trigger("pointerleave");
    expect(wrapper.find('[data-test="galaxy-tooltip"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("lists genres in a legend and highlights one at a time", async () => {
    mockCanvas();
    const discs = [
      disc,
      { id: "disc-2", name: "Otro", rate: 9.5, artist: null, genre: { name: "Metal", color: "#ff0000" } },
      { id: "disc-3", name: "Más", rate: 7, artist: null, genre: { name: "Metal", color: "#ff0000" } },
    ];
    const wrapper = mount(GenreGalaxyDesktop, { props: { discs, selectedDiscId: null } as never });
    const chips = wrapper.get('[role="group"][aria-label="Resaltar un género en la galaxia"]').findAll("button");

    expect(chips.map((chip) => chip.text())).toEqual(["Todos 3", "Metal 2", "Sin género 1"]);
    expect(chips[0]!.attributes("aria-pressed")).toBe("true");
    await chips[1]!.trigger("click");
    expect(chips[1]!.attributes("aria-pressed")).toBe("true");
    expect(chips[0]!.attributes("aria-pressed")).toBe("false");
    await chips[1]!.trigger("click");
    expect(chips[0]!.attributes("aria-pressed")).toBe("true");
    wrapper.unmount();
  });

  it("selects a star on touch without relying on hover", async () => {
    mockCanvas();
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
