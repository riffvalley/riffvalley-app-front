// @vitest-environment happy-dom
import { flushPromises, mount, RouterLinkStub } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DashboardShortcutsWidget from "./DashboardShortcutsWidget.vue";

const { getDiscListPage } = vi.hoisted(() => ({ getDiscListPage: vi.fn() }));
vi.mock("@/modules/catalog/discs/api/discList", () => ({ getDiscListPage }));
vi.mock("@/modules/identity/auth", () => ({ useAuthStore: () => ({ userId: "user-1" }) }));
vi.mock("@/modules/catalog/calendar", () => ({
  TodayReleasesModal: {
    name: "TodayReleasesModal",
    emits: ["close", "count-changed"],
    template: '<div data-test="today-modal"></div>',
  },
}));

describe("DashboardShortcutsWidget", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Jueves 26 de noviembre de 2026.
    vi.setSystemTime(new Date(2026, 10, 26, 12));
    getDiscListPage.mockReset();
    getDiscListPage.mockResolvedValue({ data: [], totalItems: 3, totalPages: 3, currentPage: 1, limit: 1 });
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  function mountWidget() {
    return mount(DashboardShortcutsWidget, { global: { stubs: { RouterLink: RouterLinkStub } } });
  }

  it("links to this week, this month and the pending list", async () => {
    const wrapper = mountWidget();
    await flushPromises();

    expect(wrapper.findAllComponents(RouterLinkStub).map((link) => link.props("to"))).toEqual([
      { name: "DiscList", query: { periodo: "semana" } },
      { name: "DiscList", query: { periodo: "mes" } },
      { name: "DiscList", query: { vista: "pendientes" } },
    ]);
  });

  it("shows which dates each shortcut covers and how many discs come out today", async () => {
    const wrapper = mountWidget();
    await flushPromises();

    expect(wrapper.get('[data-test="shortcut-hoy"]').text()).toContain("3 discos · 26 nov");
    expect(wrapper.get('[data-test="shortcut-semana"]').text()).toContain("Del 20 nov al 26 nov");
    expect(wrapper.get('[data-test="shortcut-mes"]').text()).toContain("Noviembre 2026");
    expect(wrapper.get('[data-test="shortcut-pendientes"]').text()).toContain("Mis pendientes");
    expect(wrapper.get('[data-test="shortcut-semana"]').text()).toContain("Mis novedades de la semana");
    expect(wrapper.get('[data-test="shortcut-mes"]').text()).toContain("Mis novedades del mes");
  });

  it("counts all of today's discs, ignoring the genre and country filters remembered in Discos", async () => {
    sessionStorage.setItem(
      "rv_disc_list_filters:user-1",
      JSON.stringify({ week: null, genreIds: ["g-1"], countryId: "es", noRatesOnly: false }),
    );
    mountWidget();
    await flushPromises();

    expect(getDiscListPage).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "all",
        dateRange: ["2026-11-26T00:00:00.000Z", "2026-11-26T23:59:59.999Z"],
        genreIds: [],
        countryId: "",
        limit: 1,
      }),
    );
  });

  it("says there is nothing new today instead of linking to an empty list", async () => {
    getDiscListPage.mockResolvedValue({ data: [], totalItems: 0, totalPages: 0, currentPage: 1, limit: 1 });
    const wrapper = mountWidget();
    await flushPromises();

    const today = wrapper.get('[data-test="shortcut-hoy"]');
    expect(today.text()).toContain("Hoy no ha salido nada nuevo");
    expect(today.element.tagName).toBe("DIV");
    expect(wrapper.find('[data-test="today-modal"]').exists()).toBe(false);
  });

  it("opens today's releases in a modal and keeps the count in sync with it", async () => {
    const wrapper = mountWidget();
    await flushPromises();

    const today = wrapper.get('[data-test="shortcut-hoy"]');
    expect(today.element.tagName).toBe("BUTTON");
    expect(today.attributes("aria-haspopup")).toBe("dialog");
    await today.trigger("click");

    const modal = wrapper.findComponent({ name: "TodayReleasesModal" });
    expect(modal.exists()).toBe(true);
    modal.vm.$emit("count-changed", 1);
    await flushPromises();
    expect(wrapper.get('[data-test="shortcut-hoy"]').text()).toContain("1 disco · 26 nov");

    modal.vm.$emit("close");
    await flushPromises();
    expect(wrapper.findComponent({ name: "TodayReleasesModal" }).exists()).toBe(false);
  });

  it("keeps the today shortcut usable when the count cannot be loaded", async () => {
    getDiscListPage.mockRejectedValue(new Error("offline"));
    const wrapper = mountWidget();
    await flushPromises();

    expect(wrapper.get('[data-test="shortcut-hoy"]').text()).toContain("Lanzamientos del 26 nov");
    expect(wrapper.get('[data-test="shortcut-hoy"]').element.tagName).toBe("BUTTON");
  });
});
