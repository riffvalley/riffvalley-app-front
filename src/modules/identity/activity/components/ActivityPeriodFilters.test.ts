// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import ActivityPeriodFilters from "./ActivityPeriodFilters.vue";

describe("ActivityPeriodFilters", () => {
  it("associates each visible date label with its native input", () => {
    const wrapper = mount(ActivityPeriodFilters, {
      props: { modelValue: "custom", from: "2026-10-01", to: "2026-10-24", rangeReversed: false },
    });

    for (const label of wrapper.findAll("label")) {
      const controlId = label.attributes("for");
      expect(controlId).toBeTruthy();
      expect(wrapper.find(`#${controlId}`).exists()).toBe(true);
      expect(label.text()).toContain(controlId.endsWith("from") ? "Desde" : "Hasta");
    }
  });
});
