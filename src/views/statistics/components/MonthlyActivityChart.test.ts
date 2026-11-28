// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { discCardDialogKey } from "@/composables/discCardDialog";
import type { StatisticsDisc, StatisticsMonthlyActivity } from "@/modules/statistics/types/statistics";
import MonthlyActivityChart from "./MonthlyActivityChart.vue";

const disc = (overrides: Partial<StatisticsDisc> = {}): StatisticsDisc => ({
  id: "disc-1", name: "Moon Music", image: "https://example.test/cover.jpg", rate: 9.5,
  artist: { name: "Example Artist" }, genre: null, ...overrides,
});

function month(month: string, activityCount: number, topDisc: StatisticsDisc | null): StatisticsMonthlyActivity {
  return { month, activityCount, topDisc };
}

describe("MonthlyActivityChart", () => {
  it("opens the votable disc card when the month cover is clicked", async () => {
    const open = vi.fn();
    const activity = [month("2026-01", 1, disc()), month("2026-02", 2, null)];
    const wrapper = mount(MonthlyActivityChart, { props: { year: 2026, activity, annualActivityCount: 3 }, global: { provide: { [discCardDialogKey as symbol]: { isOpen: ref(false), open } } } });

    const covers = wrapper.findAll('[data-test="monthly-disc-open"]');
    expect(covers).toHaveLength(1);
    expect(covers[0]!.attributes("aria-label")).toBe("Abrir tarjeta de Moon Music");
    await covers[0]!.trigger("click");
    expect(open).toHaveBeenCalledWith("disc-1");

    // Sin el host de la ficha, la portada no es un botón.
    expect(mount(MonthlyActivityChart, { props: { year: 2026, activity, annualActivityCount: 3 } }).find("button").exists()).toBe(false);
  });

  it("shows twelve chronological months, zeros, current highlights, nullable covers and nullable artists", async () => {
    const activity = [
      month("2026-12", 3, null),
      month("2026-03", 2, disc({ image: null, artist: null })),
      month("2026-01", 1, disc()),
      month("2025-02", 99, disc({ name: "Previous year" })),
    ];
    const wrapper = mount(MonthlyActivityChart, { props: { year: 2026, activity, annualActivityCount: 6 } });
    const cards = wrapper.findAll("ol > li");

    expect(cards).toHaveLength(12);
    expect(cards[0]?.text()).toContain("Ene");
    expect(cards[0]?.text()).toContain("Moon Music");
    expect(cards[0]?.text()).toContain("Example Artist");
    expect(cards[0]?.text()).toContain("9,5/10");
    expect(cards[0]?.find("img").attributes("src")).toBe("https://example.test/cover.jpg");
    expect(cards[0]?.get('[role="img"]').attributes("aria-label")).toBe("enero: 1 voto");
    expect(cards[0]?.find('[aria-hidden="true"].relative').attributes("style")).toContain("height: 33.33333333333333%");
    expect(cards[1]?.text()).toContain("0");
    expect(cards[1]?.get('[role="img"]').attributes("aria-label")).toBe("febrero: 0 votos");
    expect(cards[1]?.find('[aria-hidden="true"].relative').attributes("style")).toContain("height: 0%");
    expect(cards[2]?.text()).toContain("Artista no disponible");
    expect(cards[2]?.text()).toContain("Portada no disponible");
    expect(cards[3]?.text()).toContain("Sin actividad");
    expect(cards[11]?.text()).toContain("Sin disco destacado disponible");
    expect(wrapper.text()).not.toContain("Previous year");
  });

  it("keeps activity-zero months visible without inventing a highlight and reacts to year changes", async () => {
    const wrapper = mount(MonthlyActivityChart, { props: { year: 2025, activity: [month("2025-06", 0, null)], annualActivityCount: 0 } });
    expect(wrapper.findAll("ol > li")).toHaveLength(12);
    expect(wrapper.text()).toContain("Sin actividad");
    expect(wrapper.text()).not.toContain("Moon Music");

    await wrapper.setProps({ year: 2026 });
    expect(wrapper.get("h2").text()).toBe("Resumen del año");
    expect(wrapper.text()).toContain("2026");
  });

  it("shortens long featured-disc titles to keep each month aligned", () => {
    const wrapper = mount(MonthlyActivityChart, {
      props: {
        year: 2026,
        activity: [month("2026-04", 2, disc({ name: "A Moon Shaped Pool" }))],
        annualActivityCount: 2,
      },
    });
    const april = wrapper.findAll("ol > li")[3]!;
    const title = april.get("h3");

    expect(title.classes()).toContain("truncate");
    expect(title.attributes("title")).toBe("A Moon Shaped Pool");
  });
});
