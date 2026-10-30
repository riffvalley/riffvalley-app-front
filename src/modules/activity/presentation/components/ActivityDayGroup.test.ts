// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import type { ActivityDayGroup as ActivityDayGroupModel } from "../../application/groupActivityEvents";
import ActivityDayGroup from "./ActivityDayGroup.vue";

function group(): ActivityDayGroupModel {
  return {
    dateKey: "2026-10-29",
    dateLabel: "29 de octubre de 2026",
    events: [],
  };
}

describe("ActivityDayGroup", () => {
  it("shows one vote in singular", () => {
    const wrapper = mount(ActivityDayGroup, { props: { group: group(), dailySetCount: 1 } });
    expect(wrapper.text()).toContain("29 de octubre de 2026");
    expect(wrapper.text()).toContain("1 voto");
  });

  it("shows a multiple-vote total in plural", () => {
    const wrapper = mount(ActivityDayGroup, { props: { group: group(), dailySetCount: 35 } });
    expect(wrapper.text()).toContain("35 votos");
  });

  it("shows zero only when the backend supplied zero", () => {
    const wrapper = mount(ActivityDayGroup, { props: { group: group(), dailySetCount: 0 } });
    expect(wrapper.text()).toContain("0 votos");
  });

  it("omits the total when no backend counter is available", () => {
    const wrapper = mount(ActivityDayGroup, { props: { group: group() } });
    expect(wrapper.text()).toContain("29 de octubre de 2026");
    expect(wrapper.text()).not.toMatch(/\d+ votos?/);
  });
});
