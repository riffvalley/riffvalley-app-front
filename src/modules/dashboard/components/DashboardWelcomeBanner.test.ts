// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import type { DashboardSummary } from "@/app/dashboardSummary";
import DashboardWelcomeBanner from "./DashboardWelcomeBanner.vue";

const summary: DashboardSummary = {
  personal: {
    totalRatedDiscs: 8316,
    totalExploredGenres: 18,
    totalActiveDays: 312,
    currentStreak: 5,
    year: { ratedDiscs: 42, exploredGenres: 9, activeDays: 70 },
    month: { ratedDiscs: 8, exploredGenres: 4, activeDays: 12 },
  },
  catalog: { totalDiscs: 2487, discsThisYear: 126, discsThisMonth: 14 },
};

function mountBanner(overrides: Record<string, unknown> = {}) {
  return mount(DashboardWelcomeBanner, {
    props: {
      username: "Mara",
      todayFormatted: "lunes, 26 de octubre de 2026",
      hasSession: true,
      summary,
      loading: false,
      error: false,
      ...overrides,
    },
  });
}

describe("DashboardWelcomeBanner", () => {
  it("shows the personalized header and four compact period/streak blocks", () => {
    const wrapper = mountBanner();

    expect(wrapper.text()).toContain("Hola, Mara");
    expect(wrapper.text()).toContain("lunes, 26 de octubre de 2026");
    expect(wrapper.findAll('[data-test^="banner-period-"]')).toHaveLength(3);
    expect(wrapper.get('[data-test="banner-streak"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("Este mes");
    expect(wrapper.text()).toContain("Este año");
    expect(wrapper.text()).toContain("Histórico");
    expect(wrapper.get('[data-test="banner-stats"] .grid').classes()).toContain("xl:grid-cols-4");
    expect(wrapper.get('[data-test="banner-stats"] .grid').classes()).toContain("min-[390px]:grid-cols-2");
  });

  it("maps monthly, yearly, historical, and catalog release counts to their periods", () => {
    const wrapper = mountBanner();

    expect(wrapper.get('[data-test="banner-period-month"]').text()).toContain("8discos votados");
    expect(wrapper.get('[data-test="banner-period-month"]').text()).toContain("4 géneros");
    expect(wrapper.get('[data-test="banner-period-month"]').text()).toContain("12 días");
    expect(wrapper.get('[data-test="banner-period-month"]').text()).toContain("14 discos");
    expect(wrapper.get('[data-test="banner-period-year"]').text()).toContain("42discos votados");
    expect(wrapper.get('[data-test="banner-period-year"]').text()).toContain("9 géneros");
    expect(wrapper.get('[data-test="banner-period-year"]').text()).toContain("70 días");
    expect(wrapper.get('[data-test="banner-period-year"]').text()).toContain("126 discos");
    expect(wrapper.get('[data-test="banner-period-history"]').text()).toContain("8.316discos votados");
    expect(wrapper.get('[data-test="banner-period-history"]').text()).toContain("18 géneros");
    expect(wrapper.get('[data-test="banner-period-history"]').text()).toContain("312 días");
    expect(wrapper.get('[data-test="banner-period-history"]').text()).toContain("2.487 discos");
    expect(wrapper.get('[data-test="banner-period-month"] [title]').attributes("title"))
      .toContain("fecha de lanzamiento");
    expect(wrapper.get('[data-test="banner-period-history"] [title]').attributes("title"))
      .toBe("Catálogo completo");
  });

  it.each([
    [0, "¡Vota un disco y empieza tu racha!", "0 días"],
    [1, "¡Has empezado una racha!", "1 día"],
    [5, "¡Llevas 5 días en racha!", "5 días"],
    [null, "Racha no disponible", "—"],
  ] as const)("presents streak %s independently from active days", (streak, message, count) => {
    const wrapper = mountBanner({
      summary: { ...summary, personal: { ...summary.personal, currentStreak: streak } },
    });

    expect(wrapper.get('[data-test="banner-streak"]').text()).toContain(message);
    expect(wrapper.get('[data-test="banner-streak"]').text()).toContain(count);
    expect(wrapper.get('[data-test="banner-period-month"]').text()).toContain("12 días");
  });

  it("formats zero as a measured value and null as an em dash", () => {
    const wrapper = mountBanner({
      summary: {
        ...summary,
        personal: {
          ...summary.personal,
          totalRatedDiscs: 0,
          year: { ratedDiscs: 0, exploredGenres: null, activeDays: 0 },
          month: { ratedDiscs: null, exploredGenres: 0, activeDays: null },
        },
        catalog: { totalDiscs: 0, discsThisYear: 0, discsThisMonth: 0 },
      },
    });

    expect(wrapper.get('[data-test="banner-period-month"]').text()).toContain("—discos votados");
    expect(wrapper.get('[data-test="banner-period-month"]').text()).toContain("0 géneros");
    expect(wrapper.get('[data-test="banner-period-month"]').text()).toContain("0 discos");
    expect(wrapper.get('[data-test="banner-period-year"]').text()).toContain("0discos votados");
    expect(wrapper.get('[data-test="banner-period-year"]').text()).toContain("Géneros explorados—Días activos");
  });

  it("uses singular labels for one voted disc, genre, active day, and catalog release", () => {
    const wrapper = mountBanner({
      summary: {
        ...summary,
        personal: {
          ...summary.personal,
          month: { ratedDiscs: 1, exploredGenres: 1, activeDays: 1 },
        },
        catalog: { ...summary.catalog, discsThisMonth: 1 },
      },
    });

    const month = wrapper.get('[data-test="banner-period-month"]').text();
    expect(month).toContain("1disco votado");
    expect(month).toContain("1 género");
    expect(month).toContain("1 día");
    expect(month).toContain("1 disco");
  });

  it("keeps the layout stable while loading and reports a retryable error", async () => {
    const loading = mountBanner({ summary: undefined, loading: true });
    expect(loading.findAll('[data-test^="banner-period-"]')).toHaveLength(3);
    expect(loading.get('[data-test="banner-period-month"]').text()).toContain("…");
    loading.unmount();

    const wrapper = mountBanner({ summary: undefined, error: true });
    expect(wrapper.get('[data-test="banner-stats"] .grid').exists()).toBe(true);
    expect(wrapper.get('[role="status"]').text()).toContain("No se pudieron cargar");
    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("retry")).toHaveLength(1);
  });

  it("does not render private metrics without a session", () => {
    const wrapper = mountBanner({ hasSession: false });
    expect(wrapper.find('[data-test="banner-stats"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain("8.316");
  });
});
