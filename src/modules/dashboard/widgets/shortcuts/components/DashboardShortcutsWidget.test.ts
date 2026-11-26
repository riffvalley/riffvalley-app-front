// @vitest-environment happy-dom
import { mount, RouterLinkStub } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DashboardShortcutsWidget from "./DashboardShortcutsWidget.vue";

describe("DashboardShortcutsWidget", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Jueves 26 de noviembre de 2026.
    vi.setSystemTime(new Date(2026, 10, 26, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function mountWidget() {
    return mount(DashboardShortcutsWidget, { global: { stubs: { RouterLink: RouterLinkStub } } });
  }

  it("links to the disc list with the current week and month preloaded", () => {
    const links = mountWidget().findAllComponents(RouterLinkStub);

    expect(links.map((link) => link.props("to"))).toEqual([
      { name: "DiscList", query: { periodo: "semana" } },
      { name: "DiscList", query: { periodo: "mes" } },
    ]);
  });

  it("shows which dates each shortcut covers", () => {
    const wrapper = mountWidget();

    expect(wrapper.get('[data-test="shortcut-semana"]').text()).toContain("Novedades de la semana");
    expect(wrapper.get('[data-test="shortcut-semana"]').text()).toContain("Del 20 nov al 26 nov");
    expect(wrapper.get('[data-test="shortcut-mes"]').text()).toContain("Noviembre 2026");
  });
});
