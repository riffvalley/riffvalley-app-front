// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import StatsModal from "./StatsModal.vue";

describe("StatsModal", () => {
  it("does not show fabricated zeros when its statistics have not been loaded", () => {
    const wrapper = mount(StatsModal, {
      props: { stats: null },
      global: { stubs: { Teleport: true } },
    });

    expect(wrapper.text()).toContain("Las estadísticas detalladas estarán disponibles");
    expect(wrapper.text()).not.toContain("Total de votos:");
    expect(wrapper.text()).not.toContain("Total de discos:");
  });

  it("continues to display statistics when valid details are provided", () => {
    const wrapper = mount(StatsModal, {
      props: {
        stats: { totalDiscs: 12, totalVotes: 34 },
        ratingDistribution: [{ rate: 8, count: 9 }],
      },
      global: { stubs: { Teleport: true, RatingBarChart: true } },
    });

    expect(wrapper.text()).toContain("12");
    expect(wrapper.text()).toContain("34");
    expect(wrapper.text()).not.toContain("estarán disponibles");
  });
});
