// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import ActivityInactivityFilters from "./ActivityInactivityFilters.vue";

describe("ActivityInactivityFilters", () => {
  it("associates every visible filter label with its native control", () => {
    const wrapper = mount(ActivityInactivityFilters, {
      props: {
        asOf: "2026-10-24",
        role: "",
        isActive: "",
        sortBy: "daysSinceLastVote",
        sortOrder: "desc",
      },
    });

    const labels = wrapper.findAll("label");
    expect(labels).toHaveLength(5);
    for (const label of labels) {
      const controlId = label.attributes("for");
      expect(controlId).toBeTruthy();
      expect(wrapper.find(`#${controlId}`).exists()).toBe(true);
    }
  });
});
