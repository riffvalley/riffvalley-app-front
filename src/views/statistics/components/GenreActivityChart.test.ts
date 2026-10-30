// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import type { StatisticsDisc, StatisticsGenreActivity } from "@/modules/statistics/types/statistics";
import GenreActivityChart from "./GenreActivityChart.vue";

const featuredDisc: StatisticsDisc = {
  id: "featured", name: "Blue Weekend", image: "https://example.test/blue.jpg", rate: 9.25,
  artist: { name: "Wolf Alice" }, genre: null,
};

const genre = (name: string, activityCount: number, topDisc: StatisticsDisc | null = null): StatisticsGenreActivity => ({ genre: name, activityCount, topDisc });

describe("GenreActivityChart", () => {
  it("shows only seven genres ranked by assignment count with alphabetical tie breaks", () => {
    const activity = [
      genre("Zulu", 14), genre("Rock", 13, featuredDisc), genre("Ambient", 13), genre("Metal", 12),
      genre("Jazz", 11), genre("Pop", 10), genre("Soul", 9), genre("Folk", 8), genre("Excluded", 7),
    ];
    const wrapper = mount(GenreActivityChart, { props: { year: 2026, activity, activityWithoutGenre: 5, annualActivityCount: 100 } });
    const rows = wrapper.findAll("ol > li");

    expect(rows).toHaveLength(7);
    expect(rows.map((row) => row.find("h3").text())).toEqual(["Zulu", "Ambient", "Rock", "Metal", "Jazz", "Pop", "Soul"]);
    expect(wrapper.get("h2").text()).toBe("Géneros representativos");
    expect(wrapper.get("ol").attributes("aria-label")).toBe("Géneros con más votos");
    expect(wrapper.text()).not.toContain("Excluded");
    expect(wrapper.text()).toContain("Sin género");
    expect(wrapper.text()).toContain("5 votos");
    expect(rows[2]?.text()).toContain("13 %");
    expect(rows[2]?.text()).toContain("Blue Weekend");
    expect(rows[2]?.text()).toContain("Wolf Alice");
    expect(rows[2]?.text()).toContain("9,25/10");
    expect(rows[2]?.find("img").attributes("src")).toBe("https://example.test/blue.jpg");
    expect(rows[0]?.get('[role="img"]').attributes("aria-label")).toContain("14 votos, 14 % de la actividad anual");
    expect(rows[0]?.get('[role="img"] span[aria-hidden="true"]').attributes("style")).toBe("width: 100%;");
    expect(rows[2]?.get('[role="img"] span[aria-hidden="true"]').attributes("style")).toContain("width: 92.85714285714286%");
    const rockColumns = rows[2]?.element.querySelector("article")?.children;
    expect(rockColumns?.[0]?.tagName).toBe("H3");
    expect(rockColumns?.[1]?.querySelector('[role="img"]')).not.toBeNull();
    expect(rockColumns?.[2]?.querySelector("img")).not.toBeNull();
  });

  it("preserves featured rows with missing covers and null artist, and keeps null highlights genre-specific", () => {
    const wrapper = mount(GenreActivityChart, {
      props: {
        year: 2026,
        activity: [genre("Ambient", 4, { ...featuredDisc, image: null, artist: null }), genre("Rock", 3, null)],
        activityWithoutGenre: 0,
        annualActivityCount: 7,
      },
    });
    const rows = wrapper.findAll("ol > li");

    expect(rows[0]?.text()).toContain("Portada no disponible");
    expect(rows[0]?.text()).toContain("Artista no disponible");
    expect(rows[1]?.text()).toContain("Sin disco destacado disponible");
    expect(rows[1]?.find("img").exists()).toBe(false);
  });

  it("keeps no-genre activity outside the genre limit and represents a year without activity", () => {
    const wrapper = mount(GenreActivityChart, { props: { year: 2025, activity: [], activityWithoutGenre: 0, annualActivityCount: 0 } });
    expect(wrapper.findAll("ol > li")).toHaveLength(0);
    expect(wrapper.text()).toContain("No hay actividad asociada a géneros en 2025.");
    expect(wrapper.text()).not.toContain("Sin género");
    expect(wrapper.text()).not.toContain("0 votos");
  });

  it("does not mistake a genre named Sin género for the separate unassigned counter", () => {
    const wrapper = mount(GenreActivityChart, {
      props: { year: 2026, activity: [genre("Sin género", 2)], activityWithoutGenre: 1, annualActivityCount: 3 },
    });
    expect(wrapper.findAll("ol > li")).toHaveLength(1);
    expect(wrapper.get("ol h3").text()).toBe("Sin género");
    expect(wrapper.text()).toContain("1 voto");
  });

  it("emits the galaxy request from the button below the genre rows", async () => {
    const wrapper = mount(GenreActivityChart, {
      props: { year: 2026, activity: [genre("Rock", 3)], activityWithoutGenre: 0, annualActivityCount: 3 },
    });
    const button = wrapper.get('button[aria-haspopup="dialog"]');

    expect(button.text()).toBe("Abrir galaxia de géneros");
    expect(button.element.compareDocumentPosition(wrapper.get("ol").element) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    await button.trigger("click");
    expect(wrapper.emitted("openGalaxy")).toHaveLength(1);
  });
});
