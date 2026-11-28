// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TodayReleasesModal from "./TodayReleasesModal.vue";

const { getDiscsDated, auth } = vi.hoisted(() => ({
  getDiscsDated: vi.fn(),
  auth: { role: "user" as string },
}));
vi.mock("@services/discs/discs", () => ({ getDiscsDated }));
vi.mock("@/modules/identity/auth", () => ({ useAuthStore: () => auth }));
vi.mock("@stores/catalog/catalog", () => ({
  useCatalogStore: () => ({ genres: [{ id: "g-1", name: "Rock" }], countries: [] }),
}));
vi.mock("@/composables/usePageScrollLock", () => ({ usePageScrollLock: vi.fn() }));

const DiscStub = (name: string) => ({
  name,
  props: ["disc"],
  emits: ["disc-deleted", "date-changed"],
  template: `<div data-test="${name}">{{ disc.name }}</div>`,
});

describe("TodayReleasesModal", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 26, 12));
    auth.role = "user";
    getDiscsDated.mockReset();
    getDiscsDated.mockResolvedValue({
      data: [
        {
          releaseDate: "2026-11-26T00:00:00.000Z",
          discs: [
            { id: "d-1", name: "Uno", genre: { id: "g-1" }, artist: { name: "A" } },
            { id: "d-2", name: "Dos", genre: null, artist: { name: "B" } },
          ],
        },
      ],
      totalItems: 2,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  function mountModal() {
    return mount(TodayReleasesModal, {
      attachTo: document.body,
      global: {
        stubs: {
          Teleport: true,
          DiscComponent: DiscStub("full-disc"),
          DiscComponentBaby: DiscStub("baby-disc"),
          CalendarDayTools: { template: '<div data-test="day-tools"></div>' },
        },
      },
    });
  }

  it("loads only today's discs and shows them with the baby calendar cards", async () => {
    const wrapper = mountModal();
    await flushPromises();

    expect(getDiscsDated).toHaveBeenCalledWith(200, 0, [
      "2026-11-26T00:00:00.000Z",
      "2026-11-26T23:59:59.999Z",
    ]);
    expect(wrapper.get('[role="dialog"]').attributes("aria-modal")).toBe("true");
    expect(wrapper.text()).toContain("26/11/2026, jueves");
    expect(wrapper.text()).toContain("2 discos");
    expect(wrapper.findAll('[data-test="baby-disc"]')).toHaveLength(2);
    expect(wrapper.find('[data-test="day-tools"]').exists()).toBe(false);
    expect(wrapper.emitted("count-changed")).toEqual([[2]]);
  });

  it("uses the full calendar cards and day tools for high roles", async () => {
    auth.role = "riffvalley";
    const wrapper = mountModal();
    await flushPromises();

    expect(wrapper.findAll('[data-test="full-disc"]')).toHaveLength(2);
    expect(wrapper.find('[data-test="day-tools"]').exists()).toBe(true);
  });

  it("drops a disc that is deleted or moved to another day", async () => {
    auth.role = "superadmin";
    const wrapper = mountModal();
    await flushPromises();

    wrapper.findAllComponents({ name: "full-disc" })[0]!.vm.$emit("date-changed", "d-1", "2026-12-01");
    await flushPromises();

    expect(wrapper.findAll('[data-test="full-disc"]')).toHaveLength(1);
    expect(wrapper.emitted("count-changed")!.at(-1)).toEqual([1]);
  });

  it("says there is nothing new today when the day is empty", async () => {
    getDiscsDated.mockResolvedValue({ data: [], totalItems: 0 });
    const wrapper = mountModal();
    await flushPromises();

    expect(wrapper.get('[data-test="today-releases-empty"]').text()).toContain("Hoy no ha salido nada nuevo");
  });

  it("offers a retry when the day cannot be loaded", async () => {
    getDiscsDated.mockRejectedValueOnce(new Error("offline"));
    const wrapper = mountModal();
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toContain("No se pudieron cargar");
    await wrapper.get('[role="alert"] button').trigger("click");
    await flushPromises();
    expect(wrapper.findAll('[data-test="baby-disc"]')).toHaveLength(2);
  });

  it("closes with Escape and with the close button", async () => {
    const wrapper = mountModal();
    await flushPromises();

    await wrapper.get('[role="dialog"]').trigger("keydown", { key: "Escape" });
    await wrapper.get('button[aria-label="Cerrar novedades de hoy"]').trigger("click");
    expect(wrapper.emitted("close")).toHaveLength(2);
  });
});
