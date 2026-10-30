// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import type { ActivityDateFilter } from "../../application/activityDateFilter";
import ActivityDateFilterComponent from "./ActivityDateFilter.vue";

describe("ActivityDateFilter", () => {
  it("starts with all dates and switches to a concrete day only after a valid selection", async () => {
    const wrapper = mount(ActivityDateFilterComponent, {
      props: { modelValue: { mode: "all" }, timeZone: "Europe/Madrid" },
    });
    expect(wrapper.text()).toContain("Todas las fechas");
    const dayButton = wrapper.findAll("button").find((button) => button.text() === "Día concreto");
    await dayButton?.trigger("click");
    await wrapper.get("#activity-date-day").setValue("2026-10-29");
    await wrapper.get("#activity-date-day").trigger("change");
    expect(wrapper.emitted("update:modelValue")?.at(-1)?.[0]).toEqual({ mode: "day", date: "2026-10-29" });
    wrapper.unmount();
  });

  it("requires both valid ordered dates for an interval and can clear the applied filter", async () => {
    const active: ActivityDateFilter = { mode: "range", from: "2026-10-01", to: "2026-10-31" };
    const wrapper = mount(ActivityDateFilterComponent, {
      props: { modelValue: active, timeZone: "Europe/Madrid" },
    });
    expect((wrapper.get("#activity-date-from").element as HTMLInputElement).value).toBe("2026-10-01");
    expect((wrapper.get("#activity-date-to").element as HTMLInputElement).value).toBe("2026-10-31");
    await wrapper.get("#activity-date-from").setValue("2026-11-02");
    await wrapper.get("#activity-date-to").setValue("2026-11-01");
    expect(wrapper.get('button[type="submit"]').attributes("disabled")).toBeDefined();
    expect(wrapper.text()).toContain("La fecha inicial debe ser anterior o igual a la final.");
    await wrapper.get(".clear-button").trigger("click");
    expect(wrapper.emitted("update:modelValue")?.at(-1)?.[0]).toEqual({ mode: "all" });
    wrapper.unmount();
  });

  it("does not apply an incomplete interval and applies a complete one", async () => {
    const wrapper = mount(ActivityDateFilterComponent, {
      props: { modelValue: { mode: "all" }, timeZone: "Europe/Madrid" },
    });
    const rangeButton = wrapper.findAll("button").find((button) => button.text() === "Intervalo");
    await rangeButton?.trigger("click");
    expect(wrapper.get('button[type="submit"]').attributes("disabled")).toBeDefined();
    await wrapper.get("#activity-date-from").setValue("2026-10-01");
    expect(wrapper.get('button[type="submit"]').attributes("disabled")).toBeDefined();
    await wrapper.get("#activity-date-to").setValue("2026-10-31");
    await wrapper.get("form").trigger("submit");
    expect(wrapper.emitted("update:modelValue")?.at(-1)?.[0]).toEqual({
      mode: "range", from: "2026-10-01", to: "2026-10-31",
    });
    wrapper.unmount();
  });
});
