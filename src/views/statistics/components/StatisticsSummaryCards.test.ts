// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import type { StatisticsSummary } from "@/modules/statistics/types/statistics";
import StatisticsSummaryCards from "./StatisticsSummaryCards.vue";

const makeSummary = (standardDeviation: number | null): StatisticsSummary => ({
  year: 2026,
  timeZone: "Europe/Madrid",
  activityBasis: "set_events",
  activityCoverage: "complete",
  activityCount: 13,
  scoredDiscs: 4,
  mean: 7.5,
  median: 8,
  standardDeviation,
  activityByGenre: [{ genre: "Rock", activityCount: 2, topDisc: null }],
  activityByMonth: [{ month: "2026-01", activityCount: 2, topDisc: null }],
  scoreDistribution: [{ score: 7, scoredDiscCount: 2 }],
  topDiscOverall: null,
  mostControversial: [],
  activityByDay: [{
    date: "2026-01-02",
    activityCount: 1,
    discs: [{ discId: "disc-1", title: "Album", artist: null, rate: null, date: "2026-01-02" }],
  }],
  activityWithoutGenre: 0,
});

describe("StatisticsSummaryCards", () => {
  it("shows exactly the four agreed metrics and formats numeric values with two decimals", () => {
    const wrapper = mount(StatisticsSummaryCards, { props: { summary: makeSummary(null) } });
    const summary = wrapper.get('[aria-label="Resumen anual"]');

    expect(summary.findAll("article")).toHaveLength(4);
    expect(summary.text()).toContain("Discos puntuados");
    expect(summary.text()).toContain("Nota media");
    expect(summary.text()).toContain("Mediana");
    expect(summary.text()).toContain("Desviación típica");
    expect(summary.text()).not.toContain("Actividad anual");
    expect(summary.text()).toContain("7,50");
    expect(summary.text()).toContain("8,00");
    expect(summary.text()).toContain("Sin datos para clasificar");
  });

  it.each([
    [0, "0,00", "Baja", "Tus notas están bastante concentradas"],
    [0.999, "1,00", "Baja", "Tus notas están bastante concentradas"],
    [1, "1,00", "Moderada", "Tus valoraciones muestran cierta variedad"],
    [1.999, "2,00", "Moderada", "Tus valoraciones muestran cierta variedad"],
    [2, "2,00", "Alta", "Hay grandes diferencias entre tus puntuaciones"],
  ])("classifies %s using the received value and shows its rounded value", (value, formatted, label, description) => {
    const wrapper = mount(StatisticsSummaryCards, { props: { summary: makeSummary(value as number) } });
    const deviationCard = wrapper.findAll("article")[3];

    expect(deviationCard.text()).toContain(formatted as string);
    expect(deviationCard.text()).toContain(label as string);
    expect(deviationCard.text()).toContain(description as string);
  });

  it("reveals the explanation from an accessible button interaction", async () => {
    const wrapper = mount(StatisticsSummaryCards, { props: { summary: makeSummary(1.2) } });
    const button = wrapper.get('button[aria-controls="deviation-help"]');

    expect(button.attributes("aria-expanded")).toBe("false");
    expect((wrapper.get("#deviation-help").element as HTMLElement).style.display).toBe("none");
    expect(button.classes().join(" ")).toContain("focus-visible:outline");
    await button.trigger("click");

    expect(button.attributes("aria-expanded")).toBe("true");
    expect(wrapper.get("#deviation-help").text()).toContain(
      "Mide cuánto se alejan tus puntuaciones de tu nota media. Se calcula con las notas vigentes de los discos incluidos en las estadísticas del año. Cuanto menor es, más parecidas son tus notas.",
    );
    expect(wrapper.get("#deviation-help").text()).toContain("criterios orientativos de Riff Valley, no categorías universales");
  });
});
