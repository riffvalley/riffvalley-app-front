// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { describe, expect, it } from "vitest";
import type { Disc } from "@services/discs/discs";
import TopDiscsRanking from "./TopDiscsRanking.vue";
import TopDiscsFeatured from "./TopDiscsFeatured.vue";
import TopDiscsGrid from "./TopDiscsGrid.vue";

const DiscCardStub = defineComponent({
  props: {
    id: { type: String, required: true },
    favoriteId: String,
    pendingId: String,
    commentCount: Number,
    rateCount: Number,
    artistName: String,
    link: String,
  },
  emits: ["rating-saved"],
  render() {
    return h("article", { "data-testid": "disc-card" }, this.id);
  },
});

function makeDiscs(count: number): Disc[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `disc-${index + 1}`,
    name: `Disco ${index + 1}`,
    description: "",
    image: `cover-${index + 1}.jpg`,
    releaseDate: "2026-01-01",
    artist: { id: `artist-${index + 1}`, name: `Artista ${index + 1}`, description: "", image: "" },
    verified: true,
    averageRate: 10 - index / 10,
    averageCover: 8.5,
    voteCount: 7,
    commentCount: 5,
    userFavoriteId: `favorite-${index + 1}`,
    pendingId: `pending-${index + 1}`,
    link: `https://music.test/${index + 1}`,
  }));
}

function mountRanking(discs: Disc[]) {
  return mount(TopDiscsRanking, {
    props: { discs },
    global: { stubs: { DiscCard: DiscCardStub, "font-awesome-icon": true } },
  });
}

describe("TopDiscsRanking", () => {
  it.each([0, 1, 2, 3, 4, 8, 11])(
    "distributes %i available discs without empty sections",
    (count) => {
      const wrapper = mountRanking(makeDiscs(count));
      expect(wrapper.findAll('[data-testid="disc-card"]')).toHaveLength(count);
      expect(wrapper.findAll('[data-testid="top-discs-featured-section"]')).toHaveLength(
        count > 0 ? 1 : 0
      );
      expect(wrapper.findAll('[data-testid="top-discs-grid-section"]')).toHaveLength(
        count > 3 ? 1 : 0
      );
      expect(wrapper.find("[role=status]").exists()).toBe(count === 0);

      if (count > 0) {
        const featured = wrapper.findComponent(TopDiscsFeatured);
        expect(featured.props("discs").map((disc: Disc) => disc.id)).toEqual(
          makeDiscs(count)
            .slice(0, 3)
            .map((disc) => disc.id)
        );
      }
      if (count > 3) {
        const remaining = wrapper.findComponent(TopDiscsGrid);
        expect(remaining.props("discs").map((disc: Disc) => disc.id)).toEqual(
          makeDiscs(count)
            .slice(3, 11)
            .map((disc) => disc.id)
        );
      }
      wrapper.unmount();
    }
  );

  it("shows only the first 11 of a 20-disc ranking in the original order", () => {
    const wrapper = mountRanking(makeDiscs(20));
    const ids = wrapper.findAll('[data-testid="disc-card"]').map((card) => card.text());

    expect(ids).toEqual(makeDiscs(11).map((disc) => disc.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(
      wrapper.findAll(".featured-item").map((item) => item.find(".medal-chip").text())
    ).toEqual(["1º", "2º", "3º"]);
    expect(wrapper.text()).not.toMatch(/Puesto\s+\d+/);
    expect(wrapper.text()).not.toContain("Los tres mejor valorados");
    expect(wrapper.text()).not.toContain("Continúa la clasificación");
    wrapper.unmount();
  });

  it("preserves Community card inputs and forwards events from both blocks", () => {
    const wrapper = mountRanking(makeDiscs(4));
    const cards = wrapper.findAllComponents(DiscCardStub);
    expect(cards[0].props()).toMatchObject({
      id: "disc-1",
      favoriteId: "favorite-1",
      pendingId: "pending-1",
      commentCount: 5,
      rateCount: 7,
      artistName: "Artista 1",
      link: "https://music.test/1",
    });
    const firstEvent = {
      discId: "disc-1",
      action: "updated" as const,
      musicalRateChanged: true,
      hasMusicalRate: true,
      coverChanged: false,
    };
    const gridEvent = { ...firstEvent, discId: "disc-4" };
    cards[0].vm.$emit("rating-saved", firstEvent);
    cards[3].vm.$emit("rating-saved", gridEvent);

    expect(wrapper.emitted("rating-saved")).toEqual([[firstEvent], [gridEvent]]);
    wrapper.unmount();
  });
});
