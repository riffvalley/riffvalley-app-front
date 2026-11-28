// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { discCardDialogKey } from "@/composables/discCardDialog";
import ControversialDiscsList from "./ControversialDiscsList.vue";
import FeaturedDiscCard from "./FeaturedDiscCard.vue";
import type { StatisticsControversialDisc, StatisticsDisc } from "@/modules/statistics/types/statistics";

const disc: StatisticsDisc = {
  id: "album-42", name: "A New Dawn", image: "/fixtures/a-new-dawn.jpg", rate: 9.25,
  artist: { name: "The Example" }, genre: null,
};

const controversialDisc = (overrides: Partial<StatisticsControversialDisc>): StatisticsControversialDisc => ({
  id: "album-1", name: "Album 1", image: null, userRate: 8.5, communityAverage: 6.4,
  diff: 2.1, artist: null, genre: null, ...overrides,
});

describe("Statistics disc presentations", () => {
  it("renders the backend featured disc, current score, and nullable artist safely", () => {
    const wrapper = mount(FeaturedDiscCard, { props: { disc } });
    expect(wrapper.text()).toContain("A New Dawn");
    expect(wrapper.text()).toContain("The Example");
    expect(wrapper.text()).toContain("9,25/10");
    expect(wrapper.get("img").attributes("src")).toBe(disc.image);
    expect(wrapper.get("img").attributes("alt")).toBe("Portada de A New Dawn");
    expect(wrapper.find("a").exists()).toBe(false);

    const withoutCoverOrArtist = mount(FeaturedDiscCard, { props: { disc: { ...disc, image: null, artist: null } } });
    expect(withoutCoverOrArtist.text()).toContain("Artista no disponible");
    expect(withoutCoverOrArtist.text()).not.toContain("undefined");
    expect(withoutCoverOrArtist.find("img").exists()).toBe(false);
    expect(withoutCoverOrArtist.find(".fa-compact-disc").exists()).toBe(true);
  });

  it("titles the card as yours and opens the votable disc card from «Ver disco»", async () => {
    const open = vi.fn();
    const wrapper = mount(FeaturedDiscCard, {
      props: { disc },
      global: { provide: { [discCardDialogKey as symbol]: { isOpen: ref(false), open } } },
    });
    expect(wrapper.get("h2").text()).toContain("Tu disco destacado del año");

    const button = wrapper.get('[data-test="featured-disc-open"]');
    expect(button.attributes("aria-label")).toBe("Abrir tarjeta de A New Dawn");
    await button.trigger("click");
    expect(open).toHaveBeenCalledWith("album-42");

    // Sin el host de la ficha (por ejemplo, fuera del shell), no hay botón.
    expect(mount(FeaturedDiscCard, { props: { disc } }).find('[data-test="featured-disc-open"]').exists()).toBe(false);
  });

  it("shows a proper empty state when there is no featured disc", () => {
    const wrapper = mount(FeaturedDiscCard, { props: { disc: null } });
    expect(wrapper.get('[role="status"]').text()).toContain("No hay un disco destacado para este año");
  });

  it("preserves backend order and shows personal, community, signed positive and negative values", () => {
    const discs = [
      controversialDisc({ id: "first", name: "First", image: "/fixtures/first.jpg", userRate: 8.5, communityAverage: 6.4, diff: 2.1 }),
      controversialDisc({ id: "second", name: "A Much Longer Album Title That Must Remain Fully Visible", userRate: 4.1, communityAverage: 5.85, diff: -1.75, artist: { name: "Artist" } }),
      ...[3, 4, 5].map(id => controversialDisc({ id: String(id), name: `Album ${id}` })),
    ];
    const wrapper = mount(ControversialDiscsList, { props: { discs } });
    const rows = wrapper.findAll("ul > li");

    expect(rows).toHaveLength(5);
    expect(rows[0].text()).toContain("First");
    expect(rows[1].text()).toContain("A Much Longer Album Title That Must Remain Fully Visible");
    expect(rows[1].get("h3").classes()).toContain("break-words");
    expect(rows[1].get("h3").classes()).not.toContain("truncate");
    expect(rows[0].text()).toContain("8,50");
    expect(rows[0].text()).toContain("6,40");
    expect(rows[0].text()).toContain("+2,10");
    expect(rows[1].text()).toContain("−1,75");
    expect(rows[1].text()).toContain("Artist");
    expect(rows[0].text()).toContain("Artista no disponible");
    expect(rows[0].classes()).toContain("text-left");
    expect(rows[0].get("img").attributes("src")).toBe("/fixtures/first.jpg");
    expect(rows[0].get("img").attributes("alt")).toBe("Portada de First");
    expect(rows[0].element.querySelector("img")?.compareDocumentPosition(rows[0].get("h3").element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(rows[1].find("img").exists()).toBe(false);
    expect(rows[1].find(".fa-compact-disc").exists()).toBe(true);
    const scores = rows[0].findAll("dd");
    expect(scores[0]?.classes()).toContain("text-rv-navy");
    expect(scores[1]?.classes()).toContain("text-amber-700");
    expect(rows[0].classes()).toContain("justify-between");
    expect(rows[0].get("dl").classes()).toContain("sm:w-60");
    expect(rows[0].get("dl").classes()).toContain("grid-cols-[repeat(3,minmax(0,1fr))]");
    expect(rows[0].findAll("dt").every((label) => label.classes().includes("min-h-4"))).toBe(true);
    expect(scores.every((score) => score.classes().includes("min-h-5"))).toBe(true);
    expect(wrapper.text()).not.toContain("undefined");
  });

  it("titles the list «Discos controvertidos» and opens the disc card from each cover", async () => {
    const open = vi.fn();
    const discs = [controversialDisc({ id: "first", name: "First", image: "/fixtures/first.jpg" })];
    const wrapper = mount(ControversialDiscsList, {
      props: { discs },
      global: { provide: { [discCardDialogKey as symbol]: { isOpen: ref(false), open } } },
    });
    expect(wrapper.get("h2").text()).toBe("Discos controvertidos");

    const cover = wrapper.get('[data-test="controversial-disc-open"]');
    expect(cover.element.tagName).toBe("BUTTON");
    expect(cover.attributes("aria-label")).toBe("Abrir tarjeta de First");
    await cover.trigger("click");
    expect(open).toHaveBeenCalledWith("first");

    // Sin el host de la ficha, la portada no es un botón.
    expect(mount(ControversialDiscsList, { props: { discs } }).find('[data-test="controversial-disc-open"]').exists()).toBe(false);
  });

  it("explains why no controversial discs are available", () => {
    const wrapper = mount(ControversialDiscsList, { props: { discs: [] } });
    expect(wrapper.get('[role="status"]').text()).toContain("suficientes valoraciones ajenas");
  });
});
