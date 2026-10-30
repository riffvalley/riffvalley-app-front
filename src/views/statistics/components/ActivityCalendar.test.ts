// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import type { StatisticsDailyActivity } from "@/modules/statistics/types/statistics";
import ActivityCalendar from "./ActivityCalendar.vue";

const disc = (overrides: Partial<StatisticsDailyActivity["discs"][number]> = {}) => ({
  discId: "disc-1", title: "Blue Weekend", artist: "Wolf Alice", rate: 9, date: "2026-03-12", ...overrides,
});
const activeDay: StatisticsDailyActivity = {
  date: "2026-03-12", activityCount: 2,
  discs: [disc(), disc({ discId: "disc-2", title: "Another Record", artist: null, rate: null })],
};
const wrappers: ReturnType<typeof mount>[] = [];

function mountCalendar(activity = [activeDay]) {
  const wrapper = mount(ActivityCalendar, { props: { year: 2026, activity, annualActivityCount: 3 }, attachTo: document.body });
  wrappers.push(wrapper);
  return wrapper;
}

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  document.body.innerHTML = "";
});

describe("ActivityCalendar", () => {
  it("shows a bounded hover tooltip with only the date and distinct-disc count", async () => {
    const wrapper = mountCalendar();
    const day = wrapper.get('button[aria-label^="12 de marzo de 2026"]');
    await day.trigger("mouseenter", { clientX: 20, clientY: 20 });

    const tooltip = document.body.querySelector('[role="tooltip"]');
    expect(tooltip?.textContent).toContain("12 de marzo de 2026");
    expect(tooltip?.textContent).toContain("2 discos con actividad ese día");
    expect(tooltip?.textContent).not.toContain("Blue Weekend");
    expect(tooltip?.textContent).not.toContain("Another Record");
    expect(tooltip?.textContent).not.toContain("Puntuación");
    expect(tooltip?.querySelector("ul")).toBeNull();
    expect((tooltip as HTMLElement).style.left).not.toContain("NaN");
    expect(wrapper.find("details").exists()).toBe(false);
    expect(wrapper.find("summary").exists()).toBe(false);
  });

  it("opens on tap/click and closes with Escape while restoring focus to the day", async () => {
    const wrapper = mountCalendar();
    const day = wrapper.get('button[aria-label^="12 de marzo de 2026"]');
    await day.trigger("click", { clientX: 30, clientY: 30 });

    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain("2 discos con actividad ese día");
    expect(dialog?.textContent).not.toContain("Blue Weekend");
    expect(dialog?.querySelectorAll("li")).toHaveLength(0);
    expect(document.activeElement).toBe(dialog?.querySelector("button"));
    expect(day.attributes("aria-expanded")).toBe("true");

    const closeButton = document.body.querySelector('[aria-label="Cerrar detalle del día"]');
    expect(closeButton).not.toBeNull();
    closeButton?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await nextTick();
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(day.element);
  });

  it("offers a single calendar tab stop with arrow navigation and a semantic hidden day index", async () => {
    const wrapper = mountCalendar();
    const tabStops = wrapper.findAll('button[role="gridcell"][tabindex="0"]');
    expect(tabStops).toHaveLength(1);
    expect(tabStops[0]?.attributes("aria-label")).toContain("2 discos con actividad");
    expect(wrapper.get('[role="grid"]').attributes("aria-label")).toContain("Usa las flechas");
    expect(wrapper.find('ol[aria-label^="Días activos"]').exists()).toBe(true);

    await tabStops[0]?.trigger("keydown", { key: "ArrowDown" });
    expect(document.activeElement).toBe(wrapper.get('button[aria-label^="13 de marzo de 2026"]').element);
  });

  it("keeps the row height and fills the viewport width with square, responsive cells", () => {
    const wrapper = mountCalendar();
    const grid = wrapper.get('[role="grid"]');
    const day = wrapper.get('button[role="gridcell"]');
    expect(wrapper.get(".w-full.min-w-0.pb-2").exists()).toBe(true);
    expect(grid.attributes("style")).toContain("repeat(7, 12px)");
    const dayStyle = day.attributes("style");
    const width = Number(dayStyle?.match(/width: ([\d.]+)px/)?.[1]);
    const height = Number(dayStyle?.match(/height: ([\d.]+)px/)?.[1]);
    expect(width).toBe(height);
    expect(width).toBeLessThanOrEqual(16);
    expect(grid.attributes("style")).toContain("minmax(0, 1fr)");
    expect(wrapper.get(".mb-3.flex > .grid").attributes("style")).toContain("minmax(0, 1fr)");
    expect(wrapper.get(".mx-auto.w-full.min-w-0.pb-2").exists()).toBe(true);
    expect(wrapper.find(".mb-3.flex").exists()).toBe(true);
    expect(wrapper.find(".overflow-x-auto").exists()).toBe(false);
  });

  it("leaves inactive days blank and offsets weekday labels to the left", () => {
    const wrapper = mountCalendar();
    const inactiveDay = wrapper.get('button[aria-label^="1 de enero de 2026"]');
    const activeDayButton = wrapper.get('button[aria-label^="12 de marzo de 2026"]');

    expect(inactiveDay.attributes("style")).toContain("transparent");
    expect(inactiveDay.classes()).not.toContain("ring-1");
    expect(activeDayButton.classes()).toContain("ring-1");
    expect(wrapper.get('[aria-hidden="true"].relative.-left-2').exists()).toBe(true);
    expect(wrapper.text()).toContain("Sin actividad");
  });

  it("uses the literal civil date when showing a day detail", async () => {
    const wrapper = mountCalendar([{ ...activeDay, date: "2026-01-01", discs: [disc({ date: "2026-01-01" })], activityCount: 1 }]);
    await wrapper.get('button[aria-label^="1 de enero de 2026"]').trigger("click");
    expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain("1 de enero de 2026");
  });

  it("closes a pinned day and resets roving focus when the selected year changes", async () => {
    const wrapper = mountCalendar();
    await wrapper.get('button[aria-label^="12 de marzo de 2026"]').trigger("click");
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();

    await wrapper.setProps({
      year: 2025,
      activity: [{ ...activeDay, date: "2025-03-12", discs: [disc({ date: "2025-03-12" })], activityCount: 1 }],
    });

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    expect(wrapper.get('button[aria-label^="12 de marzo de 2025"]').attributes("tabindex")).toBe("0");
  });
});
