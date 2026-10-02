// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { communityFavoriteState } from "../../../../src/modules/community/favorites/application/favoriteState";
import { communityRatingState } from "../../../../src/modules/community/ratings/application/ratingState";
import { useCommunityFavoriteState } from "../../../../src/modules/community/favorites/presentation/composables/useCommunityFavoriteState";
import { useCommunityRatingState } from "../../../../src/modules/community/ratings/presentation/composables/useCommunityRatingState";

describe("Community application state views", () => {
  beforeEach(() => {
    communityFavoriteState.clear();
    communityRatingState.clear();
  });

  it("projects application-owned ratings, votes, relation and mutation locks reactively", async () => {
    const Harness = defineComponent({
      setup() {
        const rating = useCommunityRatingState("user-1", "disc-1");
        const favorite = useCommunityFavoriteState("user-1", "disc-1");
        return () => h("div", [
          h("span", { "data-testid": "rating" }, String(rating.state.value.rate)),
          h("span", { "data-testid": "votes" }, String(rating.votes.value.length)),
          h("span", { "data-testid": "rating-lock" }, String(rating.isSubmitting.value)),
          h("span", { "data-testid": "favorite" }, String(favorite.state.value.favoriteId)),
          h("span", { "data-testid": "favorite-lock" }, String(favorite.isSubmitting.value)),
        ]);
      },
    });
    const wrapper = mount(Harness);

    communityRatingState.set("user-1", "disc-1", {
      ratingId: "rate-1", rate: 8, cover: null, averageRate: 8, averageCover: null,
      voteCount: 1, summaryLoaded: true,
    });
    communityRatingState.setVotes("user-1", "disc-1", [
      { id: "rate-1", user: { id: "user-1", username: "ana" }, rate: 8, cover: 0 },
    ]);
    communityRatingState.beginSubmit("user-1", "disc-1");
    communityFavoriteState.set("user-1", "disc-1", "favorite-1");
    communityFavoriteState.beginSubmit("user-1", "disc-1");
    await nextTick();

    expect(wrapper.get('[data-testid="rating"]').text()).toBe("8");
    expect(wrapper.get('[data-testid="votes"]').text()).toBe("1");
    expect(wrapper.get('[data-testid="rating-lock"]').text()).toBe("true");
    expect(wrapper.get('[data-testid="favorite"]').text()).toBe("favorite-1");
    expect(wrapper.get('[data-testid="favorite-lock"]').text()).toBe("true");

    communityRatingState.clear();
    communityFavoriteState.clear();
    await nextTick();

    expect(wrapper.get('[data-testid="rating"]').text()).toBe("null");
    expect(wrapper.get('[data-testid="votes"]').text()).toBe("0");
    expect(wrapper.get('[data-testid="rating-lock"]').text()).toBe("false");
    expect(wrapper.get('[data-testid="favorite"]').text()).toBe("null");
    expect(wrapper.get('[data-testid="favorite-lock"]').text()).toBe("false");

    wrapper.unmount();
  });
});
