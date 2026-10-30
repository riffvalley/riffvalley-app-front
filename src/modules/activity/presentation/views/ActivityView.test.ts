// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ActivityView from "./ActivityView.vue";

describe("ActivityView", () => {
  it("composes the activity timeline under the page heading", () => {
    const wrapper = mount(ActivityView, {
      global: { stubs: { ActivityTimeline: { template: "<div data-test=\"activity-timeline\" />" } } },
    });

    expect(wrapper.get("h1").text()).toBe("Actividad");
    expect(wrapper.text()).toContain("Consulta el historial de tus valoraciones");
    expect(wrapper.find('[data-test="activity-timeline"]').exists()).toBe(true);
    expect(wrapper.findAll("article")).toHaveLength(0);
  });
});
