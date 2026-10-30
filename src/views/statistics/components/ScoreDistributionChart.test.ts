// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ScoreDistributionChart from "./ScoreDistributionChart.vue";

describe("ScoreDistributionChart", () => {
  const distribution = [
    { score: 10, scoredDiscCount: 1 }, { score: 8, scoredDiscCount: 0 },
    { score: 0, scoredDiscCount: 1 }, { score: 1, scoredDiscCount: 0 },
    { score: 2, scoredDiscCount: 0 }, { score: 3, scoredDiscCount: 0 },
    { score: 4, scoredDiscCount: 0 }, { score: 5, scoredDiscCount: 0 },
    { score: 6, scoredDiscCount: 0 }, { score: 7, scoredDiscCount: 0 },
    { score: 9, scoredDiscCount: 0 },
  ];

  it("shows all eleven backend buckets in numeric order, including zeros, without changing counts", () => {
    const wrapper = mount(ScoreDistributionChart, {
      props: { scoreDistribution: distribution, scoredDiscs: 2, year: 2026 },
    });
    const rows = wrapper.findAll("ul[aria-label='Discos puntuados por intervalo de nota'] li");

    expect(wrapper.get("h2").text()).toBe("Discos puntuados 2026");
    expect(wrapper.text()).not.toContain("Distribución de puntuaciones");
    expect(wrapper.text()).not.toContain("Discos publicados y puntuados");
    expect(rows).toHaveLength(11);
    expect(rows[0].text()).toContain("0 hasta menos de 1");
    expect(rows[0].text()).toContain("1 disco");
    expect(rows[1].text()).toContain("1 hasta menos de 2");
    expect(rows[1].text()).toContain("0 discos");
    expect(rows[10].text()).toContain("10 exacto");
    expect(rows[0]?.get('[role="img"]').attributes("aria-label")).toBe("0 hasta menos de 1: 1 disco");
    expect(rows[0]?.get('[role="img"]').attributes("tabindex")).toBe("0");
    expect(rows[0]?.get(".score-tooltip").text()).toBe("0 hasta menos de 1 · 1 disco");
    expect(rows[0]?.get('[aria-hidden="true"].relative').attributes("style")).toContain("height: 100%");
    expect(rows[1]?.get('[aria-hidden="true"].relative').attributes("style")).toContain("height: 0%");
    expect(rows[0]?.get('[aria-hidden="true"].relative').classes()).toContain("bg-red-700");
    expect(rows[10]?.get('[aria-hidden="true"].relative').classes()).toContain("bg-green-900");
    expect(wrapper.get("ul").classes()).toEqual(expect.arrayContaining(["grid-cols-3", "sm:grid-cols-6", "xl:grid-cols-11"]));
    expect(wrapper.text()).toContain("Total en los buckets: 2 · Discos puntuados: 2");
    expect(wrapper.text()).not.toContain("% del total");
    expect(wrapper.text()).not.toContain("no ha enviado los once buckets");
  });

  it("keeps received bucket counts visible and reports a mismatch", () => {
    const wrapper = mount(ScoreDistributionChart, {
      props: { scoreDistribution: distribution, scoredDiscs: 8, year: 2026 },
    });
    expect(wrapper.text()).toContain("Total en los buckets: 2 · Discos puntuados: 8");
    expect(wrapper.text()).toContain("se muestran los valores recibidos sin modificarlos");
  });

  it("shows an empty state when no discs have a current score, even with annual activity", () => {
    const wrapper = mount(ScoreDistributionChart, {
      props: { scoreDistribution: [], scoredDiscs: 0, year: 2026 },
    });
    expect(wrapper.get('[role="status"]').text()).toContain("No hay discos con una puntuación vigente");
    expect(wrapper.find("ul").exists()).toBe(false);
    expect(wrapper.findAll('[role="status"]')).toHaveLength(1);
  });

  it("reports inconsistent bucket counts even when scoredDiscs is zero", () => {
    const wrapper = mount(ScoreDistributionChart, {
      props: { scoreDistribution: [{ score: 2, scoredDiscCount: 1 }], scoredDiscs: 0, year: 2026 },
    });
    expect(wrapper.text()).toContain("No hay discos con una puntuación vigente");
    expect(wrapper.text()).toContain("La suma de los buckets no coincide");
    expect(wrapper.findAll("ul li")).toHaveLength(1);
  });

  it("does not invent missing bucket rows when the payload is incomplete", () => {
    const wrapper = mount(ScoreDistributionChart, {
      props: { scoreDistribution: [{ score: 2, scoredDiscCount: 1 }], scoredDiscs: 1, year: 2026 },
    });
    expect(wrapper.findAll("ul li")).toHaveLength(1);
    expect(wrapper.text()).toContain("El backend no ha enviado los once buckets esperados");
  });
});
