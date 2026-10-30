// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { describe, expect, it } from "vitest";
import type { TopRankedDisc } from "../../types/topDiscs";
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
    averageRate: Number,
    artistName: String,
    link: String,
  },
  emits: ["rating-saved"],
  render() {
    return h("article", { "data-testid": "disc-card" }, this.id);
  },
});

function makeDisc(index: number, overrides: Partial<TopRankedDisc> = {}): TopRankedDisc {
  return {
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
    weightedScore: 8.4,
    commentCount: 5,
    userFavoriteId: `favorite-${index + 1}`,
    pendingId: `pending-${index + 1}`,
    link: `https://music.test/${index + 1}`,
    ...overrides,
  };
}

function makeDiscs(count: number, overrides: Partial<TopRankedDisc> = {}): TopRankedDisc[] {
  return Array.from({ length: count }, (_, index) => ({
    ...makeDisc(index),
    ...overrides,
  }));
}

function mountRanking(discs: TopRankedDisc[]) {
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
        expect(featured.props("discs").map((disc: TopRankedDisc) => disc.id)).toEqual(
          makeDiscs(count)
            .slice(0, 3)
            .map((disc) => disc.id)
        );
      }
      if (count > 3) {
        const remaining = wrapper.findComponent(TopDiscsGrid);
        expect(remaining.props("discs").map((disc: TopRankedDisc) => disc.id)).toEqual(
          makeDiscs(count)
            .slice(3, 11)
            .map((disc) => disc.id)
        );
      }
      wrapper.unmount();
    }
  );

  it("shows every received disc in group order without a second display limit", () => {
    const wrapper = mountRanking(makeDiscs(20));
    const ids = wrapper.findAll('[data-testid="disc-card"]').map((card) => card.text());

    expect(ids).toEqual(makeDiscs(20).map((disc) => disc.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(
      wrapper.findAll(".featured-item").map((item) => item.find(".medal-chip").text())
    ).toEqual(["1º", "2º", "3º"]);
    expect(wrapper.text()).not.toMatch(/Puesto\s+\d+/);
    expect(wrapper.text()).not.toContain("Los tres mejor valorados");
    expect(wrapper.text()).not.toContain("Continúa la clasificación");
    wrapper.unmount();
  });

  it.each([
    { rated: 11, unrated: 0, expectedFeatured: 3, expectedSecondary: 8 },
    { rated: 8, unrated: 3, expectedFeatured: 3, expectedSecondary: 8 },
    { rated: 2, unrated: 5, expectedFeatured: 2, expectedSecondary: 5 },
    { rated: 0, unrated: 5, expectedFeatured: 0, expectedSecondary: 5 },
  ])(
    "keeps $rated voted discs in ranking order before $unrated unrated discs",
    ({ rated, unrated, expectedFeatured, expectedSecondary }) => {
      const voted = makeDiscs(rated);
      const pinned = Array.from({ length: unrated }, (_, index) =>
        makeDisc(rated + index, { voteCount: 0, averageRate: null, weightedScore: null })
      );
      const wrapper = mountRanking([...voted, ...pinned]);
      const featured = wrapper.findComponent(TopDiscsFeatured);
      const secondary = wrapper.findComponent(TopDiscsGrid);

      expect(wrapper.find('[data-testid="top-discs-featured-section"]').exists()).toBe(
        expectedFeatured > 0
      );
      if (expectedFeatured > 0) {
        expect(featured.props("discs").map((disc: TopRankedDisc) => disc.id)).toEqual(
          voted.slice(0, 3).map((disc) => disc.id)
        );
      }
      expect(secondary.props("discs").map((disc: TopRankedDisc) => disc.id)).toEqual([
        ...voted.slice(3).map((disc) => disc.id),
        ...pinned.map((disc) => disc.id),
      ]);
      expect(secondary.props("discs")).toHaveLength(expectedSecondary);
      expect(wrapper.findAll('[data-testid="disc-card"]')).toHaveLength(rated + unrated);
      expect(wrapper.find("[role=status]").exists()).toBe(rated + unrated === 0);
      expect(new Set(wrapper.findAll('[data-testid="disc-card"]').map((card) => card.text())).size)
        .toBe(rated + unrated);
      wrapper.unmount();
    }
  );

  it("preserves a voted zero and passes null averages through for dash formatting", () => {
    const wrapper = mountRanking([
      makeDisc(0, { averageRate: 0, voteCount: 1, weightedScore: 0 }),
      makeDisc(1, { averageRate: null, voteCount: 0, weightedScore: null }),
    ]);
    const cards = wrapper.findAllComponents(DiscCardStub);

    expect(cards[0].props()).toMatchObject({ averageRate: 0 });
    expect(cards[1].props()).toMatchObject({ averageRate: null });
    expect(wrapper.findComponent(TopDiscsFeatured).props("discs")).toHaveLength(1);
    expect(wrapper.findComponent(TopDiscsGrid).props("discs")).toHaveLength(1);
    wrapper.unmount();
  });

  it("includes a pinned disc with votes in the podium normally", () => {
    const pinnedVoted = makeDisc(0, { voteCount: 2, averageRate: 0, weightedScore: 1 });
    const wrapper = mountRanking([pinnedVoted, ...makeDiscs(2).map((disc) => ({ ...disc, id: `${disc.id}-other` }))]);

    expect(wrapper.findComponent(TopDiscsFeatured).props("discs").map((disc: TopRankedDisc) => disc.id))
      .toContain(pinnedVoted.id);
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
